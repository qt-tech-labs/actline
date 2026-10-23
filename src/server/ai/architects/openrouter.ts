import "server-only";

import { noteRequest } from "../../debug";
import { extractJson, type Architect, type ArchitectRequest, type ArchitectTurn } from "../architect";

/**
 * The architect that asks OpenRouter.
 *
 * OpenRouter's Responses API keeps no conversation: a correction turn replays
 * the question, the model's answer and the server's problems.
 */

/** The model that crafts the plan. */
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "recursive/flint-v1.0";

/** The API root; the path is appended. */
export const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "");

/** How long a turn may take. */
export const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 120_000);

/** True when a key is configured. */
export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

type InputItem = { role: "user" | "assistant"; content: string };

/** The first turn is the question; a correction replays it with the problems. */
function buildInput(request: ArchitectRequest): string | InputItem[] {
  if (!request.followUp) return request.user;
  return [
    { role: "user", content: request.user },
    { role: "assistant", content: request.followUp.text },
    { role: "user", content: request.followUp.message },
  ];
}

type ResponsesPayload = {
  output_text?: string;
  output?: {
    type?: string;
    id?: string;
    text?: string;
    content?: unknown;
  }[];
  error?: { code?: number | string; message?: string };
};

/** The model's prose: every Responses server writes it somewhere slightly different. */
function readText(payload: ResponsesPayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const parts: string[] = [];
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
    if (typeof item.text === "string") {
      parts.push(item.text);
      continue;
    }
    const content = item.content;
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

/** The architect that asks OpenRouter. */
export class OpenRouterArchitect implements Architect {
  readonly key = "openrouter";
  readonly model = OPENROUTER_MODEL;
  readonly timeoutMs = OPENROUTER_TIMEOUT_MS;

  async run(request: ArchitectRequest): Promise<ArchitectTurn> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

    const url = `${OPENROUTER_BASE_URL}/responses`;
    const body = {
      model: OPENROUTER_MODEL,
      instructions: request.system,
      input: buildInput(request),
      text: { format: { type: "json_object" } },
    };
    noteRequest(url, body);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    // OpenRouter keeps a slow request alive with blank lines, so the body can arrive late or not at all.
    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw new Error(
        timedOut
          ? `OpenRouter did not finish within ${Math.round(this.timeoutMs / 1000)}s (${OPENROUTER_MODEL}). Raise OPENROUTER_TIMEOUT_MS or pick a faster model.`
          : `OpenRouter's answer was cut off: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (!text.trim()) throw new Error(`OpenRouter answered HTTP ${response.status} with an empty body.`);
    let payload: ResponsesPayload;
    try {
      payload = JSON.parse(text) as ResponsesPayload;
    } catch {
      throw new Error(`OpenRouter's answer is not JSON (HTTP ${response.status}): ${text.slice(0, 300)}`);
    }
    if (!response.ok || payload.error) {
      const detail = payload.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`OpenRouter refused the turn: ${detail}`, { cause: payload });
    }
    const prose = readText(payload);
    const extracted = extractJson(prose);
    return { text: prose, json: extracted.value, parseError: extracted.error, raw: payload };
  }
}
