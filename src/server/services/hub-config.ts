import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "../auth";
import { db } from "../db";
import { hubCommands, hubs, projects, sensorReadings } from "../db/schema";
import {
  type HubCommandDto,
  type HubPingDto,
  type HubSettingsDto,
  type HubSettingsInput,
  type SensorMetricName,
  maskCameraUrl,
  unmaskCameraUrl,
} from "@/lib/hub-config";

/** A hub that has not reported for this long is treated as offline. */
const ONLINE_WINDOW_MS = 120_000;

async function ownedHub(userId: string, projectId: string) {
  const [row] = await db
    .select({ hub: hubs })
    .from(hubs)
    .innerJoin(projects, eq(hubs.projectId, projects.id))
    .where(and(eq(hubs.projectId, projectId), eq(projects.userId, userId), eq(projects.iotEnabled, true)));
  if (!row) throw new NotFoundError("Hub not found");
  return row.hub;
}

function ageSeconds(lastSeenAt: Date | null) {
  return lastSeenAt ? Math.max(0, Math.round((Date.now() - lastSeenAt.getTime()) / 1000)) : null;
}

function isOnline(hub: { online: boolean; lastSeenAt: Date | null }) {
  return hub.online && hub.lastSeenAt != null && Date.now() - hub.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

export async function getHubSettings(userId: string, projectId: string): Promise<HubSettingsDto> {
  const hub = await ownedHub(userId, projectId);
  if (!hub.config) throw new NotFoundError("Hub has not reported its configuration yet");

  const latest = await db
    .selectDistinctOn([sensorReadings.metric], { metric: sensorReadings.metric, value: sensorReadings.value })
    .from(sensorReadings)
    .where(eq(sensorReadings.projectId, projectId))
    .orderBy(sensorReadings.metric, desc(sensorReadings.recordedAt));
  const readings: Partial<Record<SensorMetricName, number>> = {};
  for (const r of latest) readings[r.metric] = r.value;

  return {
    hub: { id: hub.id, name: hub.name, online: isOnline(hub), lastSeenAt: hub.lastSeenAt?.toISOString() ?? null },
    config: { ...hub.config, cameraUrl: maskCameraUrl(hub.config.cameraUrl) },
    readings,
  };
}

export async function updateHubSettings(userId: string, projectId: string, input: HubSettingsInput) {
  const hub = await ownedHub(userId, projectId);
  if (!hub.config) throw new NotFoundError("Hub has not reported its configuration yet");
  const config = {
    ...hub.config,
    telemetryIntervalSec: input.telemetryIntervalSec,
    lightSleepLowBattery: input.lightSleepLowBattery,
    valveWatchdog: input.valveWatchdog,
    mqtt: { ...hub.config.mqtt, ...input.mqtt },
    cameraUrl: unmaskCameraUrl(input.cameraUrl, hub.config.cameraUrl),
  };
  await db.update(hubs).set({ config }).where(eq(hubs.id, hub.id));
  return getHubSettings(userId, projectId);
}

/** Liveness check from the last heartbeat; the web app has no direct route to the device. */
export async function pingHub(userId: string, projectId: string): Promise<HubPingDto> {
  const hub = await ownedHub(userId, projectId);
  return { online: isOnline(hub), ageSeconds: ageSeconds(hub.lastSeenAt) };
}

/** Queues a 5 s valve test. Idempotent while one is already waiting, so double clicks do not stack. */
export async function queueValveTest(userId: string, projectId: string): Promise<HubCommandDto> {
  const hub = await ownedHub(userId, projectId);
  if (!isOnline(hub)) throw new ConflictError("Hub is offline");
  const pending = await db.query.hubCommands.findFirst({
    where: and(eq(hubCommands.hubId, hub.id), eq(hubCommands.kind, "valve_test"), eq(hubCommands.status, "queued")),
  });
  const command =
    pending ??
    (await db.insert(hubCommands).values({ hubId: hub.id, kind: "valve_test", payload: { durationSec: 5 } }).returning())[0]!;
  return { id: command.id, kind: "valve_test", status: "queued" };
}
