import { z } from "zod";
import { parseBody, route, uuid } from "@/server/api";
import { addNote } from "@/server/services/mutations";

const body = z.object({ day: z.number().int().positive(), body: z.string().trim().min(1).max(2000) });

export const POST = route<{ projectId: string }>(async ({ req, user, params }) => {
  const input = await parseBody(req, body);
  return addNote(user.id, uuid.parse(params.projectId), input.day, input.body);
}, 201);
