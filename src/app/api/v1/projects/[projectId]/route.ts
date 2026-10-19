import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { setProjectIot } from "@/server/services/mutations";

const body = z.object({ iotEnabled: z.boolean() });

export const PATCH = route<{ projectId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return setProjectIot(user.id, uuid.parse(params.projectId), input.iotEnabled);
});
