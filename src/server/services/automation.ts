import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import type { AutomationRuleDto } from "@/lib/types";
import { db } from "../db";
import { automationRules } from "../db/schema";

export const getAutomationRules = cache(async (projectId: string): Promise<AutomationRuleDto[]> => {
  const rows = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.projectId, projectId))
    .orderBy(asc(automationRules.position));
  return rows.map(({ id, name, condition, enabled }) => ({ id, name, condition, enabled }));
});
