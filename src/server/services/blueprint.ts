import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { cache } from "react";
import { dayRangeLabel, mockPlanSchema, normalizeBlueprint, phaseRanges, resolveParams } from "@/lib/blueprint";
import { isoDateInTz } from "@/lib/day";
import type { BlueprintOp } from "@/lib/plan-ops";
import { applyBlueprintOps } from "@/lib/plan-ops";
import type {
  Blueprint,
  BlueprintCheckpoint,
  BlueprintConstraints,
  BlueprintDevice,
  BlueprintInput,
  BlueprintItem,
  BlueprintNode,
  BlueprintProvider,
  BlueprintSupply,
} from "@/lib/types";
import { AiUnavailableError, NotFoundError } from "../auth";
import { architectFor, planEngines } from "../ai/architects";
import { craftPlan } from "../ai/plan-craft";
import { debugEnabled, finishDebugRun, recordTurns, startDebugRun } from "../debug";
import { BLUEPRINT_TEMPLATES, FALLBACK_TEMPLATE, type BlueprintTemplate, type TemplateSupply } from "../blueprint-templates";
import { readBlueprintId } from "../blueprint-cookie";
import { db } from "../db";
import {
  aiInsights,
  blueprints,
  dayPlans,
  devices,
  hubs,
  milestones,
  projects,
  projectStages,
  stepItems,
  steps,
  supplies,
} from "../db/schema";

const SUPPLY_ICONS = ["shopping_basket", "inventory_2", "science", "settings_input_component", "sanitizer", "handyman"];

const roundTo1000 = (n: number) => Math.round(n / 1000) * 1000;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const newItemId = () => `it_${crypto.randomUUID()}`;

/* ------------------------------------------------------------------ *
 * Template engine (the fallback plan)
 *
 * The AI crafts the plan; when it is unavailable this engine produces a
 * valid plan from the template library instead, in the same node/item
 * shape, so the rest of the app never has to care which one it got.
 * ------------------------------------------------------------------ */

/** Best matching template for a free-text prompt; the generic plan when nothing matches. */
function pickTemplate(prompt: string): BlueprintTemplate {
  const text = prompt.toLowerCase();
  let best: BlueprintTemplate = FALLBACK_TEMPLATE;
  let bestScore = 0;
  for (const template of BLUEPRINT_TEMPLATES) {
    const score = template.keywords.reduce((hits, keyword) => (text.includes(keyword) ? hits + 1 : hits), 0);
    if (score > bestScore) {
      best = template;
      bestScore = score;
    }
  }
  return best;
}

function scaleSupplies(base: TemplateSupply[], totalDays: number, budgetVnd: number) {
  const natural = base.reduce((sum, item) => sum + item.priceVnd, 0);
  const naturalTotal = natural + roundTo1000(natural * 0.356);
  // The plan never costs more than the budget: material prices scale down to fit.
  const factor = naturalTotal > budgetVnd ? (budgetVnd * 0.95) / naturalTotal : 1;
  const dayFactor = totalDays / 45;

  const items: BlueprintSupply[] = base.map((item) => {
    const buyByDay = clamp(Math.round(item.buyByDay * dayFactor), 1, totalDays);
    return {
      name: item.name,
      spec: item.spec,
      priceVnd: roundTo1000(item.priceVnd * factor),
      buyByDay,
      urgency: buyByDay <= 3 ? "now" : buyByDay <= 10 ? "soon" : "later",
      priceSource: "ai_estimate",
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.priceVnd, 0);
  const contingency = roundTo1000(subtotal * 0.356);
  return { items, subtotal, contingency, total: subtotal + contingency };
}

/** The detailed day-one steps of a template, scaled to the user's daily time. */
function scaleDayOne(template: BlueprintTemplate, dailyMinutes: number, experience: string): BlueprintItem[] {
  const factor = clamp(dailyMinutes / 45, 0.4, 1.6);
  return template.steps.map((step) => {
    const checklist =
      experience === "pro"
        ? step.microSteps.slice(0, 1)
        : experience === "beginner"
          ? [...step.microSteps, "Kiểm tra lại kết quả trước khi chuyển sang bước tiếp theo."]
          : step.microSteps;
    return {
      id: newItemId(),
      day: 1,
      title: step.title,
      description: step.description,
      minutes: Math.max(5, Math.round(step.minutes * factor)),
      rationale: step.rationale,
      checklist,
      requiresPhoto: step.requiresPhoto,
      photoTitle: step.photoTitle,
      photoHint: step.photoHint,
    };
  });
}

/** Spreads work items over the days of a node; a day may end up without one. */
function spreadItems(labels: string[], startDay: number, endDay: number, minutes: number): BlueprintItem[] {
  const days = Math.max(1, endDay - startDay + 1);
  return labels.map((label, index) => ({
    id: newItemId(),
    day: startDay + Math.min(index, days - 1),
    title: label,
    description: "",
    minutes,
    rationale: null,
    checklist: [],
    requiresPhoto: false,
    photoTitle: null,
    photoHint: null,
  }));
}

/** Checkpoints spread evenly over a node. */
function spreadCheckpoints(count: number, startDay: number, endDay: number, label: string): BlueprintCheckpoint[] {
  const checkpoints: BlueprintCheckpoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const ratio = count === 1 ? 1 : index / (count - 1);
    const day = Math.min(endDay, Math.max(startDay, Math.round(startDay + ratio * (endDay - startDay))));
    checkpoints.push({ day, label });
  }
  return checkpoints;
}

/**
 * Turns a free-text idea plus the user's knobs into a complete plan from the
 * template library. Deterministic: the same input always yields the same plan.
 */
export const generateTemplateBlueprint = cache((input: BlueprintInput): Blueprint => {
  const template = pickTemplate(input.prompt);
  const { totalDays, dailyMinutes, budgetVnd, experience } = resolveParams(input);
  const ranges = phaseRanges(totalDays);
  const dayOne = scaleDayOne(template, dailyMinutes, experience);
  const spreadMinutes = clamp(Math.round(dailyMinutes / 3), 10, 45);

  const nodes: BlueprintNode[] = [];
  ranges.forEach((range, index) => {
    const phase = template.phases[index];
    if (!phase) return;
    const items: BlueprintItem[] = [];
    if (index === 0) {
      // Day one carries the detailed steps; the rest of the phase is spread out.
      items.push(...dayOne);
      items.push(...spreadItems(phase.tasks, range.startDay + 1, range.endDay, spreadMinutes));
    } else {
      items.push(...spreadItems(phase.tasks, range.startDay, range.endDay, spreadMinutes));
    }
    const milestoneCount = Math.max(2, Math.round((template.milestoneCounts[index] ?? 3) * (totalDays / 45)));
    nodes.push({
      index: index + 1,
      title: phase.title,
      objective: phase.summary,
      startDay: range.startDay,
      endDay: range.endDay,
      rangeLabel: dayRangeLabel(range.startDay, range.endDay),
      items,
      checkpoints: spreadCheckpoints(milestoneCount, range.startDay, range.endDay, `Kiểm tra ${phase.title.toLowerCase()}`),
      successCriteria: null,
      tone: index === ranges.length - 1 ? "secondary" : "primary",
    });
  });

  const { items: supplyItems, subtotal, contingency, total } = scaleSupplies(template.supplies, totalDays, budgetVnd);
  const devices: BlueprintDevice[] = template.devices.map((device) => ({ ...device }));
  const summary =
    template === FALLBACK_TEMPLATE
      ? `Kế hoạch bám sát mục tiêu đã mô tả: "${input.prompt.slice(0, 160)}${input.prompt.length > 160 ? "…" : ""}" — ${nodes.length} giai đoạn, ${totalDays} ngày, mỗi ngày đều có việc cụ thể và điểm kiểm tra.`
      : template.summary;

  return normalizeBlueprint({
    version: "v2.0.0",
    name: template.name,
    summary,
    icon: template.icon,
    goldenStart: template.goldenStart,
    goldenEnd: template.goldenEnd,
    tags: template.tags,
    totalDays,
    nodeCount: nodes.length,
    totalPackageVnd: total,
    estimatedTotalVnd: total,
    budgetDeltaVnd: budgetVnd - total,
    budgetVnd,
    rhythmLabel: "",
    dailyMinutes,
    nodes,
    devices,
    supplies: supplyItems,
    suppliesSubtotalVnd: subtotal,
    contingencyVnd: contingency,
    risks: template.risks,
    checkpointCount: 0,
    iotSuggested: template.iotSuggested,
    engine: "template",
    model: null,
    generatedAt: new Date().toISOString(),
  });
});

/** The engine's IoT advice; the user can always overrule it (FR-9.2). */
export function resolveIotEnabled(input: BlueprintInput, blueprint: Blueprint): boolean {
  return input.iotEnabled ?? blueprint.iotSuggested;
}

/**
 * The plan for an idea.
 *
 * The model crafts it; when it is unavailable (no key, timeout, unusable
 * answer) the template engine covers for it. Either way the plan has the
 * same shape, so the rest of the app never has to care.
 *
 * The engines are tried in the order `AI_PLAN_ENGINE` lists them, so a dev
 * machine can run the local model first and fall back to the hosted one.
 *
 * When the caller names a `provider` there is no fallback: if that model
 * cannot build the plan the call fails, so the user decides what to try next.
 */
export async function generateBlueprint(
  input: BlueprintInput,
  provider?: BlueprintProvider,
): Promise<{ blueprint: Blueprint; constraints: BlueprintConstraints }> {
  for (const engine of provider ? [provider] : planEngines()) {
    if (engine === "template") continue;
    const architect = architectFor(engine);
    if (!architect) {
      if (provider) throw new AiUnavailableError(`${provider} is not configured`);
      continue;
    }
    const run = startDebugRun(architect, input.prompt);
    try {
      const { blueprint, constraints, repairs } = await craftPlan(
        {
          prompt: input.prompt,
          totalDays: input.totalDays,
          dailyMinutes: input.dailyMinutes,
          budgetVnd: input.budgetVnd,
          experience: input.experience,
        },
        recordTurns(architect, run),
      );
      finishDebugRun(run, { repairs });
      return { blueprint, constraints };
    } catch (error) {
      finishDebugRun(run, { error });
      console.error(`plan-craft failed on the "${engine}" engine${provider ? "" : ", trying the next one"}`, error);
      if (provider) {
        throw new AiUnavailableError(error instanceof Error ? error.message : `${provider} failed`);
      }
    }
  }
  return { blueprint: generateTemplateBlueprint(input), constraints: resolveParams(input) };
}

/** Debug only: the plan the caller supplied, normalised like a model's plan, without asking any model. */
export function mockBlueprint(input: BlueprintInput, mock: Record<string, unknown>) {
  if (!debugEnabled()) throw new AiUnavailableError("Mocked plans are only available in debug mode");
  const parsed = mockPlanSchema.parse(mock) as unknown as Blueprint;
  const blueprint = normalizeBlueprint({ ...parsed, engine: "ai", model: parsed.model ?? "mock" });
  return { blueprint, constraints: resolveParams({ ...input, totalDays: blueprint.totalDays, dailyMinutes: blueprint.dailyMinutes, budgetVnd: blueprint.budgetVnd }) };
}

/* ------------------------------------------------------------------ *
 * Drafts
 *
 * The plan on screen is a stored draft: the AI plan is not reproducible
 * from the input, and the user edits it by hand before starting.
 * ------------------------------------------------------------------ */

/** Stores a plan as the user's current draft. */
export async function saveBlueprint(
  userId: string,
  input: BlueprintInput,
  blueprint: Blueprint,
  constraints: BlueprintConstraints,
): Promise<string> {
  const [row] = await db
    .insert(blueprints)
    .values({
      userId,
      prompt: input.prompt,
      totalDays: constraints.totalDays,
      dailyMinutes: constraints.dailyMinutes,
      budgetVnd: constraints.budgetVnd,
      experience: constraints.experience,
      iotEnabled: input.iotEnabled,
      params: {
        totalDays: input.totalDays,
        dailyMinutes: input.dailyMinutes,
        budgetVnd: input.budgetVnd,
        experience: input.experience,
      },
      payload: blueprint,
      model: blueprint.model,
      engine: blueprint.engine,
      status: "ready",
    })
    .returning({ id: blueprints.id });
  if (!row) throw new Error("blueprint insert failed");

  // Only one draft is ever on screen: the previous one is not referenced by
  // anything, so it goes away instead of piling up.
  await db.delete(blueprints).where(and(eq(blueprints.userId, userId), ne(blueprints.id, row.id)));

  return row.id;
}

/** A stored draft; throws when it doesn't exist or isn't owned by `userId`. */
export const readBlueprint = cache(async (userId: string, blueprintId: string): Promise<Blueprint> => {
  const row = await db.query.blueprints.findFirst({
    where: and(eq(blueprints.id, blueprintId), eq(blueprints.userId, userId)),
  });
  if (!row) throw new NotFoundError("Blueprint not found");
  return row.payload;
});

/** The draft currently on screen (the one the cookie points at). */
export async function readCurrentDraft(
  userId: string,
): Promise<{ id: string; input: BlueprintInput; constraints: BlueprintConstraints; blueprint: Blueprint } | null> {
  const id = await readBlueprintId();
  if (!id) return null;
  const row = await db.query.blueprints.findFirst({
    where: and(eq(blueprints.id, id), eq(blueprints.userId, userId)),
  });
  if (!row) return null;
  const raw = row.params;
  return {
    id: row.id,
    input: {
      prompt: row.prompt,
      totalDays: raw?.totalDays ?? null,
      dailyMinutes: raw?.dailyMinutes ?? null,
      budgetVnd: raw?.budgetVnd ?? null,
      experience: raw?.experience ?? null,
      iotEnabled: row.iotEnabled,
    },
    constraints: {
      totalDays: row.totalDays,
      dailyMinutes: row.dailyMinutes,
      budgetVnd: row.budgetVnd,
      experience: row.experience as BlueprintConstraints["experience"],
    },
    blueprint: row.payload,
  };
}

/** Applies hand edits to a draft and stores the result. */
export async function saveBlueprintOps(userId: string, blueprintId: string, ops: BlueprintOp[]): Promise<Blueprint> {
  const current = await readBlueprint(userId, blueprintId);
  const next = applyBlueprintOps(current, ops);
  await db
    .update(blueprints)
    .set({ payload: next, updatedAt: new Date() })
    .where(and(eq(blueprints.id, blueprintId), eq(blueprints.userId, userId)));
  return next;
}

/* ------------------------------------------------------------------ *
 * Project creation
 * ------------------------------------------------------------------ */

/** "Bước 1: " prefixes are dropped: the app renders the step number itself. */
function stripStepPrefix(title: string): string {
  return title.replace(/^Bước\s*\d+\s*:\s*/i, "");
}

type MilestoneDraft = { day: number; label: string; title: string; icon: string; kind: "standard" | "shopping" | "target" };

const MILESTONE_RANK = { standard: 0, shopping: 1, target: 2 } as const;

/**
 * Creates the project described by a blueprint: stages, one day plan per
 * project day with its action items, the shopping days taken from the BOM
 * and — when the user accepted the IoT suggestion — a hub with the devices.
 */
export async function createProject(
  userId: string,
  input: BlueprintInput,
  blueprint: Blueprint,
  ownedSupplies: string[] = [],
) {
  const iotEnabled = resolveIotEnabled(input, blueprint);
  const startDate = isoDateInTz(new Date());

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        userId,
        name: blueprint.name,
        icon: blueprint.icon,
        startDate,
        totalDays: blueprint.totalDays,
        iotEnabled,
        budgetVnd: blueprint.budgetVnd,
        expectedRevenueVnd: 0,
      })
      .returning();
    if (!project) throw new Error("project insert failed");
    const projectId = project.id;

    // The nodes become the stages of the project.
    await tx.insert(projectStages).values(
      blueprint.nodes.map((node) => ({
        projectId,
        name: node.title,
        startDay: node.startDay,
        endDay: node.endDay,
      })),
    );

    // One day plan per project day: the node that owns the day gives it its
    // title and objective, its items give it its action list.
    const dayRows = await tx
      .insert(dayPlans)
      .values(
        Array.from({ length: blueprint.totalDays }, (_, index) => {
          const day = index + 1;
          const node = blueprint.nodes.find((candidate) => day >= candidate.startDay && day <= candidate.endDay);
          return {
            projectId,
            day,
            title: node?.title ?? blueprint.name,
            summary: node?.objective ?? blueprint.summary,
            goldenStart: day === 1 ? blueprint.goldenStart : null,
            goldenEnd: day === 1 ? blueprint.goldenEnd : null,
          };
        }),
      )
      .returning();
    const dayPlanByDay = new Map(dayRows.map((row) => [row.day, row]));

    // The items of a day become its steps; their checklists become step items.
    const stepRows: { day: number; position: number; item: BlueprintItem }[] = [];
    for (const node of blueprint.nodes) {
      const byDay = new Map<number, BlueprintItem[]>();
      for (const item of node.items) {
        const bucket = byDay.get(item.day) ?? [];
        bucket.push(item);
        byDay.set(item.day, bucket);
      }
      for (const [day, items] of byDay) {
        items.forEach((item, index) => stepRows.push({ day, position: index + 1, item }));
      }
    }
    const shoppingByDay = new Map<number, string[]>();
    for (const supply of blueprint.supplies) {
      const bucket = shoppingByDay.get(supply.buyByDay) ?? [];
      bucket.push(supply.name);
      shoppingByDay.set(supply.buyByDay, bucket);
    }

    // A plan may have no action items at all; an empty insert is an error.
    const insertedSteps =
      stepRows.length === 0
        ? []
        : await tx
            .insert(steps)
            .values(
              stepRows.map(({ day, position, item }) => ({
                dayPlanId: dayPlanByDay.get(day)!.id,
                position,
                title: stripStepPrefix(item.title),
                description: item.description,
                estimatedMinutes: item.minutes,
                requiresPhoto: item.requiresPhoto,
              })),
            )
            .returning();

    const checklist = stepRows.flatMap(({ day, position, item }) => {
      if (item.checklist.length === 0) return [];
      const row = insertedSteps.find(
        (candidate) => candidate.dayPlanId === dayPlanByDay.get(day)!.id && candidate.position === position,
      );
      if (!row) return [];
      return item.checklist.map((label, index) => ({ stepId: row.id, position: index + 1, label }));
    });
    if (checklist.length > 0) await tx.insert(stepItems).values(checklist);

    // Shopping shows up as a step on the day the items have to be bought.
    for (const [day, names] of [...shoppingByDay.entries()].sort((a, b) => a[0] - b[0])) {
      const dayPlan = dayPlanByDay.get(day);
      if (!dayPlan) continue;
      const last = await tx
        .select({ position: steps.position })
        .from(steps)
        .where(eq(steps.dayPlanId, dayPlan.id));
      const position = last.reduce((max, row) => Math.max(max, row.position), 0) + 1;
      await tx.insert(steps).values({
        dayPlanId: dayPlan.id,
        position,
        title: `Mua sắm: ${names.join(", ")}`,
        estimatedMinutes: 30,
      });
    }

    // A plan may have no bill of materials (the model left it out).
    const supplyRows = blueprint.supplies.flatMap((item, index) => {
      const dayPlan = dayPlanByDay.get(item.buyByDay);
      if (!dayPlan) return [];
      return [
        {
          dayPlanId: dayPlan.id,
          name: item.name,
          icon: SUPPLY_ICONS[(index + item.buyByDay) % SUPPLY_ICONS.length]!,
          quantity: "x1",
          available: ownedSupplies.includes(item.name),
          unitPriceVnd: item.priceVnd,
          buyByDay: item.buyByDay,
        },
      ];
    });
    if (supplyRows.length > 0) await tx.insert(supplies).values(supplyRows);

    const milestoneDrafts: MilestoneDraft[] = [];
    for (const node of blueprint.nodes) {
      milestoneDrafts.push({
        day: node.startDay,
        label: node.title,
        title: `N${String(node.startDay).padStart(2, "0")}: ${node.title}`,
        icon: node.index === 1 ? "check" : "event_upcoming",
        kind: "standard",
      });
    }
    for (const node of blueprint.nodes) {
      for (const checkpoint of node.checkpoints) {
        milestoneDrafts.push({
          day: checkpoint.day,
          label: checkpoint.label,
          title: `N${String(checkpoint.day).padStart(2, "0")}: ${checkpoint.label}`,
          icon: "task_alt",
          kind: "standard",
        });
      }
    }
    for (const day of shoppingByDay.keys()) {
      milestoneDrafts.push({
        day,
        label: "Mua sắm",
        title: `N${String(day).padStart(2, "0")}: Mua sắm vật tư`,
        icon: "shopping_basket",
        kind: "shopping",
      });
    }
    milestoneDrafts.push({
      day: blueprint.totalDays,
      label: "Hoàn thành",
      title: `N${blueprint.totalDays}: Hoàn thành kế hoạch ${blueprint.totalDays} ngày`,
      icon: "flag",
      kind: "target",
    });

    // One milestone per day (unique index): merge the drafts that share a day.
    const merged = new Map<number, MilestoneDraft>();
    for (const draft of milestoneDrafts) {
      const existing = merged.get(draft.day);
      if (!existing) {
        merged.set(draft.day, draft);
        continue;
      }
      merged.set(draft.day, {
        day: draft.day,
        label: existing.label,
        title: `${existing.title} · ${draft.title.replace(/^N\d+:\s*/, "")}`,
        icon: MILESTONE_RANK[draft.kind] > MILESTONE_RANK[existing.kind] ? draft.icon : existing.icon,
        kind: MILESTONE_RANK[draft.kind] > MILESTONE_RANK[existing.kind] ? draft.kind : existing.kind,
      });
    }
    await tx.insert(milestones).values([...merged.values()].map((draft) => ({ ...draft, projectId })));

    const firstInsight =
      blueprint.nodes.flatMap((node) => node.items).find((item) => item.day === 1)?.rationale ??
      blueprint.nodes[0]?.objective ??
      blueprint.summary;
    await tx.insert(aiInsights).values({
      projectId,
      kind: "day",
      day: 1,
      body: firstInsight,
      confidencePct: 92,
    });

    if (iotEnabled) {
      const [hub] = await tx
        .insert(hubs)
        .values({ projectId, name: "Hub v2", location: blueprint.tags[0]?.label ?? null, online: false })
        .returning();
      if (hub && blueprint.devices.length > 0) {
        await tx.insert(devices).values(
          blueprint.devices.map((device) => ({
            hubId: hub.id,
            kind: device.kind,
            name: device.name,
            status: "offline" as const,
          })),
        );
      }
    }

    return { id: projectId, name: project.name, iotEnabled, totalDays: project.totalDays };
  });
}
