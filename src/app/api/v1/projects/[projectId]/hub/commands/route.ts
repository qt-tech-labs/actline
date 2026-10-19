import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { queueValveTest } from "@/server/services/hub-config";

const body = z.object({ kind: z.literal("valve_test") });

export const POST = route<{ projectId: string }>(async ({ req, user, params }) => {
  await parseBody(req, body);
  return queueValveTest(user.id, uuid.parse(params.projectId));
}, 202);
