import "server-only";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { cache } from "react";
import { METRIC_ORDER } from "@/lib/metrics";
import type { MetricCard } from "@/lib/types";
import { db } from "../db";
import { projects, sensorReadings, sensorTargets } from "../db/schema";

const MAX_POINTS = 48;

export const getMetricCards = cache(async (projectId: string): Promise<MetricCard[]> => {
  const [project, targets, readings] = await Promise.all([
    db.query.projects.findFirst({ where: eq(projects.id, projectId), columns: { startDate: true } }),
    db.select().from(sensorTargets).where(eq(sensorTargets.projectId, projectId)),
    db
      .select({ metric: sensorReadings.metric, value: sensorReadings.value, at: sensorReadings.recordedAt })
      .from(sensorReadings)
      .where(and(eq(sensorReadings.projectId, projectId), gte(sensorReadings.recordedAt, sql`now() - interval '45 days'`)))
      .orderBy(asc(sensorReadings.recordedAt)),
  ]);
  if (!project) return [];

  const byMetric = new Map<string, number[]>();
  for (const r of readings) {
    const list = byMetric.get(r.metric);
    if (list) list.push(r.value);
    else byMetric.set(r.metric, [r.value]);
  }
  const targetByMetric = new Map(targets.map((t) => [t.metric, t]));

  return METRIC_ORDER.flatMap((metric): MetricCard[] => {
    const values = byMetric.get(metric);
    const target = targetByMetric.get(metric);
    if (!values?.length || !target) return [];
    const value = values[values.length - 1]!;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const status = value < target.min ? "low" : value > target.max ? "high" : "ok";
    // Downsample long histories so the payload sent to the client stays small.
    const stride = Math.ceil(values.length / MAX_POINTS);
    const series = stride > 1 ? values.filter((_, i) => (values.length - 1 - i) % stride === 0) : values;
    return [{ metric, value, min: target.min, max: target.max, avg, status, series }];
  });
});
