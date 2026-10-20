import { parseBody, route } from "@/server/api";
import { blueprintInputSchema } from "@/lib/blueprint";
import { writeBlueprintId } from "@/server/blueprint-cookie";
import { generateBlueprint, saveBlueprint } from "@/server/services/blueprint";

/** Builds the plan for an idea and remembers it as the plan currently on screen. */
export const POST = route(async ({ req, user }) => {
  const input = await parseBody(req, blueprintInputSchema);
  const { blueprint, constraints } = await generateBlueprint(input);
  const id = await saveBlueprint(user.id, input, blueprint, constraints);
  await writeBlueprintId(id);
  return { id, blueprint, constraints };
});
