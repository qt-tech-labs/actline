/** Serializable DTOs shared by server services, REST API and client components. */

export type SensorMetric =
  | "air_temperature"
  | "air_humidity"
  | "soil_moisture"
  | "substrate_ph"
  | "light_intensity";

export type ProjectSummary = {
  id: string;
  name: string;
  icon: string;
  currentDay: number;
  totalDays: number;
  /** Whether the project opted in to IoT (hub, sensors, camera, automation). */
  iotEnabled: boolean;
};

export type ProjectOverview = ProjectSummary & {
  stageName: string | null;
  progressPct: number;
  /** ISO date (yyyy-mm-dd) of the current project day in the project timezone. */
  todayIso: string;
  /** The project's first day (yyyy-mm-dd): day N is this date plus N-1 days. */
  startDate: string;
};

export type TimelineNode = {
  day: number;
  label: string;
  title: string;
  icon: string | null;
  kind: "standard" | "shopping" | "target";
  isMinor: boolean;
  state: "done" | "today" | "upcoming";
  /** Calendar date of the node (yyyy-mm-dd). */
  date: string;
};

export type Timeline = {
  nodes: TimelineNode[];
  /** 0-100: how far the solid progress track extends. */
  progressPct: number;
};

export type MetricCard = {
  metric: SensorMetric;
  value: number;
  min: number;
  max: number;
  avg: number;
  status: "ok" | "low" | "high";
  /** Oldest to newest. */
  series: number[];
  /** ISO time of the newest stored reading; null when the metric has no data. */
  lastReadingAt: string | null;
};

export type StepItemDto = { id: string; label: string; done: boolean };
export type StepPhotoDto = { id: string; url: string; filename: string; isProof: boolean };

export type StepDto = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
  status: "todo" | "doing" | "done";
  completedAt: string | null;
  clipSeconds: number | null;
  hasCameraShortcut: boolean;
  requiresPhoto: boolean;
  items: StepItemDto[];
  photos: StepPhotoDto[];
};

export type SupplyDto = {
  id: string;
  name: string;
  icon: string;
  quantity: string;
  available: boolean;
  /** Planned unit price in VND, when the project tracks costs. */
  unitPriceVnd: number | null;
  /** Project day the item should be bought by. */
  buyByDay: number | null;
};

/** One line of the purchase log: a planned item and what it really cost. */
export type PurchaseDto = {
  id: string;
  name: string;
  spec: string;
  icon: string;
  quantity: string;
  /** What the plan estimated. */
  estimatedPriceVnd: number | null;
  /** What was actually paid. */
  actualPriceVnd: number | null;
  /** The day the item should be bought by. */
  buyByDay: number | null;
  /** The day it was actually bought. */
  boughtDay: number | null;
  bought: boolean;
};

/** The whole purchase list of a project, with the totals. */
export type PurchaseLog = {
  items: PurchaseDto[];
  /** Sum of the planned prices. */
  estimatedTotalVnd: number;
  /** Sum of what was actually paid. */
  actualTotalVnd: number;
  /** How many items are still to buy. */
  pendingCount: number;
};

/** One entry of the money log. */
export type ExpenseDto = {
  id: string;
  day: number;
  label: string;
  amountVnd: number;
  kind: "cost" | "income";
  /** The planned item this money was spent on, when there is one. */
  supplyId: string | null;
  createdAt: string;
};

export type DayPlanDto = {
  id: string;
  day: number;
  title: string;
  summary: string;
  goldenStart: string | null;
  goldenEnd: string | null;
  completed: boolean;
  steps: StepDto[];
  supplies: SupplyDto[];
  aiHint: { body: string; confidencePct: number | null } | null;
};

export type LookaheadDay = { day: number; title: string; estimatedMinutes: number | null };

export type DeviceDto = {
  id: string;
  kind: "gateway" | "soil_probe" | "valve" | "camera";
  name: string;
  status: "ok" | "warning" | "offline";
  displayValue: string | null;
};

export type CameraDto = {
  id: string;
  label: string;
  resolution: string;
  fps: number;
  imageUrl: string;
  insight: string | null;
  /** ISO time of the snapshot the insight was taken from. */
  insightAt: string | null;
};

export type HardwareDto = {
  hub: { name: string; location: string | null; batteryPct: number | null; online: boolean; lastSeenAt: string | null } | null;
  devices: DeviceDto[];
  camera: CameraDto | null;
};

export type FinanceDto = {
  spentVnd: number;
  /** Money in (harvest, salary, …). */
  incomeVnd: number;
  budgetVnd: number;
  expectedRevenueVnd: number;
  /** income − spent. */
  profitVnd: number;
  /** The money log, newest first. */
  expenses: ExpenseDto[];
};

export type AutomationRuleDto = { id: string; name: string; condition: string; enabled: boolean };

/* ------------------------------------------------------------------ *
 * New-project blueprint (AI idea -> actionable plan)
 *
 * The plan is a tree: a blueprint holds NODES (a group of work with a
 * time range and an objective), and every node holds ITEMS (one concrete
 * action item pinned to a day). A day may legitimately have no item —
 * the app shows the node's objective and offers an "add" button.
 * ------------------------------------------------------------------ */

export type BlueprintExperience = "beginner" | "basic" | "pro";

/**
 * The knobs the user can turn before the plan is synthesised.
 * `null` means "the AI decides" — a three-month renovation is not a 30-day job,
 * so the right values depend on the topic.
 */
export type BlueprintParams = {
  /** Target length of the whole project in days. */
  totalDays: number | null;
  /** Minutes the user can spend per day. */
  dailyMinutes: number | null;
  /** Maximum budget in VND. */
  budgetVnd: number | null;
  experience: BlueprintExperience | null;
};

/** The knobs with the values a plan is actually built with: never null. */
export type BlueprintConstraints = {
  totalDays: number;
  dailyMinutes: number;
  budgetVnd: number;
  experience: BlueprintExperience;
};

/** Everything the engine needs to build a plan. */
export type BlueprintInput = BlueprintParams & {
  prompt: string;
  /** Explicit user choice about IoT; `null` means "follow the engine suggestion". */
  iotEnabled: boolean | null;
};

export type BlueprintTag = {
  icon: string;
  label: string;
  tone: "primary" | "secondary" | "tertiary";
};

/** One action item, pinned to a project day. */
export type BlueprintItem = {
  id: string;
  /** Project day the item belongs to. */
  day: number;
  title: string;
  description: string;
  minutes: number;
  /** Why this item matters (the "rationale" tray). */
  rationale: string | null;
  /** Checklist of micro-steps. */
  checklist: string[];
  requiresPhoto: boolean;
  photoTitle: string | null;
  photoHint: string | null;
};

/** A checkpoint inside a node: something to look at on a given day. */
export type BlueprintCheckpoint = {
  day: number;
  label: string;
};

/** A node of the plan: a group of work with a time range and an objective. */
export type BlueprintNode = {
  index: number;
  title: string;
  /** What this range of days achieves. */
  objective: string;
  startDay: number;
  endDay: number;
  /** "N01 → N07" */
  rangeLabel: string;
  items: BlueprintItem[];
  checkpoints: BlueprintCheckpoint[];
  /** How the user knows the node is done. */
  successCriteria: string | null;
  tone: "primary" | "secondary";
};

export type BlueprintSupply = {
  name: string;
  spec: string;
  priceVnd: number;
  /** Project day the item has to be bought by. */
  buyByDay: number;
  urgency: "now" | "soon" | "later";
  /** "ai_estimate" until the user corrects the price by hand. */
  priceSource: "ai_estimate" | "user";
};

export type BlueprintRisk = {
  icon: string;
  title: string;
  body: string;
  tone: "warning" | "danger";
};

export type BlueprintDevice = {
  /** Short role code shown above the device name (GATEWAY, VI KHÍ HẬU…). */
  role: string;
  name: string;
  detail: string;
  icon: string;
  /** Bus / protocol label (I2C, ADC, 12V DC). */
  protocol: string;
  tone: "primary" | "secondary";
  /** Which device family this maps to when the project is created. */
  kind: "gateway" | "soil_probe" | "valve" | "camera";
};

export type Blueprint = {
  version: string;
  /** Project name proposed by the engine. */
  name: string;
  summary: string;
  icon: string;
  /** Best time window of the first day ("07:00"), when the plan defines one. */
  goldenStart: string | null;
  goldenEnd: string | null;
  tags: BlueprintTag[];
  totalDays: number;
  /** Number of nodes the plan is split into. */
  nodeCount: number;
  /** What the plan costs once it was scaled to fit the budget. */
  totalPackageVnd: number;
  /** What the plan cost before scaling — the honest estimate. */
  estimatedTotalVnd: number;
  /** Difference between the user budget and the estimate (negative = over budget). */
  budgetDeltaVnd: number;
  budgetVnd: number;
  /** "~35-45 phút / ngày" */
  rhythmLabel: string;
  dailyMinutes: number;
  nodes: BlueprintNode[];
  devices: BlueprintDevice[];
  supplies: BlueprintSupply[];
  suppliesSubtotalVnd: number;
  contingencyVnd: number;
  risks: BlueprintRisk[];
  /** Number of quality checkpoints across the whole plan. */
  checkpointCount: number;
  /** True when the engine suggests IoT for this kind of project (FR-9.2). */
  iotSuggested: boolean;
  /** Which engine produced the plan. */
  engine: "ai" | "template";
  /** Model that produced the plan, null for the template engine. */
  model: string | null;
  /** ISO timestamp of the generation. */
  generatedAt: string;
};
