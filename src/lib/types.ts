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
};

export type TimelineNode = {
  day: number;
  label: string;
  title: string;
  icon: string | null;
  kind: "standard" | "shopping" | "target";
  isMinor: boolean;
  state: "done" | "today" | "upcoming";
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

export type SupplyDto = { id: string; name: string; icon: string; quantity: string; available: boolean };

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
};

export type HardwareDto = {
  hub: { name: string; location: string | null; batteryPct: number | null; online: boolean; lastSeenAt: string | null } | null;
  devices: DeviceDto[];
  camera: CameraDto | null;
};

export type FinanceDto = {
  spentVnd: number;
  budgetVnd: number;
  expectedRevenueVnd: number;
};

export type AutomationRuleDto = { id: string; name: string; condition: string; enabled: boolean };
