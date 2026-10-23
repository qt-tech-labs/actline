import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { dateOfProjectDay } from "@/lib/day";
import type { Timeline } from "@/lib/types";
import { db } from "../db";
import { dayPlans, milestones, projectStages } from "../db/schema";
import { getProjectOverview, getProjectRow } from "./projects";

export const getTimeline = cache(async (userId: string, projectId: string): Promise<Timeline> => {
  const [overview, rows, project, stages, openDays] = await Promise.all([
    getProjectOverview(userId, projectId),
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.day)),
    getProjectRow(userId, projectId),
    db.select().from(projectStages).where(eq(projectStages.projectId, projectId)).orderBy(asc(projectStages.startDay)),
    db.select({ day: dayPlans.day }).from(dayPlans).where(and(eq(dayPlans.projectId, projectId), eq(dayPlans.status, "pending"))),
  ]);
  const pending = new Set(openDays.map((d) => d.day));
  const today = overview.currentDay;
  const nodes = rows.map((m) => ({
    day: m.day,
    label: m.label,
    title: m.title,
    icon: m.icon,
    kind: m.kind,
    isMinor: m.isMinor,
    state: m.day < today ? ("done" as const) : m.day === today ? ("today" as const) : ("upcoming" as const),
    missed: m.day < today && pending.has(m.day),
    date: dateOfProjectDay(project.startDate, m.day),
  }));
  const todayIdx = nodes.findIndex((n) => n.state === "today");
  const progressPct = nodes.length > 1 && todayIdx >= 0 ? (todayIdx / (nodes.length - 1)) * 100 : 0;
  return {
    nodes,
    progressPct,
    phases: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      startDay: stage.startDay,
      endDay: stage.endDay,
    })),
  };
});
