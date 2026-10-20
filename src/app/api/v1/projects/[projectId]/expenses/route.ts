import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { addExpense } from "@/server/services/mutations";
import { getFinance } from "@/server/services/finance";

const body = z.object({
  label: z.string().trim().min(1).max(200),
  amountVnd: z.number().int().min(0).max(1_000_000_000),
  kind: z.enum(["cost", "income"]).default("cost"),
  day: z.number().int().min(1).max(365).optional(),
});

/** The money log of a project. */
export const GET = route<{ projectId: string }>(async ({ user, params }) => getFinance(user.id, uuid.parse(params.projectId)));

/** Records money in or out. */
export const POST = route<{ projectId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return addExpense(user.id, uuid.parse(params.projectId), input);
}, 201);
