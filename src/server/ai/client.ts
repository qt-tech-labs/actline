import "server-only";

import { GoogleGenAI } from "@google/genai";

/** The model that crafts the plan. Fast enough for a full project plan. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

/** How long a plan may take before the template engine takes over. */
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 120_000);

let client: GoogleGenAI | null = null;

/** True when a key is configured: without one the template engine does the work. */
export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** The shared Gemini client. */
export function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!client) {
    // The base URL and version can be pointed elsewhere (a gateway, a proxy)
    // — which is also how the plan pipeline is exercised without a real key.
    const baseUrl = process.env.GEMINI_BASE_URL;
    const apiVersion = process.env.GEMINI_API_VERSION;
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: AI_TIMEOUT_MS,
        ...(baseUrl ? { baseUrl } : {}),
        ...(apiVersion ? { apiVersion } : {}),
      },
    });
  }
  return client;
}
