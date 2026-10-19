import "server-only";
import { eq, sum } from "drizzle-orm";
import { cache } from "react";
import type { FinanceDto } from "@/lib/types";
import { db } from "../db";
import { expenses } from "../db/schema";
import { getProjectRow } from "./projects";

export const getFinance = cache(async (userId: string, projectId: string): Promise<FinanceDto> => {
  const [project, [total]] = await Promise.all([
    getProjectRow(userId, projectId),
    db.select({ total: sum(expenses.amountVnd) }).from(expenses).where(eq(expenses.projectId, projectId)),
  ]);
  return {
    spentVnd: Number(total?.total ?? 0),
    budgetVnd: project.budgetVnd,
    expectedRevenueVnd: project.expectedRevenueVnd,
  };
});
