import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_PARAMS, DEFAULT_PROMPT } from "@/lib/blueprint";
import type { BlueprintInput } from "@/lib/types";

/**
 * Where the plan currently on screen lives between page loads. The cookie only
 * points at the stored draft — the plan itself lives in the database, because
 * an AI plan is far too big for a cookie and cannot be derived again.
 */
const COOKIE_NAME = "actline_blueprint";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** The idea and knobs the studio starts from. */
export const defaultBlueprintInput = (): BlueprintInput => ({
  ...DEFAULT_PARAMS,
  prompt: DEFAULT_PROMPT,
  iotEnabled: null,
});

/** The id of the draft on screen, or null when there is none. */
export async function readBlueprintId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown };
    return typeof parsed.id === "string" && parsed.id.length > 0 ? parsed.id : null;
  } catch {
    return null;
  }
}

/** Points the studio at a draft, so the next render shows the same plan. */
export async function writeBlueprintId(id: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify({ id }), {
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
  });
}

/** Forgets the plan on screen: the studio starts fresh again. */
export async function clearBlueprintId(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
