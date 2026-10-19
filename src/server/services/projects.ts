import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { currentProjectDay, isoDateInTz } from "@/lib/day";
import type { ProjectOverview, ProjectSummary } from "@/lib/types";
import { NotFoundError } from "../auth";
import { db } from "../db";
import { projects } from "../db/schema";

type ProjectRow = typeof projects.$inferSelect;

function toSummary(p: ProjectRow): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon,
    totalDays: p.totalDays,
    iotEnabled: p.iotEnabled,
    currentDay: currentProjectDay(p.startDate, p.totalDays),
  };
}

export const listProjects = cache(async (userId: string): Promise<ProjectSummary[]> => {
  const rows = await db.query.projects.findMany({
    where: and(eq(projects.userId, userId), eq(projects.status, "active")),
    orderBy: asc(projects.createdAt),
  });
  return rows.map(toSummary);
});

/** Throws NotFoundError when the project doesn't exist or isn't owned by `userId`. */
export const getProjectRow = cache(async (userId: string, projectId: string): Promise<ProjectRow> => {
  const row = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });
  if (!row) throw new NotFoundError("Project not found");
  return row;
});

/** First active project when `projectId` is omitted/unknown. */
export const resolveProjectId = cache(async (userId: string, requested?: string): Promise<string | null> => {
  const all = await listProjects(userId);
  return all.find((p) => p.id === requested)?.id ?? all[0]?.id ?? null;
});

export const getProjectOverview = cache(async (userId: string, projectId: string): Promise<ProjectOverview> => {
  const [row, stages] = await Promise.all([
    getProjectRow(userId, projectId),
    db.query.projectStages.findMany({ where: (s, { eq }) => eq(s.projectId, projectId) }),
  ]);
  const summary = toSummary(row);
  const stage = stages.find((s) => summary.currentDay >= s.startDay && summary.currentDay <= s.endDay);
  return {
    ...summary,
    stageName: stage?.name ?? null,
    progressPct: Math.round((summary.currentDay / row.totalDays) * 100),
    todayIso: isoDateInTz(new Date()),
  };
});
