import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { reportIncident } from "@/server/services/mutations";

const body = z.object({
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  body: z.string().trim().min(1).max(2000),
});

export const POST = route<{ projectId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return reportIncident(user.id, uuid.parse(params.projectId), input.severity, input.body);
}, 201);
