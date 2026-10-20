import { z } from "zod";
import { route, uuid } from "@/server/api";
import { NotFoundError } from "@/server/auth";
import { getDayPlan } from "@/server/services/day";
import { getProjectRow } from "@/server/services/projects";

/** The plan of one project day: the actions planned for it. */
export const GET = route<{ projectId: string; day: string }>(async ({ user, params }) => {
  const projectId = uuid.parse(params.projectId);
  await getProjectRow(user.id, projectId);
  const day = z.coerce.number().int().min(1).max(365).parse(params.day);
  const plan = await getDayPlan(projectId, day);
  if (!plan) throw new NotFoundError("Day plan not found");
  return plan;
});
