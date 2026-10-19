import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ConflictError, getCurrentUser, NotFoundError, UnauthorizedError } from "./auth";

type Ctx<P> = { params: Promise<P> };
type User = Awaited<ReturnType<typeof getCurrentUser>>;

/**
 * Wraps a route handler: resolves the user, maps domain errors to JSON problem responses.
 * Response envelope: `{ data }` on success, `{ error: { code, message } }` on failure.
 */
export function route<P = Record<string, never>>(
  handler: (args: { req: Request; params: P; user: User }) => Promise<unknown>,
  successStatus = 200,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const user = await getCurrentUser();
      const data = await handler({ req, params: await ctx.params, user });
      return NextResponse.json({ data }, { status: successStatus });
    } catch (e) {
      if (e instanceof UnauthorizedError) return fail(401, "unauthorized", e.message);
      if (e instanceof NotFoundError) return fail(404, "not_found", e.message);
      if (e instanceof ConflictError) return fail(409, "conflict", e.message);
      if (e instanceof z.ZodError) return fail(422, "validation_failed", z.prettifyError(e));
      if (e instanceof SyntaxError) return fail(400, "invalid_json", "Request body must be valid JSON");
      console.error(e);
      return fail(500, "internal", "Unexpected error");
    }
  };
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  return schema.parse(await req.json());
}

export const uuid = z.uuid();
