import "server-only";
import { cache } from "react";
import { db } from "./db";

export class UnauthorizedError extends Error {}
export class NotFoundError extends Error {}
export class ConflictError extends Error {}

/**
 * Single seam for identity. Until real auth exists this resolves the seeded demo user.
 * Replace the body (session cookie / bearer token for mobile) without touching callers.
 */
export const getCurrentUser = cache(async () => {
  const email = process.env.DEMO_USER_EMAIL ?? "demo@actline.app";
  const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (!user) throw new UnauthorizedError("No demo user. Run `npm run db:seed`.");
  return user;
});
