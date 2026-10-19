import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { cache } from "react";
import type { HardwareDto } from "@/lib/types";
import { db } from "../db";
import { aiInsights, devices, hubs } from "../db/schema";

export const getHardware = cache(async (projectId: string): Promise<HardwareDto> => {
  const [hub, insight] = await Promise.all([
    db.query.hubs.findFirst({ where: eq(hubs.projectId, projectId) }),
    db.query.aiInsights.findFirst({
      where: and(eq(aiInsights.projectId, projectId), eq(aiInsights.kind, "camera")),
      orderBy: desc(aiInsights.createdAt),
    }),
  ]);
  if (!hub) return { hub: null, devices: [], camera: null };

  const rows = await db.select().from(devices).where(eq(devices.hubId, hub.id));
  const cam = rows.find((d) => d.kind === "camera" && d.meta);
  return {
    hub: {
      name: hub.name,
      location: hub.location,
      batteryPct: hub.batteryPct,
      online: hub.online,
      lastSeenAt: hub.lastSeenAt?.toISOString() ?? null,
    },
    devices: rows
      .filter((d) => d.kind !== "camera")
      .map(({ id, kind, name, status, displayValue }) => ({ id, kind, name, status, displayValue })),
    camera: cam?.meta
      ? { id: cam.id, ...cam.meta, insight: insight?.body ?? null }
      : null,
  };
});
