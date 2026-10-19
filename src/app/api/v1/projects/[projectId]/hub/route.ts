import { hubSettingsSchema } from "@/lib/hub-config";
import { parseBody, route, uuid } from "@/server/api";
import { getHubSettings, updateHubSettings } from "@/server/services/hub-config";

type Params = { projectId: string };

export const GET = route<Params>(({ user, params }) => getHubSettings(user.id, uuid.parse(params.projectId)));

export const PATCH = route<Params>(async ({ req, user, params }) => {
  const input = await parseBody(req, hubSettingsSchema);
  return updateHubSettings(user.id, uuid.parse(params.projectId), input);
});
