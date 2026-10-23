"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { setDebugMock } from "@/lib/debug-mock";
import type { DebugRun, DebugTurn } from "@/server/debug";

const ReactJson = dynamic(() => import("react-json-view"), {
  ssr: false,
  loading: () => <span className="text-body-sm text-outline">…</span>,
});

const MOCK_KEY = "actline.debug.mock";
import { Icon } from "@/components/ui/Icon";

const POLL_MS = 2000;

function Block({ label, children, tone }: { label: string; children: string; tone?: "ok" | "failed" }) {
  const color =
    tone === "failed"
      ? "bg-error-container/40 text-error"
      : tone === "ok"
        ? "bg-primary-fixed/40 text-on-surface"
        : "bg-surface-container-low text-on-surface";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-sm text-outline">{label}</span>
      <pre className={`max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg p-2 font-mono text-[11px] ${color}`}>
        {children}
      </pre>
    </div>
  );
}

/** Formatted JSON: the first level is open, anything deeper starts collapsed. */
function JsonTree({ value, tone }: { value: unknown; tone?: "ok" | "failed" }) {
  const src = value && typeof value === "object" ? value : { value };
  const bg = tone === "ok" ? "rgba(22,163,74,0.10)" : tone === "failed" ? "rgba(220,38,38,0.10)" : "rgba(0,0,0,0.04)";
  return (
    <div className="max-h-96 overflow-auto rounded-lg p-2" style={{ background: bg }}>
      <ReactJson
        src={src as object}
        name={false}
        collapsed={1}
        displayDataTypes={false}
        displayObjectSize
        enableClipboard
        collapseStringsAfterLength={120}
        style={{ background: "transparent", fontSize: 11 }}
      />
    </div>
  );
}

function JsonBlock({ label, value, tone }: { label: string; value: unknown; tone?: "ok" | "failed" }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-sm text-outline">{label}</span>
      <JsonTree value={value} tone={tone} />
    </div>
  );
}

function RequestBlock({ request }: { request: NonNullable<DebugTurn["request"]> }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-sm text-outline">Request</span>
      <div className="break-all rounded-lg bg-surface-container-low p-2 font-mono text-[11px] font-bold text-on-surface">
        {request.method} {request.url}
      </div>
      <JsonTree value={request.body} />
    </div>
  );
}


function Turn({ turn, index }: { turn: DebugTurn; index: number }) {
  const failed = turn.error !== null;
  return (
    <details className="rounded-lg border border-surface-variant p-2" open={failed || index === 0}>
      <summary className="cursor-pointer text-body-sm text-on-surface">
        Turn {index + 1}
        {turn.followUp ? " (repair)" : ""} · {(turn.durationMs / 1000).toFixed(1)}s ·{" "}
        {turn.error !== null ? "failed" : turn.json !== null ? "JSON document" : turn.parseError ?? "no JSON"}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {turn.request ? <RequestBlock request={turn.request} /> : null}
        {failed ? <Block label="Error" tone="failed">{turn.errorDetail ?? turn.error ?? ""}</Block> : null}
        <JsonBlock label="Response" value={turn.raw} tone={failed ? undefined : "ok"} />
        <JsonBlock label="Extracted JSON document" value={turn.json ?? turn.parseError ?? "none"} />
        {turn.problems.length > 0 ? <Block label="Problems sent back to the model">{turn.problems.join("\n")}</Block> : null}
        <details>
          <summary className="cursor-pointer text-body-sm text-on-surface-variant">Prompts as plain text</summary>
          <div className="mt-2 flex flex-col gap-2">
            <Block label="System prompt">{turn.system}</Block>
            <Block label="User prompt">{turn.user}</Block>
          </div>
        </details>
      </div>
    </details>
  );
}

const ROW_TONE: Record<DebugRun["status"], string> = {
  running: "border-outline-variant bg-surface-container-lowest",
  ok: "border-[#16a34a]/50 bg-[#f0fdf4]",
  failed: "border-[#dc2626]/50 bg-[#fef2f2]",
};
const BADGE_TONE: Record<DebugRun["status"], string> = {
  running: "bg-surface-container text-on-surface-variant",
  ok: "bg-[#16a34a] text-white",
  failed: "bg-[#dc2626] text-white",
};

function Row({ run, open }: { run: DebugRun; open: boolean }) {
  return (
    <details className={`rounded-xl border p-3 ${ROW_TONE[run.status]}`} open={open}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-label-sm ${BADGE_TONE[run.status]}`}>{run.status}</span>
        <span className="font-mono text-body-sm text-on-surface">
          {run.provider} · {run.model}
        </span>
        <span className="text-body-sm text-outline">
          {new Date(run.startedAt).toLocaleTimeString("en-GB")}
          {run.durationMs !== null ? ` · ${(run.durationMs / 1000).toFixed(1)}s` : ""}
        </span>
      </summary>
      <p className="mt-2 text-body-sm text-on-surface-variant">{run.prompt}</p>
      <div className="mt-3 flex flex-col gap-2">
        {run.status === "failed" ? (
          <Block label="Failure detail" tone="failed">{run.errorDetail ?? run.error ?? "unknown error"}</Block>
        ) : null}
        {run.repairs.length > 0 ? <Block label="Repairs the server made">{run.repairs.join("\n")}</Block> : null}
        {run.turns.map((turn, index) => (
          <Turn key={turn.startedAt + index} turn={turn} index={index} />
        ))}
      </div>
    </details>
  );
}

/** Model traffic of every plan generation, as a left-side drawer over the page (`?mode=dashboard`). */
export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(true);
  const [runs, setRuns] = useState<DebugRun[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/debug/runs", { cache: "no-store" });
      if (res.ok) setRuns(((await res.json()) as { runs: DebugRun[] }).runs);
    } catch {}
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const id = live ? setInterval(() => void load(), POLL_MS) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [live, load]);

  const [mockOn, setMockOn] = useState(false);
  const [mockText, setMockText] = useState("");
  const [defaultMock, setDefaultMock] = useState("");

  // The mock survives reloads; the default comes from the server so it is always a valid plan.
  useEffect(() => {
    const timer = setTimeout(async () => {
      let fallback = "";
      try {
        const res = await fetch("/api/v1/debug/mock", { cache: "no-store" });
        if (res.ok) fallback = JSON.stringify(((await res.json()) as { plan: unknown }).plan, null, 2);
      } catch {}
      setDefaultMock(fallback);
      try {
        const saved = JSON.parse(localStorage.getItem(MOCK_KEY) ?? "null") as { on?: boolean; text?: string } | null;
        setMockText(saved?.text || fallback);
        setMockOn(Boolean(saved?.on));
      } catch {
        setMockText(fallback);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setDebugMock({ enabled: mockOn, text: mockText });
    if (mockText) localStorage.setItem(MOCK_KEY, JSON.stringify({ on: mockOn, text: mockText }));
  }, [mockOn, mockText]);

  let mockError: string | null = null;
  let mockPlan: unknown = null;
  try {
    mockPlan = mockText ? JSON.parse(mockText) : null;
  } catch (error) {
    mockError = error instanceof Error ? error.message : "Invalid JSON";
  }

  const failed = runs.filter((run) => run.status === "failed").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="interactive fixed left-3 top-[4.5rem] z-[110] flex items-center gap-1.5 rounded-full bg-inverse-surface px-3 py-2 text-body-sm text-inverse-on-surface shadow-lg"
      >
        <span aria-hidden className="text-base leading-none">🐞</span>
        <span className="sr-only">{open ? "Hide debug" : "Show debug"}</span>
        {failed > 0 ? (
          <span
            aria-label={`${failed} failed`}
            className="min-w-5 rounded-full bg-[#dc2626] px-1.5 text-center text-label-sm text-white"
          >
            {failed}
          </span>
        ) : null}
      </button>

      {open ? <div className="fixed inset-0 z-[90]" aria-hidden onClick={() => setOpen(false)} /> : null}

      <aside
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 left-0 z-[100] flex w-[min(34rem,100vw)] flex-col gap-3 overflow-y-auto border-r border-surface-variant bg-surface p-4 pt-28 shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-title-lg font-bold text-on-surface">Model debug</h2>
          <div className="flex items-center gap-3 text-body-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} />
              Live
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="interactive rounded-lg border border-surface-variant px-3 py-1 hover:bg-surface-container"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse debug view"
              className="interactive flex size-8 items-center justify-center rounded-lg border border-surface-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="close" fill className="text-[18px]" />
            </button>
          </div>
        </div>
        <section
          className={`flex flex-col gap-2 rounded-xl border p-3 ${mockOn ? "border-[#f59e0b]/60 bg-[#fffbeb]" : "border-surface-variant"}`}
        >
          <label className="flex items-center gap-2 text-body-sm font-bold text-on-surface">
            <input type="checkbox" checked={mockOn} onChange={(event) => setMockOn(event.target.checked)} />
            Mock the plan response
          </label>
          <p className="text-body-sm text-on-surface-variant">
            {mockOn
              ? "Generate returns the JSON below and calls no model."
              : "Turn on to test the plan screens without asking a model."}
          </p>
          {mockOn ? (
            <>
              <textarea
                value={mockText}
                onChange={(event) => setMockText(event.target.value)}
                spellCheck={false}
                rows={10}
                aria-label="Mocked plan JSON"
                className="w-full resize-y rounded-lg border border-surface-variant bg-surface p-2 font-mono text-[11px]"
              />
              {mockError ? (
                <p className="text-body-sm text-error">Invalid JSON: {mockError}</p>
              ) : (
                <details>
                  <summary className="cursor-pointer text-body-sm text-on-surface-variant">Formatted preview</summary>
                  <JsonTree value={mockPlan} tone="ok" />
                </details>
              )}
              <button
                type="button"
                onClick={() => setMockText(defaultMock)}
                disabled={!defaultMock}
                className="interactive self-start rounded-lg border border-surface-variant px-3 py-1 text-body-sm hover:bg-surface-container disabled:opacity-60"
              >
                Reset to default plan
              </button>
            </>
          ) : null}
        </section>
        {runs.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">Nothing yet. Generate a plan and each try appears here.</p>
        ) : (
          runs.map((run, index) => <Row key={run.id} run={run} open={index === 0} />)
        )}
      </aside>
    </>
  );
}
