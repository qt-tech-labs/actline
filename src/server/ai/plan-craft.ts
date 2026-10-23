import "server-only";

import { normalizeBlueprint } from "@/lib/blueprint";
import type { Blueprint } from "@/lib/types";
import type { Architect } from "./architect";
import { PLAN_CRAFT, type PlanCraftEnvelope } from "./skills";
import type { PlanCraftReport } from "./skills/plan-craft/validate";

export type CraftResult = {
  blueprint: Blueprint;
  /** The values the plan was actually built with. */
  constraints: PlanCraftReport["constraints"];
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

function mergeRepairs(into: PlanCraftReport, extra: PlanCraftReport): PlanCraftReport {
  const seen = new Set(into.repairs);
  return {
    ...into,
    repairs: [...into.repairs, ...extra.repairs.filter((repair) => { if (seen.has(repair)) return false; seen.add(repair); return true; })],
  };
}

function buildBlueprint(
  report: PlanCraftReport,
  envelope: PlanCraftEnvelope,
  architect: Architect,
): Blueprint {
  const { constraints, plan } = report;
  const meta = plan.meta ?? {
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
    nodeCount: plan.nodes.length,
    totalPackageVnd: 0,
    estimatedTotalVnd: 0,
    budgetDeltaVnd: 0,
    budgetVnd: constraints.budgetVnd,
    rhythmLabel: "",
    dailyMinutes: constraints.dailyMinutes,
    nodes: plan.nodes,
    devices: plan.devices,
    supplies: plan.supplies,
    suppliesSubtotalVnd: 0,
    contingencyVnd: 0,
    risks: plan.risks,
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
 * One turn: the model answers with a full JSON document — the knobs it
 * proposes (whatever the user left open) alongside the whole plan, so the
 * plan is self-consistent with the limits it invented. The server validates
 * every piece and repairs what it can; whatever it cannot repair becomes a
 * problem list, and only then does the model get one correction turn to
 * re-emit the whole document. A retry replaces the first document only when
 * it is at least as complete.
 *
 * The architect is the only thing that knows which model is answering.
 */
export async function craftPlan(envelope: PlanCraftEnvelope, architect: Architect): Promise<CraftResult> {
  const system = PLAN_CRAFT.systemPrompt(envelope);
  const user = PLAN_CRAFT.userPrompt(envelope);

  const first = await withTimeout(architect.run({ system, user }), architect.timeoutMs);
  let report = PLAN_CRAFT.validate(first.json ?? null, envelope);
  if (first.json === null && first.parseError) {
    // The document itself is the problem (cut off, no braces); tell the model
    // exactly that instead of the validator's generic complaint.
    report = { ...report, problems: [first.parseError] };
  }

  // Only a document with problems is worth another turn.
  if (report.problems.length > 0) {
    const second = await withTimeout(
      architect.run({
        system,
        user,
        followUp: { text: first.text, message: PLAN_CRAFT.repairPrompt(report.problems), problems: report.problems },
        handle: first.handle ?? null,
      }),
      architect.timeoutMs,
    );
    if (second.json !== null) {
      const retry = PLAN_CRAFT.validate(second.json, envelope);
      // A retry is only adopted when it is at least as complete: more nodes,
      // or the same nodes with fewer unusable pieces.
      const better =
        retry.plan.nodes.length > report.plan.nodes.length ||
        (retry.plan.nodes.length === report.plan.nodes.length && retry.problems.length < report.problems.length);
      if (better) report = mergeRepairs(retry, report);
      else report = mergeRepairs(report, retry);
    }
  }

  if (report.plan.nodes.length === 0) {
    throw new Error("The model did not return a usable plan");
  }

  return { blueprint: buildBlueprint(report, envelope, architect), constraints: report.constraints, repairs: report.repairs };
}
