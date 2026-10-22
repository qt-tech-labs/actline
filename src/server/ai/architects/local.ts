import "server-only";

import { noteRequest } from "../../debug";
import type { Architect, ArchitectCall, ArchitectRequest, ArchitectTurn } from "../architect";

/**
 * The architect that asks a local model server.
 *
 * The server speaks the OpenAI Responses API (llama.cpp does, and so do most
 * of the others), so the plan is built from `/responses` instead of from the
 * vendor SDK. The server has no memory of the conversation: a follow-up turn
 * replays the whole turn.
 */

/** Where the server lives. The path of the API itself is appended. */
export const LOCAL_AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://localhost:9931/v1";

/** The model that crafts the plan — the one the server has loaded. */
export const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL ?? "ggml-org/gpt-oss-20b-GGUF:MXFP4";

/** Some servers want a token even when they never look at it. */
export const LOCAL_AI_API_KEY = process.env.LOCAL_AI_API_KEY ?? "";

/**
 * How long a turn may take. A local model is slower to answer than a hosted
 * one, and it has to load before it says anything.
 */
export const LOCAL_AI_TIMEOUT_MS = Number(process.env.LOCAL_AI_TIMEOUT_MS ?? 300_000);

/** How many tokens the plan may take. Left to the server when unset. */
export const LOCAL_AI_MAX_OUTPUT_TOKENS = Number(process.env.LOCAL_AI_MAX_OUTPUT_TOKENS ?? 0) || null;

/** The endpoint: the base URL points at the API root, the path is appended. */
function responsesUrl(): string {
  const base = LOCAL_AI_BASE_URL.replace(/\/+$/, "");
  return base.endsWith("/responses") ? base : `${base}/responses`;
}

/** One item of the conversation, in the shape the API expects. */
type LocalInputItem =
  | { role: "user"; content: string }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

/** What the API answers with. */
type LocalResponse = {
  output?: {
    type?: string;
    id?: string;
    call_id?: string;
    name?: string;
    arguments?: unknown;
  }[];
  error?: { message?: string; code?: string };
};

/**
 * The turn the model sees.
 *
 * The first turn is the question; a follow-up replays the question, the calls
 * the model made and the answers the server gave.
 */
function buildInput(request: ArchitectRequest): string | LocalInputItem[] {
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
    return { value: {}, malformed: true };
  } catch {
    return { value: {}, malformed: true };
  }
}

/** The tool calls in the answer. */
function readCalls(payload: LocalResponse): ArchitectCall[] {
  const output = Array.isArray(payload.output) ? payload.output : [];
  const calls: ArchitectCall[] = [];
  for (const item of output) {
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

/** The architect that asks a local model server. */
export class LocalArchitect implements Architect {
  readonly key = "local";
  readonly model = LOCAL_AI_MODEL;
  readonly timeoutMs = LOCAL_AI_TIMEOUT_MS;

  async run(request: ArchitectRequest): Promise<ArchitectTurn> {
    const url = responsesUrl();
    const body = {
      model: LOCAL_AI_MODEL,
      instructions: request.system,
      input: buildInput(request),
      tools: request.tools,
      ...(LOCAL_AI_MAX_OUTPUT_TOKENS ? { max_output_tokens: LOCAL_AI_MAX_OUTPUT_TOKENS } : {}),
    };
    noteRequest(url, body);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(LOCAL_AI_API_KEY ? { Authorization: `Bearer ${LOCAL_AI_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const payload = (await response.json().catch(() => ({}))) as LocalResponse;
    if (!response.ok) {
      const detail = payload.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`The local model refused the turn: ${detail}`, { cause: payload });
    }

    return { calls: readCalls(payload), raw: payload };
  }
}
