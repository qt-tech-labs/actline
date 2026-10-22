import "server-only";

import { noteRequest } from "../../debug";
import type { Architect, ArchitectCall, ArchitectRequest, ArchitectTurn } from "../architect";

/**
 * The architect that asks OpenRouter.
 *
 * OpenRouter's Responses API keeps no conversation: a
 * follow-up turn replays the question, the calls and the answers.
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

type InputItem =
  | { role: "user"; content: string }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

type ResponsesPayload = {
  output?: { type?: string; id?: string; call_id?: string; name?: string; arguments?: unknown }[];
  error?: { code?: number | string; message?: string };
};

/** The first turn is the question; a follow-up replays the question, the calls and the answers. */
function buildInput(request: ArchitectRequest): string | InputItem[] {
  if (!request.results || request.results.length === 0) return request.user;
  return [
    { role: "user", content: request.user },
    ...(request.calls ?? []).map((call) => ({
      type: "function_call" as const,
      call_id: call.id,
      name: call.name,
      arguments: call.raw ?? JSON.stringify(call.arguments),
    })),
    ...request.results.map((result) => ({
      type: "function_call_output" as const,
      call_id: result.callId,
      output: result.content,
    })),
  ];
}

/** The arguments of a call: the model sends them as text. */
function parseArguments(raw: string): { value: Record<string, unknown>; malformed: boolean } {
  if (!raw.trim()) return { value: {}, malformed: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { value: value as Record<string, unknown>, malformed: false };
    }
  } catch {
    // Falls through to malformed.
  }
  return { value: {}, malformed: true };
}

function readCalls(payload: ResponsesPayload): ArchitectCall[] {
  const calls: ArchitectCall[] = [];
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
    if (item?.type !== "function_call") continue;
    const raw = typeof item.arguments === "string" ? item.arguments : "";
    const parsed = parseArguments(raw);
    calls.push({
      id: item.call_id ?? item.id ?? "",
      name: item.name ?? "",
      arguments: parsed.value,
      ...(parsed.malformed ? { malformed: true } : {}),
      ...(raw ? { raw } : {}),
    });
  }
  return calls;
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
      tools: request.tools.map(({ name, description, parameters }) => ({ type: "function", name, description, parameters })),
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
    return { calls: readCalls(payload), raw: payload };
  }
}
