import "server-only";

import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import type { PurchaseDto, PurchaseLog } from "@/lib/types";
import { db } from "../db";
import { dayPlans, supplies } from "../db/schema";

/**
 * The purchase list of a project: every planned item, what it was estimated at
 * and what it really cost. It is the bill of materials plus the truth.
 */
export const getPurchaseLog = cache(async (userId: string, projectId: string): Promise<PurchaseLog> => {
  const rows = await db
    .select({
      id: supplies.id,
      name: supplies.name,
      icon: supplies.icon,
      quantity: supplies.quantity,
      available: supplies.available,
      unitPriceVnd: supplies.unitPriceVnd,
      actualPriceVnd: supplies.actualPriceVnd,
      buyByDay: supplies.buyByDay,
      boughtDay: supplies.boughtDay,
      day: dayPlans.day,
    })
    .from(supplies)
    .innerJoin(dayPlans, eq(supplies.dayPlanId, dayPlans.id))
    .where(eq(dayPlans.projectId, projectId))
    .orderBy(asc(dayPlans.day), asc(supplies.name));

  const items: PurchaseDto[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    spec: "",
    icon: row.icon,
    quantity: row.quantity,
    estimatedPriceVnd: row.unitPriceVnd,
    actualPriceVnd: row.actualPriceVnd,
    buyByDay: row.buyByDay ?? row.day,
    boughtDay: row.boughtDay,
    bought: row.available,
  }));

  const estimatedTotalVnd = items.reduce((sum, item) => sum + (item.estimatedPriceVnd ?? 0), 0);
  const actualTotalVnd = items.reduce((sum, item) => sum + (item.actualPriceVnd ?? 0), 0);

  return {
    items,
    estimatedTotalVnd,
    actualTotalVnd,
    pendingCount: items.filter((item) => !item.bought).length,
  };
});
