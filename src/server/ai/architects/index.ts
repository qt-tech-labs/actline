import "server-only";

import { PLAN_PROVIDERS } from "@/lib/blueprint";
import type { BlueprintProvider } from "@/lib/types";
import type { Architect } from "../architect";
import { GeminiArchitect, hasGeminiKey } from "./gemini";
import { LocalArchitect } from "./local";
import { hasOpenRouterKey, OpenRouterArchitect } from "./openrouter";

/**
 * The engines the plan can be built with.
 *
 * A new engine is one implementation of `Architect` plus one line here. The
 * plan-craft skill never learns which one it is talking to.
 */
const ARCHITECTS: Record<string, () => Architect | null> = {
  gemini: () => (hasGeminiKey() ? new GeminiArchitect() : null),
  openrouter: () => (hasOpenRouterKey() ? new OpenRouterArchitect() : null),
  local: () => new LocalArchitect(),
};

/** The names of the engines the app knows. */
export const ARCHITECT_KEYS = Object.keys(ARCHITECTS);

/**
 * The architect for an engine, or null when that engine cannot run — a
 * missing API key, an unknown name.
 */
export function architectFor(engine: string): Architect | null {
  return ARCHITECTS[engine]?.() ?? null;
}

/**
 * The engines the plan may use, in the order they are tried.
 *
 * `AI_PLAN_ENGINE=local,gemini` tries the local model first and falls back to
 * Gemini; `AI_PLAN_ENGINE=template` always uses the deterministic engine.
 */
export function planEngines(): string[] {
  const raw = process.env.AI_PLAN_ENGINE ?? "gemini";
  return raw
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

/** The UI's initial selection follows the configured engine preference. */
export function defaultPlanProvider(): BlueprintProvider {
  const engine = planEngines().find((name): name is BlueprintProvider => (PLAN_PROVIDERS as readonly string[]).includes(name));
  return engine ?? "gemini";
}
