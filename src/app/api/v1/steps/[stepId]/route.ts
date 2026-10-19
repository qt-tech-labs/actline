import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { setStepStatus } from "@/server/services/mutations";

const body = z.object({ status: z.enum(["todo", "doing", "done"]) });

export const PATCH = route<{ stepId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return setStepStatus(user.id, uuid.parse(params.stepId), input.status);
});
