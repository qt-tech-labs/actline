import { and, eq } from "drizzle-orm";
import { parseBody, route, uuid } from "@/server/api";
import { blueprintOpsSchema } from "@/lib/plan-ops";
import { clearBlueprintId } from "@/server/blueprint-cookie";
import { db } from "@/server/db";
import { blueprints } from "@/server/db/schema";
import { readBlueprint, saveBlueprintOps } from "@/server/services/blueprint";

/** The plan currently being shaped. */
export const GET = route<{ id: string }>(async ({ user, params }) => readBlueprint(user.id, uuid.parse(params.id)));

/** Hand edits on the plan: add, edit or remove nodes, action items and supplies. */
export const PATCH = route<{ id: string }>(async ({ req, user, params }) => {
  const { ops } = await parseBody(req, blueprintOpsSchema);
  return saveBlueprintOps(user.id, uuid.parse(params.id), ops);
});

/** Throws the draft away: the studio starts fresh. */
export const DELETE = route<{ id: string }>(async ({ user, params }) => {
  const id = uuid.parse(params.id);
  await db.delete(blueprints).where(and(eq(blueprints.id, id), eq(blueprints.userId, user.id)));
  await clearBlueprintId();
  return { deleted: true };
});
