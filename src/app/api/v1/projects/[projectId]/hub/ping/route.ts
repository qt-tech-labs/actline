import { route, uuid } from "@/server/api";
import { pingHub } from "@/server/services/hub-config";

export const POST = route<{ projectId: string }>(({ user, params }) => pingHub(user.id, uuid.parse(params.projectId)));
