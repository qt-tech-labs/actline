import "server-only";

import { and, eq } from "drizzle-orm";
import { currentProjectDay } from "@/lib/day";
import { statusFromItems } from "@/lib/steps";
import { ConflictError, NotFoundError } from "../auth";
import { db } from "../db";
import { automationRules, dayPlans, expenses, hubs, incidents, notes, projects, stepItems, steps, supplies } from "../db/schema";
import { getProjectRow, viewerTimezone } from "./projects";
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

/**
 * Marks a project day as done. Every action item of that day has to be finished
 * first — a day is only "done" when its work actually is.
 */
export async function completeDay(userId: string, projectId: string, day: number) {
  await assertProject(userId, projectId);
  const [plan] = await db
    .select({ id: dayPlans.id })
    .from(dayPlans)
    .where(and(eq(dayPlans.projectId, projectId), eq(dayPlans.day, day)))
    .limit(1);
  if (!plan) throw new NotFoundError("Day plan not found");

  const daySteps = await db.select({ status: steps.status }).from(steps).where(eq(steps.dayPlanId, plan.id));
  const open = daySteps.filter((step) => step.status !== "done").length;
  if (open > 0) {
    throw new ConflictError(`Còn ${open} hạng mục chưa hoàn thành. Hoàn tất hết rồi hãy đánh dấu ngày này là xong.`);
  }

  const [completed] = await db
    .update(dayPlans)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(dayPlans.id, plan.id))
    .returning();
  return completed!;
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

/* ------------------------------------------------------------------ *
 * Purchases and money
 *
 * The purchase list is the plan's bill of materials; the money log is what
 * actually left the pocket. Marking a planned item as bought writes the
 * expense, so the two never drift apart.
 * ------------------------------------------------------------------ */

/** Ownership-checked lookup of a planned item through its day plan. */
async function ownedSupply(userId: string, supplyId: string) {
  const [row] = await db
    .select({ supply: supplies, projectId: dayPlans.projectId, day: dayPlans.day })
    .from(supplies)
    .innerJoin(dayPlans, eq(supplies.dayPlanId, dayPlans.id))
    .innerJoin(projects, eq(dayPlans.projectId, projects.id))
    .where(and(eq(supplies.id, supplyId), eq(projects.userId, userId)));
  if (!row) throw new NotFoundError("Purchase not found");
  return row;
}

/** The day plan a purchase hangs on; created on the fly when the day has none. */
async function dayPlanFor(userId: string, projectId: string, day: number) {
  await assertProject(userId, projectId);
  const [existing] = await db
    .select()
    .from(dayPlans)
    .where(and(eq(dayPlans.projectId, projectId), eq(dayPlans.day, day)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(dayPlans)
    .values({ projectId, day, title: `Ngày ${day}`, summary: "Không có kế hoạch chi tiết cho ngày này." })
    .returning();
  return created!;
}

/** Adds a purchase to the list — the plan may not have foreseen it. */
export async function addSupply(
  userId: string,
  projectId: string,
  input: { name: string; spec?: string; icon?: string; estimatedPriceVnd?: number | null; actualPriceVnd?: number | null; buyByDay?: number | null; bought?: boolean },
) {
  const plan = await dayPlanFor(userId, projectId, input.buyByDay ?? 1);
  const [supply] = await db
    .insert(supplies)
    .values({
      dayPlanId: plan.id,
      name: input.name,
      icon: input.icon ?? "shopping_basket",
      quantity: "x1",
      available: input.bought ?? false,
      unitPriceVnd: input.estimatedPriceVnd ?? null,
      actualPriceVnd: input.actualPriceVnd ?? null,
      buyByDay: input.buyByDay ?? plan.day,
      boughtDay: input.bought ? (input.buyByDay ?? plan.day) : null,
    })
    .returning();
  if (!supply) throw new Error("supply insert failed");

  if (input.bought) {
    await db.insert(expenses).values({
      projectId,
      day: supply.boughtDay ?? plan.day,
      label: supply.name,
      amountVnd: input.actualPriceVnd ?? input.estimatedPriceVnd ?? 0,
      kind: "cost",
      supplyId: supply.id,
    });
  }
  return supply;
}

/** Edits a purchase: the price, the day, or whether it was bought. */
export async function updateSupply(
  userId: string,
  supplyId: string,
  patch: { name?: string; spec?: string; estimatedPriceVnd?: number | null; actualPriceVnd?: number | null; buyByDay?: number | null; bought?: boolean; boughtDay?: number | null },
) {
  const { supply, projectId, day } = await ownedSupply(userId, supplyId);

  return db.transaction(async (tx) => {
    const bought = patch.bought ?? supply.available;
    const boughtDay = bought ? (patch.boughtDay ?? supply.boughtDay ?? day) : null;
    const actualPriceVnd = bought ? (patch.actualPriceVnd ?? supply.actualPriceVnd ?? null) : null;

    const [updated] = await tx
      .update(supplies)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.estimatedPriceVnd !== undefined ? { unitPriceVnd: patch.estimatedPriceVnd } : {}),
        ...(patch.actualPriceVnd !== undefined ? { actualPriceVnd } : {}),
        ...(patch.buyByDay !== undefined ? { buyByDay: patch.buyByDay } : {}),
        available: bought,
        boughtDay,
      })
      .where(eq(supplies.id, supplyId))
      .returning();

    // Buying an item writes the money; un-buying it takes the money back.
    if (bought && !supply.available) {
      await tx.insert(expenses).values({
        projectId,
        day: boughtDay ?? day,
        label: updated?.name ?? supply.name,
        amountVnd: actualPriceVnd ?? supply.unitPriceVnd ?? 0,
        kind: "cost",
        supplyId,
      });
    } else if (!bought && supply.available) {
      await tx.delete(expenses).where(eq(expenses.supplyId, supplyId));
    } else if (bought) {
      await tx.update(expenses).set({ amountVnd: actualPriceVnd ?? supply.unitPriceVnd ?? 0, label: updated?.name ?? supply.name }).where(eq(expenses.supplyId, supplyId));
    }

    return updated!;
  });
}

/** Removes a purchase from the list; the money it produced stays in the log. */
export async function removeSupply(userId: string, supplyId: string) {
  const { supply } = await ownedSupply(userId, supplyId);
  await db.delete(supplies).where(eq(supplies.id, supplyId));
  return { id: supply.id };
}

/** Records money in or out. */
export async function addExpense(
  userId: string,
  projectId: string,
  input: { label: string; amountVnd: number; kind?: "cost" | "income"; day?: number },
) {
  const [project, tz] = await Promise.all([getProjectRow(userId, projectId), viewerTimezone()]);
  // A hand-written entry belongs to the day the user is on, not to day 1.
  const day = input.day ?? currentProjectDay(project.startDate, project.totalDays, new Date(), tz);
  const [expense] = await db
    .insert(expenses)
    .values({
      projectId,
      day,
      label: input.label,
      amountVnd: input.amountVnd,
      kind: input.kind ?? "cost",
    })
    .returning();
  return expense!;
}

/** Removes an entry from the money log. */
export async function removeExpense(userId: string, expenseId: string) {
  const [owned] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .where(and(eq(expenses.id, expenseId), eq(projects.userId, userId)));
  if (!owned) throw new NotFoundError("Expense not found");
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  return { id: expenseId };
}

/** Adjusts the budget or the expected revenue of a project. */
export async function updateFinance(
  userId: string,
  projectId: string,
  patch: { budgetVnd?: number; expectedRevenueVnd?: number },
) {
  await assertProject(userId, projectId);
  const [updated] = await db
    .update(projects)
    .set({
      ...(patch.budgetVnd !== undefined ? { budgetVnd: patch.budgetVnd } : {}),
      ...(patch.expectedRevenueVnd !== undefined ? { expectedRevenueVnd: patch.expectedRevenueVnd } : {}),
    })
    .where(eq(projects.id, projectId))
    .returning();
  return updated!;
}
