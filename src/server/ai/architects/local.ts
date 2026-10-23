import "server-only";

import { noteRequest } from "../../debug";
import { extractJson, type Architect, type ArchitectRequest, type ArchitectTurn } from "../architect";

/**
 * The architect that asks a local model server.
 *
 * The server speaks the OpenAI Responses API (llama.cpp does, and so do most
 * of the others), so the plan is built from `/responses` instead of from the
 * vendor SDK. The server has no memory of the conversation: a correction turn
 * replays the whole exchange — the question, the model's answer, the
 * server's problems.
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
type LocalInputItem = { role: "user" | "assistant"; content: string };

/**
 * The turn the model sees.
 *
 * The first turn is the question; a correction replays it with the model's
 * answer and the server's problems in between.
 */
function buildInput(request: ArchitectRequest): string | LocalInputItem[] {
  if (!request.followUp) return request.user;
  return [
    { role: "user", content: request.user },
    { role: "assistant", content: request.followUp.text },
    { role: "user", content: request.followUp.message },
  ];
}

/** What the API answers with. */
type LocalResponse = {
  output_text?: string;
  output?: {
    type?: string;
    id?: string;
    text?: string;
    content?: unknown;
  }[];
  error?: { message?: string; code?: string };
};

/** The model's prose: every Responses server writes it somewhere slightly different. */
function readText(payload: LocalResponse): string {
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
      // A JSON document is wanted; a server that understands this honors it,
      // one that does not ignores it and the fallback parser still holds.
      text: { format: { type: "json_object" } },
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

    const text = readText(payload);
    const extracted = extractJson(text);
    return { text, json: extracted.value, parseError: extracted.error, raw: payload };
  }
}
