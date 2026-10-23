import { z } from "zod";
import { ICON_NAMES } from "@/lib/icons";
import type { BlueprintCheckpoint, BlueprintDevice, BlueprintItem, BlueprintNode, BlueprintRisk, BlueprintSupply, BlueprintTag } from "@/lib/types";
import { FALLBACK_PARAMS } from "@/lib/blueprint";
import type { PlanCraftEnvelope } from "./system-prompt";
import {
  constraintsSchema,
  deviceSchema,
  itemSchema,
  metaSchema,
  nodeSchema,
  riskSchema,
  supplySchema,
} from "./plan-schema";

/** The constraints the plan has to respect. */
export type PlanCraftContext = {
  totalDays: number;
  dailyMinutes: number;
  budgetVnd: number;
  experience: "beginner" | "basic" | "pro";
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

/** What the validator pulled out of one model answer. */
export type PlanCraftReport = {
  constraints: PlanCraftConstraints;
  plan: {
    nodes: BlueprintNode[];
    supplies: BlueprintSupply[];
    risks: BlueprintRisk[];
    devices: BlueprintDevice[];
    meta: PlanCraftMeta | null;
  };
  /** What the server silently fixed. */
  repairs: string[];
  /** What the model has to fix itself: unusable items, missing structure. */
  problems: string[];
  /** The document was not even an object; only the correction turn can help. */
  unusable: boolean;
};

type PlanCraftConstraints = PlanCraftContext;

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

const zodIssues = (error: z.ZodError): string =>
  error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ") : "unknown";

/**
 * Validates one document from the model and repairs what can be repaired.
 *
 * The model is asked to follow the rules of the skill; this is where the rules
 * are actually enforced. Anything that one item can carry survives: a broken
 * supply does not throw away a good node. Whatever cannot be used is dropped
 * and remembered as a problem, so the model can re-emit the whole document —
 * and anything structural is still repaired silently (day ranges, minutes,
 * icons, prices) and reported.
 */
export function validatePlanDocument(doc: unknown, envelope: PlanCraftEnvelope): PlanCraftReport {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return {
      constraints: resolvedConstraints(envelope, null),
      plan: { nodes: [], supplies: [], risks: [], devices: [], meta: null },
      repairs: [],
      problems: ["Tài liệu không phải một JSON object. Trả lại toàn bộ tài liệu đúng cú pháp."],
      unusable: true,
    };
  }

  const document = doc as Record<string, unknown>;
  const problems: string[] = [];

  /* ----- constraints: the user's hand-set values always win ----- */

  const proposed = constraintsSchema.safeParse(document.constraints);
  if (document.constraints !== undefined && !proposed.success) {
    problems.push(`constraints: ${zodIssues(proposed.error)} — hãy điền 4 thông số đúng kiểu.`);
  }
  const constraints = resolvedConstraints(envelope, proposed.success ? proposed.data : null);

  /* ----- the plan itself ----- */

  const rawPlan = document.plan;
  if (!rawPlan || typeof rawPlan !== "object" || Array.isArray(rawPlan)) {
    return {
      constraints,
      plan: { nodes: [], supplies: [], risks: [], devices: [], meta: null },
      repairs: [],
      problems: [`plan: ${rawPlan === undefined ? "thiếu hẳn" : "không phải object"}. Trả lại toàn bộ tài liệu.`],
      unusable: true,
    };
  }
  const plan = rawPlan as Record<string, unknown>;
  const repairs: string[] = [];

  const nodes: BlueprintNode[] = [];
  const nodeCount = Array.isArray(plan.nodes) ? plan.nodes.length : 0;
  (Array.isArray(plan.nodes) ? plan.nodes : []).forEach((candidate, position) => {
    const node = nodeSchema.safeParse(candidate);
    if (!node.success) {
      problems.push(`nodes[${position}]: ${zodIssues(node.error)} — giai đoạn này bị bỏ.`);
      return;
    }
    const data = node.data;

    // The node has to sit inside the project.
    const startDay = clamp(data.startDay, 1, constraints.totalDays);
    const endDay = clamp(Math.max(data.endDay, startDay), startDay, constraints.totalDays);
    if (startDay !== data.startDay || endDay !== data.endDay) {
      repairs.push(`giai đoạn "${data.title}" nằm ngoài dự án, đã chỉnh về ngày ${startDay}-${endDay}`);
    }

    // Items that don't parse are dropped; the rest of the node survives.
    const items: BlueprintItem[] = [];
    const taken = new Set<number>();
    data.items.forEach((candidate, itemPosition) => {
      const item = itemSchema.safeParse(candidate);
      if (!item.success) {
        problems.push(`nodes[${position}].items[${itemPosition}]: ${zodIssues(item.error)} — bị bỏ.`);
        return;
      }
      const entry = item.data;
      let day = entry.day ? clamp(entry.day, startDay, endDay) : startDay;
      if (!entry.day) {
        for (let free = startDay; free <= endDay; free += 1) {
          if (!taken.has(free)) {
            day = free;
            break;
          }
        }
      }
      if (entry.day && entry.day !== day) repairs.push(`hành động "${entry.title}" chuyển về ngày ${day}`);
      taken.add(day);
      const minutes = clamp(entry.minutes, 5, constraints.dailyMinutes);
      if (minutes !== entry.minutes) repairs.push(`hành động "${entry.title}" giới hạn còn ${minutes} phút`);
      items.push({
        id: newItemId(),
        day,
        title: entry.title,
        description: entry.description,
        minutes,
        rationale: entry.rationale,
        checklist: entry.checklist,
        requiresPhoto: entry.requiresPhoto,
        photoTitle: entry.photoTitle,
        photoHint: entry.photoHint,
      });
    });

    const checkpoints: BlueprintCheckpoint[] = (data.checkpoints ?? [])
      .map((checkpoint) => ({ day: clamp(checkpoint.day, startDay, endDay), label: checkpoint.label }))
      .filter((checkpoint, index, list) => list.findIndex((other) => other.day === checkpoint.day) === index);

    nodes.push({
      index: data.index,
      title: data.title,
      objective: data.objective,
      startDay,
      endDay,
      rangeLabel: "",
      items,
      checkpoints,
      successCriteria: data.successCriteria,
      tone: "primary",
    });
  });
  if (!Array.isArray(plan.nodes) && plan.nodes !== undefined) {
    problems.push("plan.nodes phải là một mảng.");
  }
  if (nodeCount === 0) problems.push("plan.nodes không có giai đoạn nào dùng được (cần 6-10).");

  const supplies: BlueprintSupply[] = [];
  (Array.isArray(plan.supplies) ? plan.supplies : []).forEach((candidate, position) => {
    const supply = supplySchema.safeParse(candidate);
    if (!supply.success) {
      problems.push(`supplies[${position}]: ${zodIssues(supply.error)} — bị bỏ.`);
      return;
    }
    const buyByDay = clamp(supply.data.buyByDay, 1, constraints.totalDays);
    if (buyByDay !== supply.data.buyByDay) repairs.push(`vật tư "${supply.data.name}" mua trước ngày ${buyByDay}`);
    supplies.push({
      name: supply.data.name,
      spec: supply.data.spec,
      priceVnd: Math.max(0, supply.data.priceVnd),
      buyByDay,
      urgency: buyByDay <= 3 ? "now" : buyByDay <= 10 ? "soon" : "later",
      priceSource: "ai_estimate",
    });
  });
  if (!Array.isArray(plan.supplies) && plan.supplies !== undefined) problems.push("plan.supplies phải là một mảng.");

  const risks: BlueprintRisk[] = [];
  (Array.isArray(plan.risks) ? plan.risks : []).forEach((candidate, position) => {
    const risk = riskSchema.safeParse(candidate);
    if (!risk.success) {
      problems.push(`risks[${position}]: ${zodIssues(risk.error)} — bị bỏ.`);
      return;
    }
    const icon = safeIcon(risk.data.icon, risk.data.tone === "danger" ? "warning" : "tips_and_updates");
    if (icon !== risk.data.icon) repairs.push(`rủi ro "${risk.data.title}" dùng icon không hợp lệ, đã đổi thành ${icon}`);
    risks.push({ icon, title: risk.data.title, body: risk.data.body, tone: risk.data.tone });
  });
  if (!Array.isArray(plan.risks) && plan.risks !== undefined) problems.push("plan.risks phải là một mảng.");

  const devices: BlueprintDevice[] = [];
  (Array.isArray(plan.devices) ? plan.devices : []).forEach((candidate, position) => {
    const device = deviceSchema.safeParse(candidate);
    if (!device.success) {
      problems.push(`devices[${position}]: ${zodIssues(device.error)} — bị bỏ.`);
      return;
    }
    const icon = safeIcon(device.data.icon, DEVICE_ICON[device.data.kind]);
    if (icon !== device.data.icon) repairs.push(`thiết bị "${device.data.name}" dùng icon không hợp lệ, đã đổi thành ${icon}`);
    devices.push({
      role: device.data.role,
      name: device.data.name,
      detail: device.data.detail,
      icon,
      protocol: device.data.protocol,
      tone: "primary",
      kind: device.data.kind,
    });
  });
  if (!Array.isArray(plan.devices) && plan.devices !== undefined) problems.push("plan.devices phải là một mảng.");

  let meta: PlanCraftMeta | null = null;
  const metaResult = metaSchema.safeParse(plan);
  if (!metaResult.success) {
    problems.push(`plan (danh tính kế hoạch): ${zodIssues(metaResult.error)} — dùng tên mặc định.`);
  } else {
    const parsed = metaResult.data;
    const icon = safeIcon(parsed.icon, "psychiatry");
    if (icon !== parsed.icon) repairs.push(`icon dự án không hợp lệ, đã đổi thành ${icon}`);
    const tags: BlueprintTag[] = parsed.tags.map((tag) => {
      const tagIcon = safeIcon(tag.icon, "check_circle");
      if (tagIcon !== tag.icon) repairs.push(`icon nhãn không hợp lệ, đã đổi thành ${tagIcon}`);
      return { icon: tagIcon, label: tag.label, tone: tag.tone };
    });
    const goldenStart = safeTime(parsed.goldenStart);
    const goldenEnd = safeTime(parsed.goldenEnd);
    if (goldenStart !== parsed.goldenStart || goldenEnd !== parsed.goldenEnd) {
      repairs.push("khung giờ vàng không hợp lệ, đã bỏ");
    }
    meta = {
      name: parsed.name,
      summary: parsed.summary,
      icon,
      tags,
      iotSuggested: parsed.iotSuggested,
      goldenStart,
      goldenEnd,
    };
  }

  return {
    constraints,
    plan: { nodes, supplies, risks, devices, meta },
    repairs,
    problems,
    unusable: false,
  };
}

/**
 * The constraints the plan is built with, in one fixed order of authority:
 * whatever the user set by hand, then what the model proposed, then the
 * defaults.
 */
function resolvedConstraints(
  envelope: PlanCraftEnvelope,
  proposed: z.infer<typeof constraintsSchema> | null,
): PlanCraftConstraints {
  return {
    totalDays: envelope.totalDays ?? proposed?.totalDays ?? FALLBACK_PARAMS.totalDays,
    dailyMinutes: envelope.dailyMinutes ?? proposed?.dailyMinutes ?? FALLBACK_PARAMS.dailyMinutes,
    budgetVnd: envelope.budgetVnd ?? proposed?.budgetVnd ?? FALLBACK_PARAMS.budgetVnd,
    experience: envelope.experience ?? proposed?.experience ?? FALLBACK_PARAMS.experience,
  };
}

const DEVICE_ICON: Record<BlueprintDevice["kind"], string> = {
  gateway: "hub",
  soil_probe: "sensors",
  valve: "valve",
  camera: "photo_camera",
};
