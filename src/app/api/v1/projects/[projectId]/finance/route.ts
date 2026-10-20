import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { updateFinance } from "@/server/services/mutations";

const body = z.object({
  budgetVnd: z.number().int().min(0).max(1_000_000_000).optional(),
  expectedRevenueVnd: z.number().int().min(0).max(1_000_000_000).optional(),
});

/** Adjusts the budget or the expected revenue. */
export const PATCH = route<{ projectId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return updateFinance(user.id, uuid.parse(params.projectId), input);
});
