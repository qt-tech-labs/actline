import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { dateOfProjectDay } from "@/lib/day";
import type { Timeline } from "@/lib/types";
import { db } from "../db";
import { milestones } from "../db/schema";
import { getProjectOverview, getProjectRow } from "./projects";

export const getTimeline = cache(async (userId: string, projectId: string): Promise<Timeline> => {
  const [overview, rows, project] = await Promise.all([
    getProjectOverview(userId, projectId),
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.day)),
    getProjectRow(userId, projectId),
  ]);
  const today = overview.currentDay;
  const nodes = rows.map((m) => ({
    day: m.day,
    label: m.label,
    title: m.title,
    icon: m.icon,
    kind: m.kind,
    isMinor: m.isMinor,
    state: m.day < today ? ("done" as const) : m.day === today ? ("today" as const) : ("upcoming" as const),
    date: dateOfProjectDay(project.startDate, m.day),
  }));
  const todayIdx = nodes.findIndex((n) => n.state === "today");
  const progressPct = nodes.length > 1 && todayIdx >= 0 ? (todayIdx / (nodes.length - 1)) * 100 : 0;
  return { nodes, progressPct };
});
