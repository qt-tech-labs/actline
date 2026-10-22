import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import type { Architect, ArchitectCall, ArchitectRequest, ArchitectTurn } from "./ai/architect";

/**
 * Debug recording of the plan studio's model traffic.
 *
 * Every turn the model answers is kept in memory (newest first) so the
 * dashboard at `/new?mode=dashboard` can show what was asked and what came
 * back, raw. Off in production unless `ACTLINE_DEBUG=1`.
 */

export type DebugTurn = {
  startedAt: string;
  durationMs: number;
  /** A follow-up turn replays the calls and the server's answers. */
  followUp: boolean;
  system: string;
  user: string;
  toolNames: string[];
  replayedResults: { name: string; isError: boolean; content: string }[];
  calls: ArchitectCall[];
  /** What was sent: the endpoint and the body, exactly as the engine built them. */
  request: { method: string; url: string; body: unknown } | null;
  /** The vendor's answer, untouched. */
  raw: unknown;
  error: string | null;
  /** Name, stack, status and cause of the failure. */
  errorDetail: string | null;
};

export type DebugRun = {
  id: string;
  startedAt: string;
  provider: string;
  model: string;
  prompt: string;
  status: "running" | "ok" | "failed";
  durationMs: number | null;
  error: string | null;
  errorDetail: string | null;
  repairs: string[];
  turns: DebugTurn[];
};

const MAX_RUNS = 20;

const currentTurn = new AsyncLocalStorage<DebugTurn>();

/** Called by an engine right before it sends a turn; a no-op outside a recorded run. */
export function noteRequest(url: string, body: unknown) {
  const turn = currentTurn.getStore();
  if (turn) turn.request = { method: "POST", url, body };
}

// Kept on globalThis so a hot reload in `next dev` does not wipe the history.
const store = globalThis as typeof globalThis & { __actlineDebugRuns?: DebugRun[] };
const runs = (): DebugRun[] => (store.__actlineDebugRuns ??= []);

export function debugEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ACTLINE_DEBUG === "1";
}

export function listDebugRuns(): DebugRun[] {
  return debugEnabled() ? runs() : [];
}

export function startDebugRun(architect: Architect, prompt: string): DebugRun {
  const run: DebugRun = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    provider: architect.key,
    model: architect.model,
    prompt,
    status: "running",
    durationMs: null,
    error: null,
    errorDetail: null,
    repairs: [],
    turns: [],
  };
  if (debugEnabled()) runs().unshift(run);
  runs().splice(MAX_RUNS);
  return run;
}

/** Everything useful about a failure: name, message, stack, own fields and the cause chain. */
export function describeError(error: unknown, depth = 0): string {
  if (!(error instanceof Error)) {
    try {
      return typeof error === "string" ? error : JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }
  const own = Object.fromEntries(Object.entries(error).filter(([, value]) => value !== undefined && value !== ""));
  const parts = [error.stack ?? `${error.name}: ${error.message}`];
  if (Object.keys(own).length > 0) {
    try {
      parts.push(JSON.stringify(own, null, 2));
    } catch {}
  }
  if (error.cause !== undefined && depth < 4) parts.push(`Caused by:\n${describeError(error.cause, depth + 1)}`);
  return parts.join("\n");
}

export function finishDebugRun(run: DebugRun, outcome: { error?: unknown; repairs?: string[] }) {
  run.durationMs = Date.now() - Date.parse(run.startedAt);
  run.repairs = outcome.repairs ?? [];
  run.error = outcome.error ? (outcome.error instanceof Error ? outcome.error.message : String(outcome.error)) : null;
  run.errorDetail = outcome.error ? describeError(outcome.error) : null;
  run.status = outcome.error ? "failed" : "ok";
}

/** The same architect, recording each turn into `run`. */
export function recordTurns(architect: Architect, run: DebugRun): Architect {
  return {
    key: architect.key,
    model: architect.model,
    timeoutMs: architect.timeoutMs,
    async run(request: ArchitectRequest): Promise<ArchitectTurn> {
      const startedAt = Date.now();
      const turn: DebugTurn = {
        startedAt: new Date(startedAt).toISOString(),
        durationMs: 0,
        followUp: Boolean(request.results?.length),
        system: request.system,
        user: request.user,
        toolNames: request.tools.map((tool) => tool.name),
        replayedResults: (request.results ?? []).map((r) => ({ name: r.name, isError: r.isError, content: r.content })),
        calls: [],
        request: null,
        raw: null,
        error: null,
        errorDetail: null,
      };
      run.turns.push(turn);
      try {
        const answer = await currentTurn.run(turn, () => architect.run(request));
        turn.calls = answer.calls;
        turn.raw = answer.raw ?? null;
        return answer;
      } catch (error) {
        turn.error = error instanceof Error ? error.message : String(error);
        turn.errorDetail = describeError(error);
        // An HTTP refusal carries the vendor's body as the cause.
        if (error instanceof Error && error.cause && typeof error.cause === "object") turn.raw = error.cause;
        throw error;
      } finally {
        turn.durationMs = Date.now() - startedAt;
      }
    },
  };
}
