import { parseBody, route } from "@/server/api";
import { blueprintGenerationSchema } from "@/lib/blueprint";
import { writeBlueprintId } from "@/server/blueprint-cookie";
import { generateBlueprint, mockBlueprint, saveBlueprint } from "@/server/services/blueprint";

/** Builds the plan for an idea and remembers it as the plan currently on screen. */
export const POST = route(async ({ req, user }) => {
  const { provider, mockPlan, ...input } = await parseBody(req, blueprintGenerationSchema);
  const { blueprint, constraints } = mockPlan ? mockBlueprint(input, mockPlan) : await generateBlueprint(input, provider);
  const id = await saveBlueprint(user.id, input, blueprint, constraints);
  await writeBlueprintId(id);
  return { id, blueprint, constraints };
});
