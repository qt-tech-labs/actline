import "server-only";

import { FALLBACK_PARAMS, normalizeBlueprint } from "@/lib/blueprint";
import type { Blueprint, BlueprintDevice, BlueprintNode, BlueprintRisk, BlueprintSupply } from "@/lib/types";
import type { Architect, ArchitectCall, ArchitectResult } from "./architect";
import { PLAN_CRAFT, type PlanCraftConstraints, type PlanCraftContext, type PlanCraftEnvelope } from "./skills";
import { PLAN_CRAFT_ARG_SCHEMAS, type PlanCraftToolName } from "./skills/plan-craft/tools";
import { validateProposedConstraints, type PlanCraftResult } from "./skills/plan-craft/validate";

/** The plan while it is being assembled. */
type Draft = {
  nodes: BlueprintNode[];
  supplies: BlueprintSupply[];
  risks: BlueprintRisk[];
  devices: BlueprintDevice[];
  meta: {
    name: string;
    summary: string;
    icon: string;
    tags: Blueprint["tags"];
    iotSuggested: boolean;
    goldenStart: string | null;
    goldenEnd: string | null;
  } | null;
};

export type CraftResult = {
  blueprint: Blueprint;
  /** The values the plan was actually built with. */
  constraints: PlanCraftConstraints;
  /** What the server had to repair after the model proposed it. */
  repairs: string[];
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`The model took longer than ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * The knobs depend on the topic, so the model proposes them first. Whatever
 * the user set by hand always wins; the rest is filled in by the model.
 */
async function proposeConstraints(
  envelope: PlanCraftEnvelope,
  architect: Architect,
): Promise<PlanCraftConstraints> {
  let proposed: { totalDays: number; dailyMinutes: number; budgetVnd: number; experience: "beginner" | "basic" | "pro" } | null = null;

  const missing =
    envelope.totalDays === null ||
    envelope.dailyMinutes === null ||
    envelope.budgetVnd === null ||
    envelope.experience === null;

  if (missing) {
    try {
      const turn = await withTimeout(
        architect.run({
          system: PLAN_CRAFT.constraintsPrompt(envelope),
          user: PLAN_CRAFT.constraintsUserPrompt(envelope),
          tools: [PLAN_CRAFT.constraintsTool],
        }),
        architect.timeoutMs,
      );
      const call = turn.calls.find((candidate) => candidate.name === "propose_constraints");
      if (call && !call.malformed) {
        const outcome = validateProposedConstraints(call.arguments);
        if (outcome.ok) proposed = outcome.value;
      }
    } catch {
      proposed = null;
    }
  }

  return {
    totalDays: envelope.totalDays ?? proposed?.totalDays ?? FALLBACK_PARAMS.totalDays,
    dailyMinutes: envelope.dailyMinutes ?? proposed?.dailyMinutes ?? FALLBACK_PARAMS.dailyMinutes,
    budgetVnd: envelope.budgetVnd ?? proposed?.budgetVnd ?? FALLBACK_PARAMS.budgetVnd,
    experience: envelope.experience ?? proposed?.experience ?? FALLBACK_PARAMS.experience,
  };
}

function applyResult(draft: Draft, result: PlanCraftResult): void {
  switch (result.tool) {
    case "create_node":
      draft.nodes.push(result.node);
      break;
    case "add_supply": {
      const existing = draft.supplies.findIndex((supply) => supply.name === result.supply.name);
      if (existing >= 0) draft.supplies[existing] = result.supply;
      else draft.supplies.push(result.supply);
      break;
    }
    case "add_risk":
      draft.risks.push(result.risk);
      break;
    case "add_device":
      draft.devices.push(result.device);
      break;
    case "finalize_plan":
      draft.meta = result.meta;
      break;
  }
}

/**
 * Runs one tool call: the model gets the answer, and the plan grows when the
 * call is usable.
 */
function runCall(call: ArchitectCall, draft: Draft, context: PlanCraftContext, repairs: string[]): ArchitectResult {
  const name = call.name as PlanCraftToolName;
  if (!(name in PLAN_CRAFT_ARG_SCHEMAS)) {
    return {
      callId: call.id,
      name: call.name,
      content: `Không có tool tên "${call.name}". Chỉ dùng: ${Object.keys(PLAN_CRAFT_ARG_SCHEMAS).join(", ")}.`,
      isError: true,
    };
  }

  if (call.malformed) {
    return {
      callId: call.id,
      name: call.name,
      content: `Lỗi: arguments của tool "${call.name}" không phải JSON hợp lệ. Gọi lại tool này với JSON đúng cú pháp.`,
      isError: true,
    };
  }

  const outcome = PLAN_CRAFT.validate(name, call.arguments, context);
  if (!outcome.ok) {
    return {
      callId: call.id,
      name: call.name,
      content: `Lỗi: ${outcome.error}. Gọi lại tool này với đối số đã sửa.`,
      isError: true,
    };
  }

  applyResult(draft, outcome.result);
  repairs.push(...outcome.repairs);
  return { callId: call.id, name: call.name, content: "Đã áp dụng.", isError: false };
}

function buildBlueprint(
  draft: Draft,
  envelope: PlanCraftEnvelope,
  constraints: PlanCraftConstraints,
  architect: Architect,
): Blueprint {
  const meta = draft.meta ?? {
    name: "Kế hoạch hành động",
    summary: `Kế hoạch ${constraints.totalDays} ngày dựng từ ý tưởng: "${envelope.prompt.slice(0, 160)}"`,
    icon: "psychiatry",
    tags: [],
    iotSuggested: false,
    goldenStart: null,
    goldenEnd: null,
  };

  return normalizeBlueprint({
    version: "v2.1.0",
    name: meta.name,
    summary: meta.summary,
    icon: meta.icon,
    goldenStart: meta.goldenStart,
    goldenEnd: meta.goldenEnd,
    tags: meta.tags,
    totalDays: constraints.totalDays,
    nodeCount: draft.nodes.length,
    totalPackageVnd: 0,
    estimatedTotalVnd: 0,
    budgetDeltaVnd: 0,
    budgetVnd: constraints.budgetVnd,
    rhythmLabel: "",
    dailyMinutes: constraints.dailyMinutes,
    nodes: draft.nodes,
    devices: draft.devices,
    supplies: draft.supplies,
    suppliesSubtotalVnd: 0,
    contingencyVnd: 0,
    risks: draft.risks,
    checkpointCount: 0,
    iotSuggested: meta.iotSuggested,
    engine: "ai",
    model: architect.model,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * Crafts a plan with the model.
 *
 * The knobs come first (the model proposes the ones the user left open), then
 * one planning turn: the model calls the plan-craft tools in parallel and the
 * server executes them. When a call is unusable the model gets the error back
 * and may re-emit it — one extra turn, and only when it is needed.
 *
 * The architect is the only thing that knows which model is answering.
 */
export async function craftPlan(envelope: PlanCraftEnvelope, architect: Architect): Promise<CraftResult> {
  const constraints = await proposeConstraints(envelope, architect);
  const context: PlanCraftContext = {
    totalDays: constraints.totalDays,
    dailyMinutes: constraints.dailyMinutes,
    budgetVnd: constraints.budgetVnd,
  };
  const draft: Draft = { nodes: [], supplies: [], risks: [], devices: [], meta: null };
  const repairs: string[] = [];

  const first = await withTimeout(
    architect.run({
      system: PLAN_CRAFT.systemPrompt(constraints),
      user: PLAN_CRAFT.userPrompt(envelope.prompt, constraints),
      tools: PLAN_CRAFT.tools,
    }),
    architect.timeoutMs,
  );

  const calls = first.calls;
  if (calls.length === 0) throw new Error("The model did not use the plan tools");

  const results = calls.map((call) => runCall(call, draft, context, repairs));

  // Only a rejected call is worth another turn.
  if (results.some((result) => result.isError)) {
    const second = await withTimeout(
      architect.run({
        system: PLAN_CRAFT.systemPrompt(constraints),
        user: PLAN_CRAFT.userPrompt(envelope.prompt, constraints),
        tools: PLAN_CRAFT.tools,
        calls,
        results,
        handle: first.handle ?? null,
      }),
      architect.timeoutMs,
    );
    for (const call of second.calls) {
      runCall(call, draft, context, repairs);
    }
  }

  return { blueprint: buildBlueprint(draft, envelope, constraints, architect), constraints, repairs };
}
