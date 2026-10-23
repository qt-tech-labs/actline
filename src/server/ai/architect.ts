import "server-only";

/**
 * The architect: the app's view of a model that answers in JSON.
 *
 * The app never talks to a vendor. Gemini, OpenRouter, a local llama server or
 * anything else is a detail behind this interface — a skill asks for a turn and
 * gets one JSON document back. The model crafts the whole plan in one answer,
 * so there is no tool menu, no per-call bookkeeping and no conversation state
 * to replay: a correction turn simply carries what the model wrote last time
 * and what was wrong with it. A new engine is a new implementation of
 * `Architect` plus one line in the registry.
 */

/** One turn of the conversation. */
export type ArchitectRequest = {
  /** The system instruction. */
  system: string;
  /** The user turn. */
  user: string;
  /**
   * A correction turn. A transport that keeps the conversation itself only
   * needs `message` — it remembers the text on its side; one that does not
   * replays `text` as the assistant's answer and then `message` as the user's
   * correction.
   */
  followUp?: {
    /** What the model wrote last time. */
    text: string;
    /** The server's correction, as a user turn. */
    message: string;
    /** The problems found with the model's last answer, for the dashboard. */
    problems: string[];
  } | null;
  /** The handle of the previous turn, when the transport gave one. */
  handle?: string | null;
};

/** What a turn answers with. */
export type ArchitectTurn = {
  /** The model's answer, as text — engine envelopes stripped. */
  text: string;
  /** The JSON document extracted from the text, or null when there is none. */
  json: unknown;
  /** Why `json` is null, when it is. */
  parseError: string | null;
  /**
   * The transport's handle for the conversation so far, when it keeps one.
   * The Gemini API does; a plain HTTP server does not and replays instead.
   */
  handle?: string | null;
  /** The vendor's answer as it came, for the debug dashboard. */
  raw?: unknown;
};

/** Everything a turn needs. */
export interface Architect {
  /** The engine's name: "gemini", "local", ... */
  readonly key: string;
  /** The model that writes the plan; shown next to it. */
  readonly model: string;
  /** How long a turn may take before the template engine takes over (ms). */
  readonly timeoutMs: number;
  /** Runs one turn. */
  run(request: ArchitectRequest): Promise<ArchitectTurn>;
}

/**
 * Pulls the JSON document out of a model answer.
 *
 * The ideal answer is one bare document; reasoning models also like a stretch
 * of thinking, an introduction or a trailing note, so the extraction scans the
 * text for top-level JSON documents and prefers the last one — a JSON draft an
 * answering model rehearses in its reasoning must not win over its final
 * document. A truncated document is reported, not silently repaired — the
 * correction turn asks the model for the whole document again.
 */
export function extractJson(text: string): { value: unknown; error: string | null } {
  const body = text.trim();

  // The ideal case: the whole string is the document.
  try {
    return { value: JSON.parse(body) as unknown, error: null };
  } catch {
    // Falls through to the scan below.
  }

  if (!body.includes("{") && !body.includes("[")) {
    return { value: null, error: "The answer contains no JSON document." };
  }

  // Walk the text and collect every top-level document ({...} or [...]),
  // producing at most one slice per complete document. String-literal aware,
  // so braces inside strings or escaped quotes cannot unbalance the count.
  const documents: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  const collect = (slice: string) => {
    try {
      documents.push(JSON.parse(slice) as unknown);
    } catch {
      // A slice that balances but does not parse is skipped; a later
      // document that parses will win anyway.
    }
  };

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (start >= 0 && depth <= 0) {
        collect(body.slice(start, index + 1));
        start = -1;
        depth = 0;
      }
    }
  }

  const value = documents.at(-1);
  if (value === undefined) {
    return { value: null, error: "The answer contains no complete JSON document (it may have been cut off)." };
  }
  return { value, error: null };
}
