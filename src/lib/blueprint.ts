import { z } from "zod";
import type { Blueprint, BlueprintConstraints, BlueprintItem, BlueprintNode, BlueprintParams, BlueprintSupply } from "@/lib/types";

/**
 * The studio starts empty: the idea is typed by the user, the placeholder shows
 * an example and the sample chips offer a few starting points.
 */
export const DEFAULT_PROMPT = "";

export const DEFAULT_PARAMS: BlueprintParams = {
  totalDays: null,
  dailyMinutes: null,
  budgetVnd: null,
  experience: null,
};

/** The values the template engine falls back to when the AI is not around. */
export const FALLBACK_PARAMS: BlueprintConstraints = {
  totalDays: 45,
  dailyMinutes: 45,
  budgetVnd: 1_500_000,
  experience: "beginner",
};

/** One-tap examples; the label is translated, the prompt is engine content. */
export const SUGGESTIONS = [
  {
    key: "garden",
    icon: "psychiatry",
    prompt:
      "Tôi muốn trồng 4 cây dưa nưới Huỳnh Long trên sân thượng tầng 4 rộng 5m², cần quy trình bấm ngọn thụ phấn chính xác và thu hoạch sau 65 ngày.",
  },
  {
    key: "robot",
    icon: "precision_manufacturing",
    prompt:
      "Tự làm một chiếc robot 2 bánh tự hành dò đường bằng Arduino Uno R3 và cảm biến hồng ngoại 5 kênh, ngân sách 600.000đ, hoàn thành sau 14 ngày.",
  },
  {
    key: "diorama",
    icon: "architecture",
    prompt:
      "Làm sa bàn ngõ hẻm Cyberpunk kích thước 30x30cm tỉ lệ 1:35 với đèn LED neon mini và hiệu ứng mưa ẩm, hoàn thiện trong 21 ngày.",
  },
  {
    key: "aquarium",
    icon: "set_meal",
    prompt:
      "Setup một bể cá thủy sinh cubic 30x30x30 phong cách Iwagumi không CO2, thả 6 chú cá Guppy Full Gold, hoàn thành chu trình nitrogen sau 30 ngày.",
  },
  {
    key: "marathon",
    icon: "directions_run",
    prompt:
      "Lên giáo án tập chạy cự ly Bán Marathon 21km (Half Marathon) từ con số 0 trong 12 tuần, dành 4 buổi mỗi tuần, mỗi buổi 45 phút.",
  },
] as const;

/** The models the plan studio offers, in the order the dropdown lists them. */
export const PLAN_PROVIDERS = ["gemini", "openrouter", "local"] as const;

export const EXPERIENCE_LEVELS = ["beginner", "basic", "pro"] as const;

export const blueprintParamsSchema = z.object({
  totalDays: z.number().int().min(7).max(365).nullable().default(null),
  dailyMinutes: z.number().int().min(10).max(600).nullable().default(null),
  budgetVnd: z.number().int().min(0).max(1_000_000_000).nullable().default(null),
  experience: z.enum(EXPERIENCE_LEVELS).nullable().default(null),
});

export const blueprintInputSchema = blueprintParamsSchema.extend({
  prompt: z.string().trim().min(8).max(600),
  iotEnabled: z.boolean().nullable().default(null),
});

export const blueprintGenerationSchema = blueprintInputSchema.extend({
  provider: z.enum(PLAN_PROVIDERS).optional(),
  /** Debug only: a ready-made plan that is returned instead of asking a model. */
  mockPlan: z.record(z.string(), z.unknown()).optional(),
});

/** The least a mocked plan must have; `normalizeBlueprint` takes care of the rest. */
export const mockPlanSchema = z
  .object({
    name: z.string(),
    totalDays: z.number(),
    dailyMinutes: z.number(),
    budgetVnd: z.number(),
    nodes: z.array(z.record(z.string(), z.unknown())).min(1),
    supplies: z.array(z.record(z.string(), z.unknown())),
    devices: z.array(z.record(z.string(), z.unknown())),
    risks: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

/** The values a plan is actually built with: what the user set, or the fallback. */
export function resolveParams(params: BlueprintParams): BlueprintConstraints {
  return {
    totalDays: params.totalDays ?? FALLBACK_PARAMS.totalDays,
    dailyMinutes: params.dailyMinutes ?? FALLBACK_PARAMS.dailyMinutes,
    budgetVnd: params.budgetVnd ?? FALLBACK_PARAMS.budgetVnd,
    experience: params.experience ?? FALLBACK_PARAMS.experience,
  };
}

/** Day ranges of the four execution phases, scaled to the requested duration. */
export function phaseRanges(totalDays: number): { startDay: number; endDay: number }[] {
  // Where the first three phases end, as a share of the whole project.
  const endDays = [0.156, 0.334, 0.622].map((ratio) => Math.max(1, Math.round(ratio * totalDays)));
  const ranges: { startDay: number; endDay: number }[] = [];
  let start = 1;
  for (const end of endDays) {
    const bounded = Math.min(Math.max(end, start), totalDays);
    ranges.push({ startDay: start, endDay: bounded });
    start = bounded + 1;
  }
  ranges.push({ startDay: start, endDay: totalDays });
  return ranges;
}

/** "N01 → N07" */
export function dayRangeLabel(startDay: number, endDay: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `N${pad(startDay)} → N${pad(endDay)}`;
}

/* ------------------------------------------------------------------ *
 * Normalisation
 *
 * Every plan — written by the AI, by the template engine or by hand —
 * goes through `normalizeBlueprint` before it is shown or stored. The
 * normaliser is the single place that guarantees the invariants the app
 * relies on: the nodes tile the project, every item sits on a day
 * inside its node, a day never exceeds the user's daily time and the
 * bill of materials never silently breaks the budget.
 * ------------------------------------------------------------------ */

/** Share of the material budget kept aside for incidents and failures. */
export const CONTINGENCY_RATIO = 0.356;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const roundTo1000 = (n: number) => Math.round(n / 1000) * 1000;

/** "~30-45 phút / ngày" */
export function rhythmLabel(dailyMinutes: number): string {
  if (dailyMinutes <= 20) return "~15-20 phút / ngày";
  if (dailyMinutes <= 45) return "~30-45 phút / ngày";
  if (dailyMinutes <= 60) return "~45-60 phút / ngày";
  return "~60-90 phút / ngày";
}

/** Repairs the node ranges so they tile `1..totalDays` with no gap and no overlap. */
function tileNodes(nodes: BlueprintNode[], totalDays: number): BlueprintNode[] {
  const sorted = nodes
    .map((node) => ({
      ...node,
      startDay: clamp(Math.round(node.startDay), 1, totalDays),
      endDay: clamp(Math.round(node.endDay), 1, totalDays),
    }))
    .filter((node) => node.endDay >= node.startDay)
    .sort((a, b) => a.startDay - b.startDay);

  const tiled: BlueprintNode[] = [];
  for (const node of sorted) {
    const previous = tiled[tiled.length - 1];
    if (!previous) {
      // The first node always starts on day 1.
      tiled.push({ ...node, startDay: 1, endDay: Math.max(node.endDay, 1) });
      continue;
    }
    if (node.startDay > previous.endDay + 1) {
      // Gap: the previous node stretches to the day before this one.
      previous.endDay = node.startDay - 1;
    } else {
      // Overlap: the previous node stops right before this one.
      previous.endDay = Math.max(previous.startDay, node.startDay - 1);
      node.startDay = previous.endDay + 1;
    }
    node.endDay = Math.max(node.endDay, node.startDay);
    tiled.push(node);
  }

  if (tiled.length === 0) {
    tiled.push({
      index: 1,
      title: "Kế hoạch",
      objective: "",
      startDay: 1,
      endDay: totalDays,
      rangeLabel: dayRangeLabel(1, totalDays),
      items: [],
      checkpoints: [],
      successCriteria: null,
      tone: "primary",
    });
  }

  // The plan always reaches the last day of the project.
  const last = tiled[tiled.length - 1]!;
  last.endDay = totalDays;
  return tiled.map((node, index) => ({
    ...node,
    index: index + 1,
    rangeLabel: dayRangeLabel(node.startDay, node.endDay),
    tone: index === tiled.length - 1 ? ("secondary" as const) : ("primary" as const),
  }));
}

/** Places every item on a day inside its node and keeps a day's work within budget. */
function placeItems(nodes: BlueprintNode[], dailyMinutes: number): BlueprintNode[] {
  const placed = nodes.map((node) => {
    const taken = new Set<number>();
    const items = node.items.map((item) => {
      const raw = Number(item.day);
      const hasDay = Number.isFinite(raw);
      let day = hasDay ? clamp(Math.round(raw), node.startDay, node.endDay) : node.startDay;
      if (!hasDay) {
        // An item without a day lands on the first free day of the node.
        for (let candidate = node.startDay; candidate <= node.endDay; candidate += 1) {
          if (!taken.has(candidate)) {
            day = candidate;
            break;
          }
        }
      }
      taken.add(day);
      return { ...item, day, minutes: clamp(Math.round(item.minutes), 5, dailyMinutes) };
    });
    return { ...node, items };
  });

  // Scale a day down when its items ask for more time than the user has.
  return placed.map((node) => {
    const byDay = new Map<number, BlueprintItem[]>();
    for (const item of node.items) {
      const bucket = byDay.get(item.day) ?? [];
      bucket.push(item);
      byDay.set(item.day, bucket);
    }
    const items = node.items.map((item) => {
      const bucket = byDay.get(item.day)!;
      const total = bucket.reduce((sum, sibling) => sum + sibling.minutes, 0);
      if (total <= dailyMinutes) return item;
      const factor = dailyMinutes / total;
      return { ...item, minutes: Math.max(5, Math.round(item.minutes * factor)) };
    });
    return { ...node, items };
  });
}

/** Keeps the bill of materials inside the budget and records the honest estimate. */
function normaliseSupplies(supplies: BlueprintSupply[], budgetVnd: number, totalDays: number) {
  const items = supplies.map((supply) => {
    const buyByDay = clamp(Math.round(supply.buyByDay), 1, totalDays);
    return {
      ...supply,
      priceVnd: Math.max(0, Math.round(supply.priceVnd)),
      buyByDay,
      urgency: buyByDay <= 3 ? ("now" as const) : buyByDay <= 10 ? ("soon" as const) : ("later" as const),
    };
  });

  const subtotalOf = (list: BlueprintSupply[]) => list.reduce((sum, item) => sum + item.priceVnd, 0);
  const contingencyOf = (subtotal: number) => roundTo1000(subtotal * CONTINGENCY_RATIO);

  // The estimate is what the plan really costs, using the prices in force.
  const subtotal = subtotalOf(items);
  const estimatedTotalVnd = subtotal + contingencyOf(subtotal);

  if (estimatedTotalVnd <= budgetVnd || budgetVnd <= 0) {
    return { items, suppliesSubtotalVnd: subtotal, contingencyVnd: contingencyOf(subtotal), estimatedTotalVnd, totalPackageVnd: estimatedTotalVnd };
  }

  // Over budget: scale the estimates down to fit. Prices the user typed are
  // never touched — an over-budget plan the user priced by hand stays honest.
  const userItems = items.filter((item) => item.priceSource === "user");
  const estimatedItems = items.filter((item) => item.priceSource !== "user");
  const userSubtotal = subtotalOf(userItems);
  const estimatedSubtotal = subtotalOf(estimatedItems);
  const room = Math.max(0, budgetVnd * 0.95 - userSubtotal - contingencyOf(userSubtotal));
  const factor = estimatedSubtotal > 0 ? clamp(room / estimatedSubtotal, 0.1, 1) : 1;

  const scaled = items.map((item) =>
    item.priceSource === "user" ? item : { ...item, priceVnd: roundTo1000(item.priceVnd * factor) },
  );
  const scaledSubtotal = subtotalOf(scaled);
  const contingency = contingencyOf(scaledSubtotal);
  return {
    items: scaled,
    suppliesSubtotalVnd: scaledSubtotal,
    contingencyVnd: contingency,
    estimatedTotalVnd,
    totalPackageVnd: scaledSubtotal + contingency,
  };
}

/**
 * Returns a plan that satisfies every invariant of the app. The input may come
 * from the AI, from the template engine or from a hand edit; the output is
 * always the same shape.
 */
export function normalizeBlueprint(plan: Blueprint): Blueprint {
  const totalDays = clamp(Math.round(plan.totalDays), 1, 365);
  const dailyMinutes = clamp(Math.round(plan.dailyMinutes), 10, 600);

  const nodes = placeItems(tileNodes(plan.nodes, totalDays), dailyMinutes);
  const { items, suppliesSubtotalVnd, contingencyVnd, estimatedTotalVnd, totalPackageVnd } = normaliseSupplies(
    plan.supplies,
    plan.budgetVnd,
    totalDays,
  );

  return {
    ...plan,
    totalDays,
    dailyMinutes,
    nodes,
    nodeCount: nodes.length,
    supplies: items,
    suppliesSubtotalVnd,
    contingencyVnd,
    estimatedTotalVnd,
    totalPackageVnd,
    budgetDeltaVnd: plan.budgetVnd - estimatedTotalVnd,
    rhythmLabel: rhythmLabel(dailyMinutes),
    checkpointCount: nodes.reduce((sum, node) => sum + node.checkpoints.length, 0),
  };
}

/** The days a node covers, in order. */
export function nodeDays(node: BlueprintNode): number[] {
  const days: number[] = [];
  for (let day = node.startDay; day <= node.endDay; day += 1) days.push(day);
  return days;
}

/** The node that owns a project day, or null when the day is not covered. */
export function nodeForDay(plan: Blueprint, day: number): BlueprintNode | null {
  return plan.nodes.find((node) => day >= node.startDay && day <= node.endDay) ?? null;
}

/** Every action item of a day, in plan order. */
export function itemsForDay(plan: Blueprint, day: number): BlueprintItem[] {
  return plan.nodes.flatMap((node) => node.items.filter((item) => item.day === day));
}
