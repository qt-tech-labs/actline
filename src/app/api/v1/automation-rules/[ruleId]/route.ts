import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { setRuleEnabled } from "@/server/services/mutations";

const body = z.object({ enabled: z.boolean() });

export const PATCH = route<{ ruleId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return setRuleEnabled(user.id, uuid.parse(params.ruleId), input.enabled);
});
