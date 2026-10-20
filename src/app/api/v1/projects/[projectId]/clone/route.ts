import { route, uuid } from "@/server/api";
import { cloneProject } from "@/server/services/clone";

/** Starts the next run of this project: the same plan, the prices it really paid. */
export const POST = route<{ projectId: string }>(async ({ user, params }) => cloneProject(user.id, uuid.parse(params.projectId)), 201);
