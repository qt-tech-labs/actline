import "server-only";

import type { PlanCraftTool } from "./skills/plan-craft/tools";

/**
 * The architect: the app's view of a model that can use tools.
 *
 * The app never talks to a vendor. Gemini, a local llama server or anything
 * else is a detail behind this interface — the plan-craft skill asks for a
 * turn, gets tool calls back and works with those. A new engine is a new
 * implementation of `Architect` plus one line in the registry.
 */

/** A tool the model may call: the JSON Schema the model reads. */
export type ArchitectTool = PlanCraftTool;

/** A tool call the model made. */
export type ArchitectCall = {
  /** The id the answer to this call has to carry. */
  id: string;
  /** The tool the model called. */
  name: string;
  /** The arguments, parsed. Empty when the model sent something else. */
  arguments: Record<string, unknown>;
  /** The model sent arguments that are not valid JSON. */
  malformed?: boolean;
  /** The arguments as the model wrote them, when the transport keeps the text. */
  raw?: string;
};

/** The server's answer to a tool call. */
export type ArchitectResult = {
  /** The call this answers. */
  callId: string;
  name: string;
  content: string;
  /** The call was rejected: the model may try again. */
  isError: boolean;
};

/** One turn of the conversation. */
export type ArchitectTurn = {
  /** The tool calls the model made. */
  calls: ArchitectCall[];
  /**
   * The transport's handle for the conversation so far, when it keeps one.
   * The Gemini API does; a plain HTTP server does not and replays the
   * history instead.
   */
  handle?: string | null;
  /** The vendor's answer as it came, for the debug dashboard. */
  raw?: unknown;
};

/** Everything a turn needs. */
export type ArchitectRequest = {
  /** The system instruction. */
  system: string;
  /** The user turn. */
  user: string;
  /** The tools the model may call. */
  tools: ArchitectTool[];
  /**
   * A follow-up turn: the calls the model made last time and the answers the
   * server gave. A transport that keeps the conversation itself may ignore
   * them; one that does not replays them.
   */
  calls?: ArchitectCall[];
  results?: ArchitectResult[];
  /** The handle of the previous turn, when the transport gave one. */
  handle?: string | null;
};

/**
 * A model that can use tools.
 *
 * An implementation only moves one turn across the wire: the prompts, the
 * tools, the rules and the repairs belong to the plan-craft skill.
 */
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
