import { z } from "zod";
import { blueprintInputSchema } from "@/lib/blueprint";
import { parseBody, route } from "@/server/api";
import { createProject, generateTemplateBlueprint, readBlueprint, readCurrentDraft } from "@/server/services/blueprint";
import { listProjects } from "@/server/services/projects";

export const GET = route(({ user }) => listProjects(user.id));

const createBody = blueprintInputSchema.extend({
  /** BOM items the user already owns. */
  ownedSupplies: z.array(z.string().max(200)).max(100).default([]),
  /** The draft to start the project from; defaults to the one on screen. */
  blueprintId: z.uuid().optional(),
});

/** Creates a project from an idea: stages, day plans, action items and the BOM. */
export const POST = route(async ({ req, user }) => {
  const input = await parseBody(req, createBody);
  const blueprint = input.blueprintId
    ? await readBlueprint(user.id, input.blueprintId)
    : ((await readCurrentDraft(user.id))?.blueprint ?? generateTemplateBlueprint(input));
  return createProject(user.id, input, blueprint, input.ownedSupplies);
}, 201);
