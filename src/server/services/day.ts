import "server-only";
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { cache } from "react";
import { hhmm } from "@/lib/format";
import type { DayPlanDto, LookaheadDay } from "@/lib/types";
import { db } from "../db";
import { aiInsights, dayPlans, stepItems, stepPhotos, steps, supplies } from "../db/schema";

export const getDayPlan = cache(async (projectId: string, day: number): Promise<DayPlanDto | null> => {
  const plan = await db.query.dayPlans.findFirst({
    where: and(eq(dayPlans.projectId, projectId), eq(dayPlans.day, day)),
  });
  if (!plan) return null;

  // Independent queries: run in parallel instead of nesting.
  const [stepRows, supplyRows, hint] = await Promise.all([
    db.select().from(steps).where(eq(steps.dayPlanId, plan.id)).orderBy(asc(steps.position)),
    db.select().from(supplies).where(eq(supplies.dayPlanId, plan.id)),
    db.query.aiInsights.findFirst({
      where: and(eq(aiInsights.projectId, projectId), eq(aiInsights.kind, "day"), eq(aiInsights.day, day)),
      orderBy: desc(aiInsights.createdAt),
    }),
  ]);
  const stepIds = stepRows.map((s) => s.id);
  const [items, photos] = stepIds.length
    ? await Promise.all([
        db.select().from(stepItems).where(inArray(stepItems.stepId, stepIds)).orderBy(asc(stepItems.position)),
        db.select().from(stepPhotos).where(inArray(stepPhotos.stepId, stepIds)).orderBy(asc(stepPhotos.createdAt)),
      ])
    : [[], []];

  return {
    id: plan.id,
    day: plan.day,
    title: plan.title,
    summary: plan.summary,
    goldenStart: hhmm(plan.goldenStart),
    goldenEnd: hhmm(plan.goldenEnd),
    completed: plan.status === "completed",
    steps: stepRows.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title,
      description: s.description,
      estimatedMinutes: s.estimatedMinutes,
      status: s.status,
      completedAt: s.completedAt?.toISOString() ?? null,
      clipSeconds: s.clipSeconds,
      hasCameraShortcut: s.hasCameraShortcut,
      requiresPhoto: s.requiresPhoto,
      items: items.filter((i) => i.stepId === s.id).map(({ id, label, done }) => ({ id, label, done })),
      photos: photos
        .filter((p) => p.stepId === s.id)
        .map(({ id, url, filename, isProof }) => ({ id, url, filename, isProof })),
    })),
    supplies: supplyRows.map(({ id, name, icon, quantity, available }) => ({ id, name, icon, quantity, available })),
    aiHint: hint ? { body: hint.body, confidencePct: hint.confidencePct } : null,
  };
});

/** Next `count` planned days after `day`, with the estimated total minutes of each. */
export const getLookahead = cache(async (projectId: string, day: number, count = 2): Promise<LookaheadDay[]> => {
  const plans = await db
    .select({ id: dayPlans.id, day: dayPlans.day, title: dayPlans.title })
    .from(dayPlans)
    .where(and(eq(dayPlans.projectId, projectId), gt(dayPlans.day, day)))
    .orderBy(asc(dayPlans.day))
    .limit(count);
  if (!plans.length) return [];
  const stepRows = await db
    .select({ dayPlanId: steps.dayPlanId, minutes: steps.estimatedMinutes })
    .from(steps)
    .where(inArray(steps.dayPlanId, plans.map((p) => p.id)));
  return plans.map((p) => ({
    day: p.day,
    title: p.title,
    estimatedMinutes: stepRows.filter((s) => s.dayPlanId === p.id).reduce((a, s) => a + (s.minutes ?? 0), 0) || null,
  }));
});
