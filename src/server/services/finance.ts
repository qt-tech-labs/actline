import "server-only";

import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { dateOfProjectDay } from "@/lib/day";
import type { ExpenseDto, FinanceDto } from "@/lib/types";
import { db } from "../db";
import { expenses } from "../db/schema";
import { getProjectRow } from "./projects";

/** The money of a project: what went out, what came in, and the result. */
export const getFinance = cache(async (userId: string, projectId: string): Promise<FinanceDto> => {
  const [project, rows] = await Promise.all([
    getProjectRow(userId, projectId),
    db
      .select({
        id: expenses.id,
        day: expenses.day,
        label: expenses.label,
        amountVnd: expenses.amountVnd,
        kind: expenses.kind,
        supplyId: expenses.supplyId,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .where(eq(expenses.projectId, projectId))
      .orderBy(desc(expenses.createdAt)),
  ]);

  const spentVnd = rows.filter((row) => row.kind === "cost").reduce((sum, row) => sum + row.amountVnd, 0);
  const incomeVnd = rows.filter((row) => row.kind === "income").reduce((sum, row) => sum + row.amountVnd, 0);
  const list: ExpenseDto[] = rows.map((row) => ({
    id: row.id,
    day: row.day,
    date: dateOfProjectDay(project.startDate, row.day),
    label: row.label,
    amountVnd: row.amountVnd,
    kind: row.kind,
    supplyId: row.supplyId,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    spentVnd,
    incomeVnd,
    budgetVnd: project.budgetVnd,
    expectedRevenueVnd: project.expectedRevenueVnd,
    profitVnd: incomeVnd + project.expectedRevenueVnd - spentVnd,
    expenses: list,
  };
});
