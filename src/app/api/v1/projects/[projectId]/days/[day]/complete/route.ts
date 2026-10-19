import { z } from "zod";
import { route, uuid } from "@/server/api";
import { completeDay } from "@/server/services/mutations";

export const POST = route<{ projectId: string; day: string }>(async ({ user, params }) =>
  completeDay(user.id, uuid.parse(params.projectId), z.coerce.number().int().positive().parse(params.day)),
);
