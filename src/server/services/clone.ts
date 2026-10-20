import "server-only";

import { and, asc, eq, like } from "drizzle-orm";
import { isoDateInTz } from "@/lib/day";
import { db } from "../db";
import { dayPlans, devices, hubs, milestones, projects, projectStages, stepItems, steps, supplies } from "../db/schema";
import { getProjectRow } from "./projects";

/**
 * Starts the next run of a project: the same plan, the same recipe, but a fresh
 * day 1 and the prices the last run actually paid as the new estimates.
 *
 * This is what makes a finished project worth keeping: the second run starts
 * from what really happened, not from what was planned.
 */
export async function cloneProject(userId: string, projectId: string) {
  const source = await getProjectRow(userId, projectId);

  const [stages, plans, sourceSteps, sourceItems, sourceSupplies, sourceMilestones, siblings, sourceDevices] = await Promise.all([
    db.select().from(projectStages).where(eq(projectStages.projectId, projectId)).orderBy(asc(projectStages.startDay)),
    db.select().from(dayPlans).where(eq(dayPlans.projectId, projectId)).orderBy(asc(dayPlans.day)),
    db
      .select({
        id: steps.id,
        planId: dayPlans.id,
        position: steps.position,
        title: steps.title,
        description: steps.description,
        estimatedMinutes: steps.estimatedMinutes,
        requiresPhoto: steps.requiresPhoto,
      })
      .from(steps)
      .innerJoin(dayPlans, eq(steps.dayPlanId, dayPlans.id))
      .where(eq(dayPlans.projectId, projectId))
      .orderBy(asc(steps.position)),
    db
      .select({ stepId: steps.id, position: stepItems.position, label: stepItems.label })
      .from(stepItems)
      .innerJoin(steps, eq(stepItems.stepId, steps.id))
      .innerJoin(dayPlans, eq(steps.dayPlanId, dayPlans.id))
      .where(eq(dayPlans.projectId, projectId))
      .orderBy(asc(stepItems.position)),
    db
      .select({
        planId: dayPlans.id,
        name: supplies.name,
        icon: supplies.icon,
        quantity: supplies.quantity,
        unitPriceVnd: supplies.unitPriceVnd,
        actualPriceVnd: supplies.actualPriceVnd,
        buyByDay: supplies.buyByDay,
      })
      .from(supplies)
      .innerJoin(dayPlans, eq(supplies.dayPlanId, dayPlans.id))
      .where(eq(dayPlans.projectId, projectId))
      .orderBy(asc(supplies.name)),
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.day)),
    db.select({ name: projects.name }).from(projects).where(and(eq(projects.userId, userId), like(projects.name, `${source.name} %`))),
    db.select().from(devices).innerJoin(hubs, eq(devices.hubId, hubs.id)).where(eq(hubs.projectId, projectId)),
  ]);

  const run = siblings.length + 1;
  const name = `${source.name} · Lần ${run}`;

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        userId,
        name,
        icon: source.icon,
        startDate: isoDateInTz(new Date()),
        totalDays: source.totalDays,
        iotEnabled: source.iotEnabled,
        budgetVnd: source.budgetVnd,
        expectedRevenueVnd: source.expectedRevenueVnd,
      })
      .returning();
    if (!project) throw new Error("project insert failed");
    const newProjectId = project.id;

    if (stages.length > 0) {
      await tx.insert(projectStages).values(
        stages.map((stage) => ({ projectId: newProjectId, name: stage.name, startDay: stage.startDay, endDay: stage.endDay })),
      );
    }

    const planIds = new Map<string, string>();
    for (const plan of plans) {
      const [created] = await tx
        .insert(dayPlans)
        .values({
          projectId: newProjectId,
          day: plan.day,
          title: plan.title,
          summary: plan.summary,
          goldenStart: plan.goldenStart,
          goldenEnd: plan.goldenEnd,
        })
        .returning({ id: dayPlans.id });
      if (created) planIds.set(plan.id, created.id);
    }

    const stepIds = new Map<string, string>();
    for (const row of sourceSteps) {
      const planId = planIds.get(row.planId);
      if (!planId) continue;
      const [created] = await tx
        .insert(steps)
        .values({
          dayPlanId: planId,
          position: row.position,
          title: row.title,
          description: row.description,
          estimatedMinutes: row.estimatedMinutes,
          requiresPhoto: row.requiresPhoto,
          status: "todo",
        })
        .returning({ id: steps.id });
      if (created) stepIds.set(row.id, created.id);
    }

    const checklist = sourceItems.flatMap((row) => {
      const stepId = stepIds.get(row.stepId);
      if (!stepId) return [];
      return [{ stepId, position: row.position, label: row.label, done: false }];
    });
    if (checklist.length > 0) await tx.insert(stepItems).values(checklist);

    // The prices the last run really paid become the estimates of this one.
    const newSupplies = sourceSupplies.flatMap((row) => {
      const planId = planIds.get(row.planId);
      if (!planId) return [];
      const estimate = row.actualPriceVnd ?? row.unitPriceVnd;
      return [
        {
          dayPlanId: planId,
          name: row.name,
          icon: row.icon,
          quantity: row.quantity,
          available: false,
          unitPriceVnd: estimate,
          actualPriceVnd: null,
          buyByDay: row.buyByDay,
          boughtDay: null,
        },
      ];
    });
    if (newSupplies.length > 0) await tx.insert(supplies).values(newSupplies);

    if (sourceMilestones.length > 0) {
      await tx.insert(milestones).values(
        sourceMilestones.map((milestone) => ({
          projectId: newProjectId,
          day: milestone.day,
          label: milestone.label,
          title: milestone.title,
          icon: milestone.icon,
          kind: milestone.kind,
          isMinor: milestone.isMinor,
        })),
      );
    }

    if (source.iotEnabled) {
      const [hub] = await tx.insert(hubs).values({ projectId: newProjectId, name: "Hub v2", online: false }).returning();
      if (hub && sourceDevices.length > 0) {
        await tx.insert(devices).values(
          sourceDevices.map((device) => ({ hubId: hub.id, kind: device.devices.kind, name: device.devices.name, status: "offline" as const })),
        );
      }
    }

    return { id: newProjectId, name, totalDays: project.totalDays };
  });
}
