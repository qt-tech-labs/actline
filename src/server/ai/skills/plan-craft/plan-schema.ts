import { z } from "zod";
import { EXPERIENCE_LEVELS } from "@/lib/blueprint";

/**
 * The plan document the model answers with.
 *
 * One document, one Zod authority: the JSON the model reads in the prompt is
 * the shape these schemas parse. There is no second schema to keep in sync.
 *
 * The document has two parts:
 * - `constraints` — the knobs the topic implies (days, minutes, budget, level).
 *   The user's hand-set values always win over it.
 * - `plan` — the plan itself: its identity, the nodes and their action items,
 *   the bill of materials, the risks and, when the project earns them, the
 *   predicted IoT devices.
 */

export const constraintsSchema = z.object({
  totalDays: z.number().int().min(7).max(365),
  dailyMinutes: z.number().int().min(10).max(600),
  budgetVnd: z.number().int().min(0).max(1_000_000_000),
  experience: z.enum(EXPERIENCE_LEVELS),
  rationale: z.string().trim().max(400).default(""),
});

export const itemSchema = z.object({
  day: z.number().int().min(1).max(365).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(600).default(""),
  minutes: z.number().int().min(1).max(600).default(15),
  rationale: z.string().trim().max(400).nullable().default(null),
  checklist: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  requiresPhoto: z.boolean().default(false),
  photoTitle: z.string().trim().max(200).nullable().default(null),
  photoHint: z.string().trim().max(300).nullable().default(null),
});

export const nodeSchema = z.object({
  index: z.number().int().min(1).max(20),
  title: z.string().trim().min(1).max(120),
  objective: z.string().trim().max(400).default(""),
  startDay: z.number().int().min(1).max(365),
  endDay: z.number().int().min(1).max(365),
  successCriteria: z.string().trim().max(300).nullable().default(null),
  checkpoints: z
    .array(z.object({ day: z.number().int().min(1).max(365), label: z.string().trim().min(1).max(120) }))
    .max(8)
    .default([]),
  items: z.array(z.unknown()).max(40).default([]),
});

export const supplySchema = z.object({
  name: z.string().trim().min(1).max(120),
  spec: z.string().trim().max(200).default(""),
  priceVnd: z.number().int().min(0).max(1_000_000_000),
  buyByDay: z.number().int().min(1).max(365),
});

export const riskSchema = z.object({
  icon: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(600),
  tone: z.enum(["warning", "danger"]),
});

export const deviceSchema = z.object({
  role: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(300).default(""),
  icon: z.string().trim().min(1).max(60),
  protocol: z.string().trim().max(60).default(""),
  kind: z.enum(["gateway", "soil_probe", "valve", "camera"]),
});

export const metaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(600),
  icon: z.string().trim().min(1).max(60),
  tags: z
    .array(
      z.object({
        icon: z.string().trim().min(1).max(60),
        label: z.string().trim().min(1).max(60),
        tone: z.enum(["primary", "secondary", "tertiary"]),
      }),
    )
    .max(6)
    .default([]),
  iotSuggested: z.boolean().default(false),
  goldenStart: z.string().trim().max(5).nullable().default(null),
  goldenEnd: z.string().trim().max(5).nullable().default(null),
});
