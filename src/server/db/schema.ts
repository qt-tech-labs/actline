import { relations, sql } from "drizzle-orm";
import type { HubConfig } from "@/lib/hub-config";
import type { Blueprint, BlueprintParams } from "@/lib/types";
import {
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const projectStatus = pgEnum("project_status", ["active", "paused", "done"]);
export const milestoneKind = pgEnum("milestone_kind", ["standard", "shopping", "target"]);
export const dayStatus = pgEnum("day_status", ["pending", "completed"]);
export const stepStatus = pgEnum("step_status", ["todo", "doing", "done"]);
export const deviceKind = pgEnum("device_kind", ["gateway", "soil_probe", "valve", "camera"]);
export const deviceStatus = pgEnum("device_status", ["ok", "warning", "offline"]);
export const sensorMetric = pgEnum("sensor_metric", [
  "air_temperature",
  "air_humidity",
  "soil_moisture",
  "substrate_ph",
  "light_intensity",
]);
export const insightKind = pgEnum("insight_kind", ["camera", "day"]);
export const hubCommandKind = pgEnum("hub_command_kind", ["valve_test"]);
export const hubCommandStatus = pgEnum("hub_command_status", ["queued", "sent", "done", "failed"]);
export const severity = pgEnum("severity", ["low", "medium", "high"]);
export const expenseKind = pgEnum("expense_kind", ["cost", "income"]);

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: createdAt(),
});

export const projects = pgTable(
  "projects",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Material Symbols icon name. */
    icon: text("icon").notNull().default("psychiatry"),
    status: projectStatus("status").notNull().default("active"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    totalDays: integer("total_days").notNull(),
    /** IoT is an opt-in add-on: hub, sensors and automation only exist for projects that enable it. */
    iotEnabled: boolean("iot_enabled").notNull().default(false),
    budgetVnd: integer("budget_vnd").notNull().default(0),
    expectedRevenueVnd: integer("expected_revenue_vnd").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("projects_user_idx").on(t.userId)],
);

/**
 * A plan the user is still shaping. The AI plan is not reproducible from the input
 * (unlike the template engine), so the generated blueprint is stored as-is until the
 * project is created from it.
 */
export const blueprints = pgTable(
  "blueprints",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    totalDays: integer("total_days").notNull(),
    dailyMinutes: integer("daily_minutes").notNull(),
    budgetVnd: integer("budget_vnd").notNull(),
    experience: text("experience").notNull(),
    /** Explicit IoT choice; null means "follow the plan's suggestion". */
    iotEnabled: boolean("iot_enabled"),
    /** The knobs as the user left them; null means "the AI decides". */
    params: jsonb("params").$type<BlueprintParams>().notNull(),
    /** The whole blueprint DTO, edited by the user before the project is created. */
    payload: jsonb("payload").$type<Blueprint>().notNull(),
    /** Model that produced the plan ("gemini-3.8-flash"), null for the template engine. */
    model: text("model"),
    /** Which engine produced the plan. */
    engine: text("engine").notNull().default("template"),
    /** "ready" once the plan can be previewed and started. */
    status: text("status").notNull().default("ready"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blueprints_user_idx").on(t.userId)],
);

export const projectStages = pgTable(
  "project_stages",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDay: integer("start_day").notNull(),
    endDay: integer("end_day").notNull(),
  },
  (t) => [index("stages_project_idx").on(t.projectId)],
);

export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    /** Short label under the node. */
    label: text("label").notNull(),
    /** Tooltip text. */
    title: text("title").notNull(),
    icon: text("icon"),
    kind: milestoneKind("kind").notNull().default("standard"),
    /** Minor milestones render as small ticks without a label. */
    isMinor: boolean("is_minor").notNull().default(false),
  },
  (t) => [unique("milestones_project_day_uq").on(t.projectId, t.day)],
);

export const dayPlans = pgTable(
  "day_plans",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    goldenStart: time("golden_start"),
    goldenEnd: time("golden_end"),
    status: dayStatus("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [unique("day_plans_project_day_uq").on(t.projectId, t.day)],
);

export const steps = pgTable(
  "steps",
  {
    id: id(),
    dayPlanId: uuid("day_plan_id").notNull().references(() => dayPlans.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    estimatedMinutes: integer("estimated_minutes"),
    status: stepStatus("status").notNull().default("todo"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    clipSeconds: integer("clip_seconds"),
    hasCameraShortcut: boolean("has_camera_shortcut").notNull().default(false),
    requiresPhoto: boolean("requires_photo").notNull().default(false),
  },
  (t) => [unique("steps_plan_position_uq").on(t.dayPlanId, t.position)],
);

export const stepItems = pgTable(
  "step_items",
  {
    id: id(),
    stepId: uuid("step_id").notNull().references(() => steps.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    done: boolean("done").notNull().default(false),
  },
  (t) => [index("step_items_step_idx").on(t.stepId)],
);

export const stepPhotos = pgTable(
  "step_photos",
  {
    id: id(),
    stepId: uuid("step_id").notNull().references(() => steps.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    isProof: boolean("is_proof").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("step_photos_step_idx").on(t.stepId)],
);

export const supplies = pgTable(
  "supplies",
  {
    id: id(),
    dayPlanId: uuid("day_plan_id").notNull().references(() => dayPlans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    quantity: text("quantity").notNull(),
    available: boolean("available").notNull().default(true),
    /** Planned unit price in VND. */
    unitPriceVnd: integer("unit_price_vnd"),
    /** What was actually paid, once the item is bought. */
    actualPriceVnd: integer("actual_price_vnd"),
    /** Project day the item has to be bought by. */
    buyByDay: integer("buy_by_day"),
    /** Project day the item was actually bought. */
    boughtDay: integer("bought_day"),
  },
  (t) => [index("supplies_plan_idx").on(t.dayPlanId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    label: text("label").notNull(),
    amountVnd: integer("amount_vnd").notNull(),
    /** "cost" is money out, "income" is money in. */
    kind: expenseKind("kind").notNull().default("cost"),
    /** The planned item this money was spent on, when there is one. */
    supplyId: uuid("supply_id").references(() => supplies.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("expenses_project_idx").on(t.projectId)],
);

export const hubs = pgTable("hubs", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  name: text("name").notNull(),
  location: text("location"),
  batteryPct: integer("battery_pct"),
  online: boolean("online").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  config: jsonb("config").$type<HubConfig>(),
});

/** Commands queued for the hub to pick up (the web app never talks to the device directly). */
export const hubCommands = pgTable(
  "hub_commands",
  {
    id: id(),
    hubId: uuid("hub_id").notNull().references(() => hubs.id, { onDelete: "cascade" }),
    kind: hubCommandKind("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: hubCommandStatus("status").notNull().default("queued"),
    createdAt: createdAt(),
  },
  (t) => [index("hub_commands_hub_idx").on(t.hubId, t.status)],
);

export type CameraMeta = { label: string; resolution: string; fps: number; imageUrl: string };

export const devices = pgTable(
  "devices",
  {
    id: id(),
    hubId: uuid("hub_id").notNull().references(() => hubs.id, { onDelete: "cascade" }),
    kind: deviceKind("kind").notNull(),
    name: text("name").notNull(),
    status: deviceStatus("status").notNull().default("ok"),
    /** Short value shown on the right of the device row (e.g. "42%", "16:30"). */
    displayValue: text("display_value"),
    meta: jsonb("meta").$type<CameraMeta>(),
  },
  (t) => [index("devices_hub_idx").on(t.hubId)],
);

export const sensorReadings = pgTable(
  "sensor_readings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    metric: sensorMetric("metric").notNull(),
    value: doublePrecision("value").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("readings_project_metric_time_idx").on(t.projectId, t.metric, t.recordedAt)],
);

export const sensorTargets = pgTable(
  "sensor_targets",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    metric: sensorMetric("metric").notNull(),
    min: doublePrecision("min").notNull(),
    max: doublePrecision("max").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.metric] })],
);

export const aiInsights = pgTable(
  "ai_insights",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    kind: insightKind("kind").notNull(),
    day: integer("day"),
    /** Plain text; `**bold**` segments are highlighted by the UI. */
    body: text("body").notNull(),
    confidencePct: integer("confidence_pct"),
    createdAt: createdAt(),
  },
  (t) => [index("insights_project_kind_idx").on(t.projectId, t.kind, t.createdAt)],
);

export const automationRules = pgTable(
  "automation_rules",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    condition: text("condition").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("rules_project_idx").on(t.projectId)],
);

export const notes = pgTable(
  "notes",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("notes_project_day_idx").on(t.projectId, t.day)],
);

export const incidents = pgTable(
  "incidents",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    severity: severity("severity").notNull().default("medium"),
    body: text("body").notNull(),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("incidents_project_idx").on(t.projectId, t.createdAt)],
);

export const projectsRelations = relations(projects, ({ many, one }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  stages: many(projectStages),
  milestones: many(milestones),
  dayPlans: many(dayPlans),
}));

export const dayPlansRelations = relations(dayPlans, ({ one, many }) => ({
  project: one(projects, { fields: [dayPlans.projectId], references: [projects.id] }),
  steps: many(steps),
  supplies: many(supplies),
}));

export const stepsRelations = relations(steps, ({ one, many }) => ({
  dayPlan: one(dayPlans, { fields: [steps.dayPlanId], references: [dayPlans.id] }),
  items: many(stepItems),
  photos: many(stepPhotos),
}));

export const stepItemsRelations = relations(stepItems, ({ one }) => ({
  step: one(steps, { fields: [stepItems.stepId], references: [steps.id] }),
}));

export const stepPhotosRelations = relations(stepPhotos, ({ one }) => ({
  step: one(steps, { fields: [stepPhotos.stepId], references: [steps.id] }),
}));

export const suppliesRelations = relations(supplies, ({ one }) => ({
  dayPlan: one(dayPlans, { fields: [supplies.dayPlanId], references: [dayPlans.id] }),
}));

export const hubsRelations = relations(hubs, ({ many }) => ({ devices: many(devices) }));
export const devicesRelations = relations(devices, ({ one }) => ({
  hub: one(hubs, { fields: [devices.hubId], references: [hubs.id] }),
}));

export const blueprintsRelations = relations(blueprints, ({ one }) => ({
  user: one(users, { fields: [blueprints.userId], references: [users.id] }),
}));
