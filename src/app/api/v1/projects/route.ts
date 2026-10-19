import { route } from "@/server/api";
import { listProjects } from "@/server/services/projects";

export const GET = route(({ user }) => listProjects(user.id));
