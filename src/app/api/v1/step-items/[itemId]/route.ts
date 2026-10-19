import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { setStepItemDone } from "@/server/services/mutations";

const body = z.object({ done: z.boolean() });

export const PATCH = route<{ itemId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return setStepItemDone(user.id, uuid.parse(params.itemId), input.done);
});
