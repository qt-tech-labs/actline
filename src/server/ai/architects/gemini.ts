import "server-only";

import { GoogleGenAI } from "@google/genai";
import { noteRequest } from "../../debug";
import { extractJson, type Architect, type ArchitectRequest, type ArchitectTurn } from "../architect";

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

/** What an interaction looks like to this engine, as far as it cares. */
type InteractionLike = {
  output_text?: unknown;
  id?: unknown;
  steps?: {
    type?: unknown;
    text?: unknown;
    content?: unknown;
  }[];
};

/** The model's prose, from wherever the interaction chose to put it. */
function readText(raw: unknown): string {
  const interaction = raw as InteractionLike;
  if (typeof interaction.output_text === "string" && interaction.output_text.trim()) return interaction.output_text;
  const parts: string[] = [];
  for (const step of Array.isArray(interaction.steps) ? interaction.steps : []) {
    if (typeof step.text === "string") {
      parts.push(step.text);
      continue;
    }
    const content = step.content;
    if (typeof content === "string") {
      parts.push(content);
      continue;
    }
    if (Array.isArray(content)) {
      for (const block of content) {
        const text = typeof block === "object" && block !== null ? (block as { text?: unknown }).text : block;
        if (typeof text === "string") parts.push(text);
      }
    }
  }
  return parts.join("\n");
}

/**
 * The architect that asks the Gemini API.
 *
 * The API keeps the conversation: a correction turn points back at the
 * interaction before it and the correction is the only thing sent.
 */
export class GeminiArchitect implements Architect {
  readonly key = "gemini";
  readonly model = GEMINI_MODEL;
  readonly timeoutMs = AI_TIMEOUT_MS;

  async run(request: ArchitectRequest): Promise<ArchitectTurn> {
    const params = {
      model: GEMINI_MODEL,
      system_instruction: request.system,
      input: request.followUp ? request.followUp.message : request.user,
      ...(request.handle ? { previous_interaction_id: request.handle } : {}),
    };
    noteRequest(`${process.env.GEMINI_BASE_URL?.replace(/\/+$/, "") ?? "https://generativelanguage.googleapis.com"}/interactions`, params);
    const interaction = (await gemini().interactions.create(params)) as unknown as InteractionLike & { id: unknown };

    const text = readText(interaction);
    const extracted = extractJson(text);
    return {
      text,
      json: extracted.value,
      parseError: extracted.error,
      handle: typeof interaction.id === "string" ? interaction.id : undefined,
      raw: interaction,
    };
  }
}
