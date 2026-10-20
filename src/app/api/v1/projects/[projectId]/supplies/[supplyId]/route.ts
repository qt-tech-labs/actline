import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { removeSupply, updateSupply } from "@/server/services/mutations";

const body = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  estimatedPriceVnd: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  actualPriceVnd: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  buyByDay: z.number().int().min(1).max(365).nullable().optional(),
  bought: z.boolean().optional(),
  boughtDay: z.number().int().min(1).max(365).nullable().optional(),
});

/** Edits a purchase: the price, the day, or whether it was bought. */
export const PATCH = route<{ projectId: string; supplyId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return updateSupply(user.id, uuid.parse(params.supplyId), input);
});

/** Removes a purchase from the list. */
export const DELETE = route<{ projectId: string; supplyId: string }>(async ({ user, params }) =>
  removeSupply(user.id, uuid.parse(params.supplyId)),
);
