import "server-only";

import { GoogleGenAI } from "@google/genai";
import { noteRequest } from "../../debug";
import type { Architect, ArchitectCall, ArchitectRequest, ArchitectTurn } from "../architect";

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

/**
 * The architect that asks the Gemini API.
 *
 * The API keeps the conversation: a follow-up turn points back at the
 * interaction before it, and the function results are the only thing sent.
 */
export class GeminiArchitect implements Architect {
  readonly key = "gemini";
  readonly model = GEMINI_MODEL;
  readonly timeoutMs = AI_TIMEOUT_MS;

  async run(request: ArchitectRequest): Promise<ArchitectTurn> {
    const params = {
      model: GEMINI_MODEL,
      system_instruction: request.system,
      // A follow-up turn answers the calls of the last one; everything before
      // it lives on Google's side.
      input: request.results
        ? request.results.map((result) => ({
            type: "function_result" as const,
            call_id: result.callId,
            name: result.name,
            result: result.content,
            is_error: result.isError,
          }))
        : request.user,
      tools: request.tools,
      ...(request.handle ? { previous_interaction_id: request.handle } : {}),
    };
    noteRequest(`${process.env.GEMINI_BASE_URL?.replace(/\/+$/, "") ?? "https://generativelanguage.googleapis.com"}/interactions`, params);
    const interaction = await gemini().interactions.create(params);

    const calls: ArchitectCall[] = [];
    for (const step of interaction.steps) {
      if (step.type !== "function_call") continue;
      calls.push({ id: step.id, name: step.name, arguments: step.arguments });
    }
    return { calls, handle: interaction.id, raw: interaction };
  }
}
