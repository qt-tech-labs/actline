import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { addSupply } from "@/server/services/mutations";
import { getPurchaseLog } from "@/server/services/purchases";

const body = z.object({
  name: z.string().trim().min(1).max(200),
  spec: z.string().trim().max(200).optional(),
  icon: z.string().trim().max(60).optional(),
  estimatedPriceVnd: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  actualPriceVnd: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  buyByDay: z.number().int().min(1).max(365).nullable().optional(),
  bought: z.boolean().optional(),
});

/** The purchase list of a project. */
export const GET = route<{ projectId: string }>(async ({ user, params }) => getPurchaseLog(user.id, uuid.parse(params.projectId)));

/** Adds a purchase the plan did not foresee. */
export const POST = route<{ projectId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return addSupply(user.id, uuid.parse(params.projectId), input);
}, 201);
