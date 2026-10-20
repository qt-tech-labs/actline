import { ICON_NAMES } from "@/lib/icons";
import type { BlueprintCheckpoint, BlueprintDevice, BlueprintItem, BlueprintNode, BlueprintRisk, BlueprintSupply, BlueprintTag } from "@/lib/types";
import {
  addDeviceArgs,
  addRiskArgs,
  addSupplyArgs,
  createNodeItemArgs,
  createNodeShellArgs,
  finalizePlanArgs,
  proposeConstraintsArgs,
  type PlanCraftToolName,
} from "./tools";

/** The constraints the plan has to respect. */
export type PlanCraftContext = {
  totalDays: number;
  dailyMinutes: number;
  budgetVnd: number;
};

export type PlanCraftMeta = {
  name: string;
  summary: string;
  icon: string;
  tags: BlueprintTag[];
  iotSuggested: boolean;
  goldenStart: string | null;
  goldenEnd: string | null;
};

export type PlanCraftResult =
  | { tool: "create_node"; node: BlueprintNode }
  | { tool: "add_supply"; supply: BlueprintSupply }
  | { tool: "add_risk"; risk: BlueprintRisk }
  | { tool: "add_device"; device: BlueprintDevice }
  | { tool: "finalize_plan"; meta: PlanCraftMeta };

export type ToolOutcome =
  | { ok: true; result: PlanCraftResult; repairs: string[] }
  | { ok: false; error: string };

const ICON_SET: readonly string[] = ICON_NAMES;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** An icon the app can actually render — the font is a subset. */
function safeIcon(name: string, fallback: string): string {
  return ICON_SET.includes(name) ? name : fallback;
}

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function safeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return HH_MM.test(value.trim()) ? value.trim() : null;
}

const newItemId = () => `it_${crypto.randomUUID()}`;

/**
 * Checks one tool call and repairs what can be repaired.
 *
 * The model is asked to follow the rules of the skill; this is where the rules
 * are actually enforced. Anything structural is rejected (the model is told
 * and retries), anything cosmetic is silently fixed and reported.
 */
export function validateToolCall(name: PlanCraftToolName, args: unknown, context: PlanCraftContext): ToolOutcome {
  switch (name) {
    case "create_node":
      return validateNode(args, context);
    case "add_supply":
      return validateSupply(args, context);
    case "add_risk":
      return validateRisk(args);
    case "add_device":
      return validateDevice(args);
    case "finalize_plan":
      return validateFinalize(args);
  }
}

function validateNode(args: unknown, context: PlanCraftContext): ToolOutcome {
  // The node itself has to be sound; its items are checked one by one so a
  // single malformed action does not throw the whole node away.
  const shell = createNodeShellArgs.safeParse(args);
  if (!shell.success) {
    return { ok: false, error: `create_node: ${shell.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}` };
  }
  const raw = shell.data;
  const repairs: string[] = [];

  // The node has to sit inside the project.
  const startDay = clamp(raw.startDay, 1, context.totalDays);
  const endDay = clamp(Math.max(raw.endDay, startDay), startDay, context.totalDays);
  if (startDay !== raw.startDay || endDay !== raw.endDay) repairs.push(`node "${raw.title}" nằm ngoài dự án, đã chỉnh về ngày ${startDay}-${endDay}`);

  // Items that don't parse are dropped; the rest of the node survives.
  const rawItems = Array.isArray((args as { items?: unknown }).items) ? ((args as { items: unknown[] }).items) : [];
  const items: BlueprintItem[] = [];
  const taken = new Set<number>();
  rawItems.forEach((candidate) => {
    const item = createNodeItemArgs.safeParse(candidate);
    if (!item.success) {
      repairs.push(`bỏ 1 hành động không hợp lệ trong giai đoạn "${raw.title}"`);
      return;
    }
    const data = item.data;
    let day = data.day ? clamp(data.day, startDay, endDay) : startDay;
    if (!data.day) {
      for (let free = startDay; free <= endDay; free += 1) {
        if (!taken.has(free)) {
          day = free;
          break;
        }
      }
    }
    if (data.day && data.day !== day) repairs.push(`hành động "${data.title}" chuyển về ngày ${day}`);
    taken.add(day);
    const minutes = clamp(data.minutes, 5, context.dailyMinutes);
    if (minutes !== data.minutes) repairs.push(`hành động "${data.title}" giới hạn còn ${minutes} phút`);
    items.push({
      id: newItemId(),
      day,
      title: data.title,
      description: data.description,
      minutes,
      rationale: data.rationale,
      checklist: data.checklist,
      requiresPhoto: data.requiresPhoto,
      photoTitle: data.photoTitle,
      photoHint: data.photoHint,
    });
  });

  const checkpoints: BlueprintCheckpoint[] = raw.checkpoints
    .map((checkpoint) => ({ day: clamp(checkpoint.day, startDay, endDay), label: checkpoint.label }))
    .filter((checkpoint, index, list) => list.findIndex((other) => other.day === checkpoint.day) === index);

  return {
    ok: true,
    repairs,
    result: {
      tool: "create_node",
      node: {
        index: raw.index,
        title: raw.title,
        objective: raw.objective,
        startDay,
        endDay,
        rangeLabel: "",
        items,
        checkpoints,
        successCriteria: raw.successCriteria,
        tone: "primary",
      },
    },
  };
}

function validateSupply(args: unknown, context: PlanCraftContext): ToolOutcome {
  const parsed = addSupplyArgs.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: `add_supply: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}` };
  }
  const repairs: string[] = [];
  const buyByDay = clamp(parsed.data.buyByDay, 1, context.totalDays);
  if (buyByDay !== parsed.data.buyByDay) repairs.push(`vật tư "${parsed.data.name}" mua trước ngày ${buyByDay}`);
  return {
    ok: true,
    repairs,
    result: {
      tool: "add_supply",
      supply: {
        name: parsed.data.name,
        spec: parsed.data.spec,
        priceVnd: Math.max(0, parsed.data.priceVnd),
        buyByDay,
        urgency: buyByDay <= 3 ? "now" : buyByDay <= 10 ? "soon" : "later",
        priceSource: "ai_estimate",
      },
    },
  };
}

function validateRisk(args: unknown): ToolOutcome {
  const parsed = addRiskArgs.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: `add_risk: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}` };
  }
  const icon = safeIcon(parsed.data.icon, parsed.data.tone === "danger" ? "warning" : "tips_and_updates");
  return {
    ok: true,
    repairs: icon === parsed.data.icon ? [] : [`rủi ro "${parsed.data.title}" dùng icon không hợp lệ, đã đổi thành ${icon}`],
    result: {
      tool: "add_risk",
      risk: { icon, title: parsed.data.title, body: parsed.data.body, tone: parsed.data.tone },
    },
  };
}

const DEVICE_ICON: Record<BlueprintDevice["kind"], string> = {
  gateway: "hub",
  soil_probe: "sensors",
  valve: "valve",
  camera: "photo_camera",
};

function validateDevice(args: unknown): ToolOutcome {
  const parsed = addDeviceArgs.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: `add_device: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}` };
  }
  const icon = safeIcon(parsed.data.icon, DEVICE_ICON[parsed.data.kind]);
  return {
    ok: true,
    repairs: icon === parsed.data.icon ? [] : [`thiết bị "${parsed.data.name}" dùng icon không hợp lệ, đã đổi thành ${icon}`],
    result: {
      tool: "add_device",
      device: {
        role: parsed.data.role,
        name: parsed.data.name,
        detail: parsed.data.detail,
        icon,
        protocol: parsed.data.protocol,
        tone: "primary",
        kind: parsed.data.kind,
      },
    },
  };
}

function validateFinalize(args: unknown): ToolOutcome {  const parsed = finalizePlanArgs.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: `finalize_plan: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}` };
  }
  const repairs: string[] = [];
  const icon = safeIcon(parsed.data.icon, "psychiatry");
  if (icon !== parsed.data.icon) repairs.push(`icon dự án không hợp lệ, đã đổi thành ${icon}`);
  const tags: BlueprintTag[] = parsed.data.tags.map((tag) => {
    const tagIcon = safeIcon(tag.icon, "check_circle");
    if (tagIcon !== tag.icon) repairs.push(`icon nhãn không hợp lệ, đã đổi thành ${tagIcon}`);
    return { icon: tagIcon, label: tag.label, tone: tag.tone };
  });
  const goldenStart = safeTime(parsed.data.goldenStart);
  const goldenEnd = safeTime(parsed.data.goldenEnd);
  if (goldenStart !== parsed.data.goldenStart || goldenEnd !== parsed.data.goldenEnd) {
    repairs.push("khung giờ vàng không hợp lệ, đã bỏ");
  }
  return {
    ok: true,
    repairs,
    result: {
      tool: "finalize_plan",
      meta: {
        name: parsed.data.name,
        summary: parsed.data.summary,
        icon,
        tags,
        iotSuggested: parsed.data.iotSuggested,
        goldenStart,
        goldenEnd,
      },
    },
  };
}

/**
 * The constraints the model proposes: how long, how much time, how much money,
 * how experienced. These decide the shape of the whole plan.
 */
export type ProposedConstraints = {
  totalDays: number;
  dailyMinutes: number;
  budgetVnd: number;
  experience: "beginner" | "basic" | "pro";
  rationale: string;
};

export function validateProposedConstraints(args: unknown): { ok: true; value: ProposedConstraints } | { ok: false; error: string } {
  const parsed = proposeConstraintsArgs.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ") };
  }
  return {
    ok: true,
    value: {
      totalDays: parsed.data.totalDays,
      dailyMinutes: parsed.data.dailyMinutes,
      budgetVnd: parsed.data.budgetVnd,
      experience: parsed.data.experience,
      rationale: parsed.data.rationale,
    },
  };
}
