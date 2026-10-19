import "server-only";
import { and, eq } from "drizzle-orm";
import { statusFromItems } from "@/lib/steps";
import { NotFoundError } from "../auth";
import { db } from "../db";
import { automationRules, dayPlans, hubs, incidents, notes, projects, stepItems, steps } from "../db/schema";

/** Ownership-checked lookups: every mutation resolves back to a project owned by `userId`. */
async function ownedStep(userId: string, stepId: string) {
  const [row] = await db
    .select({ step: steps, projectId: dayPlans.projectId })
    .from(steps)
    .innerJoin(dayPlans, eq(steps.dayPlanId, dayPlans.id))
    .innerJoin(projects, eq(dayPlans.projectId, projects.id))
    .where(and(eq(steps.id, stepId), eq(projects.userId, userId)));
  if (!row) throw new NotFoundError("Step not found");
  return row.step;
}

async function assertProject(userId: string, projectId: string) {
  const row = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
    columns: { id: true },
  });
  if (!row) throw new NotFoundError("Project not found");
}

export async function setStepStatus(userId: string, stepId: string, status: "todo" | "doing" | "done") {
  await ownedStep(userId, stepId);
  const [updated] = await db
    .update(steps)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(eq(steps.id, stepId))
    .returning();
  return updated!;
}

/** Toggles a checklist item and derives the parent step status from its items. */
export async function setStepItemDone(userId: string, itemId: string, done: boolean) {
  const [owned] = await db
    .select({ stepId: stepItems.stepId })
    .from(stepItems)
    .innerJoin(steps, eq(stepItems.stepId, steps.id))
    .innerJoin(dayPlans, eq(steps.dayPlanId, dayPlans.id))
    .innerJoin(projects, eq(dayPlans.projectId, projects.id))
    .where(and(eq(stepItems.id, itemId), eq(projects.userId, userId)));
  if (!owned) throw new NotFoundError("Item not found");

  return db.transaction(async (tx) => {
    await tx.update(stepItems).set({ done }).where(eq(stepItems.id, itemId));
    const items = await tx.select({ done: stepItems.done }).from(stepItems).where(eq(stepItems.stepId, owned.stepId));
    
    const status = statusFromItems(items);
    const [step] = await tx
      .update(steps)
      .set({ status, completedAt: status === "done" ? new Date() : null })
      .where(eq(steps.id, owned.stepId))
      .returning();
    return step!;
  });
}

export async function completeDay(userId: string, projectId: string, day: number) {
  await assertProject(userId, projectId);
  const [plan] = await db
    .update(dayPlans)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(dayPlans.projectId, projectId), eq(dayPlans.day, day)))
    .returning();
  if (!plan) throw new NotFoundError("Day plan not found");
  return plan;
}

export async function setRuleEnabled(userId: string, ruleId: string, enabled: boolean) {
  const [owned] = await db
    .select({ id: automationRules.id })
    .from(automationRules)
    .innerJoin(projects, eq(automationRules.projectId, projects.id))
    .where(and(eq(automationRules.id, ruleId), eq(projects.userId, userId)));
  if (!owned) throw new NotFoundError("Rule not found");
  const [rule] = await db.update(automationRules).set({ enabled }).where(eq(automationRules.id, ruleId)).returning();
  return rule!;
}

/** Opt a project in or out of IoT. Hub, device and reading data is kept when disabling so re-enabling restores it. */
export async function setProjectIot(userId: string, projectId: string, iotEnabled: boolean) {
  await assertProject(userId, projectId);
  await db.transaction(async (tx) => {
    await tx.update(projects).set({ iotEnabled }).where(eq(projects.id, projectId));
    if (iotEnabled) await tx.insert(hubs).values({ projectId, name: "Hub" }).onConflictDoNothing({ target: hubs.projectId });
  });
  return { id: projectId, iotEnabled };
}

export async function addNote(userId: string, projectId: string, day: number, body: string) {
  await assertProject(userId, projectId);
  const [note] = await db.insert(notes).values({ projectId, day, body }).returning();
  return note!;
}

export async function reportIncident(userId: string, projectId: string, severity: "low" | "medium" | "high", body: string) {
  await assertProject(userId, projectId);
  const [incident] = await db.insert(incidents).values({ projectId, severity, body }).returning();
  return incident!;
}
