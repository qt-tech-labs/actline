"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { api, apiErrorCode, apiErrorDetail } from "@/lib/api-client";
import type { BlueprintOp } from "@/lib/plan-ops";
import type { BlueprintConstraints, BlueprintInput, BlueprintParams } from "@/lib/types";

type Busy = "generate" | "draft" | "start" | "reset" | null;

/** What the user was doing when it failed. */
export type PlanAction = "generate" | "draft" | "start" | "edit" | "reset" | "iot";

/** The action that failed, so it can be run again. */
type Retryable =
  | { kind: "generate" }
  | { kind: "draft" }
  | { kind: "start" }
  | { kind: "ops"; ops: BlueprintOp[] }
  | { kind: "reset" }
  | { kind: "iot"; value: boolean };

/** A failure the user can read and retry. */
export type PlanError = {
  action: PlanAction;
  /** The server's error code ("not_found", "validation_failed", …) or "network". */
  code: string;
  /** The server's own message, when it sent one. */
  detail: string | null;
};

type NewProjectState = {
  prompt: string;
  params: BlueprintParams;
  /** `null` = follow the engine suggestion. */
  iotEnabled: boolean | null;
  /** BOM items the user already owns. */
  ownedSupplies: string[];
  /** The draft the plan on screen belongs to. */
  blueprintId: string | null;
  /** What the AI proposed for the knobs the user left open. */
  suggestion: BlueprintConstraints | null;
  setPrompt: (prompt: string) => void;
  setParams: (params: BlueprintParams) => void;
  setIotEnabled: (iotEnabled: boolean) => void;
  toggleOwned: (name: string) => void;
  setOwnedAll: (names: string[], owned: boolean) => void;
  /** Rebuilds the blueprint from the current form values. */
  generate: () => Promise<void>;
  /** Keeps the current plan as a draft on this device. */
  saveDraft: () => Promise<void>;
  /** Applies hand edits to the plan (add, edit or remove a node or an action item). */
  applyOps: (ops: BlueprintOp[]) => Promise<void>;
  /** Throws the plan away and starts the studio fresh. */
  reset: () => Promise<void>;
  /** Creates the project and opens it. */
  start: () => Promise<void>;
  busy: Busy;
  /** True while a hand edit is being stored. */
  editing: boolean;
  /** The last failure, if any. */
  error: PlanError | null;
  /** Runs the failed action again. */
  retry: () => Promise<void>;
  /** Hides the error banner. */
  dismissError: () => void;
  /** Set for a few seconds after a successful action, for the inline confirmation. */
  notice: string | null;
  /** True when the form no longer matches the plan currently on screen. */
  dirty: boolean;
};

const NewProjectContext = createContext<NewProjectState | null>(null);

/**
 * Shared state for the "new project" studio: the form, the IoT choice, the
 * hand edits and the action bar live in different sections of the page but
 * must agree on one plan. The provider is the only place that mutates it.
 */
export function NewProjectProvider({
  initial,
  blueprintId,
  suggestion: initialSuggestion = null,
  children,
}: {
  initial: BlueprintInput;
  blueprintId: string | null;
  suggestion?: BlueprintConstraints | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initial.prompt);
  const [params, setParams] = useState<BlueprintParams>({
    totalDays: initial.totalDays,
    dailyMinutes: initial.dailyMinutes,
    budgetVnd: initial.budgetVnd,
    experience: initial.experience,
  });
  const [iotEnabled, setIotEnabledState] = useState<boolean | null>(initial.iotEnabled);
  const [ownedSupplies, setOwnedSupplies] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<BlueprintConstraints | null>(initialSuggestion);
  const [busy, setBusy] = useState<Busy>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<PlanError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The action that failed, so the banner can offer to run it again.
  const lastAction = useRef<Retryable | null>(null);

  const body = useCallback(
    (): BlueprintInput => ({ prompt, ...params, iotEnabled }),
    [prompt, params, iotEnabled],
  );

  const fail = useCallback((action: PlanAction, cause: unknown) => {
    setError({ action, code: apiErrorCode(cause), detail: apiErrorDetail(cause) });
  }, []);

  const generate = useCallback(async () => {
    setBusy("generate");
    setError(null);
    setNotice(null);
    lastAction.current = { kind: "generate" };
    try {
      const result = await api<{ constraints: BlueprintConstraints }>("/blueprints", { method: "POST", body: body() });
      setSuggestion(result.constraints);
      router.refresh();
    } catch (cause) {
      fail("generate", cause);
    } finally {
      setBusy(null);
    }
  }, [body, fail, router]);

  const saveDraft = useCallback(async () => {
    setBusy("draft");
    setError(null);
    lastAction.current = { kind: "draft" };
    try {
      await api("/blueprints", { method: "POST", body: body() });
      setNotice("draft");
    } catch (cause) {
      fail("draft", cause);
    } finally {
      setBusy(null);
    }
  }, [body, fail]);

  /** Stores a batch of hand edits on the plan and re-renders it. */
  const applyOps = useCallback(
    async (ops: BlueprintOp[]) => {
      if (!blueprintId) return;
      setEditing(true);
      setError(null);
      lastAction.current = { kind: "ops", ops };
      try {
        await api(`/blueprints/${blueprintId}`, { method: "PATCH", body: { ops } });
        router.refresh();
      } catch (cause) {
        fail("edit", cause);
      } finally {
        setEditing(false);
      }
    },
    [blueprintId, fail, router],
  );

  /** Throws the draft away: the studio goes back to an empty state. */
  const reset = useCallback(async () => {
    if (!blueprintId) return;
    setBusy("reset");
    setError(null);
    setNotice(null);
    lastAction.current = { kind: "reset" };
    try {
      await api(`/blueprints/${blueprintId}`, { method: "DELETE" });
      router.refresh();
    } catch (cause) {
      fail("reset", cause);
    } finally {
      setBusy(null);
    }
  }, [blueprintId, fail, router]);

  const start = useCallback(async () => {
    setBusy("start");
    setError(null);
    lastAction.current = { kind: "start" };
    try {
      // Starts the plan that is on screen, not a half-edited form.
      const created = await api<{ id: string }>("/projects", {
        method: "POST",
        body: { ...initial, ownedSupplies, blueprintId },
      });
      router.push(`/?project=${created.id}`);
    } catch (cause) {
      fail("start", cause);
    } finally {
      setBusy(null);
    }
  }, [initial, ownedSupplies, blueprintId, fail, router]);

  /** Persists the IoT choice so the server renders the same plan the user sees. */
  const setIotEnabled = useCallback(
    (value: boolean) => {
      setIotEnabledState(value);
      setError(null);
      lastAction.current = { kind: "iot", value };
      void api("/blueprints", { method: "POST", body: { ...initial, iotEnabled: value } })
        .then(() => router.refresh())
        .catch((cause: unknown) => {
          setIotEnabledState(initial.iotEnabled);
          fail("iot", cause);
        });
    },
    [initial, fail, router],
  );

  const retry = useCallback(async () => {
    const action = lastAction.current;
    if (!action) return;
    setError(null);
    switch (action.kind) {
      case "generate":
        await generate();
        break;
      case "draft":
        await saveDraft();
        break;
      case "start":
        await start();
        break;
      case "ops":
        await applyOps(action.ops);
        break;
      case "reset":
        await reset();
        break;
      case "iot":
        setIotEnabled(action.value);
        break;
    }
  }, [generate, saveDraft, start, applyOps, reset, setIotEnabled]);

  const dismissError = useCallback(() => setError(null), []);

  const toggleOwned = useCallback((name: string) => {
    setOwnedSupplies((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }, []);

  const setOwnedAll = useCallback((names: string[], owned: boolean) => {
    setOwnedSupplies((current) => (owned ? [...new Set([...current, ...names])] : current.filter((item) => !names.includes(item))));
  }, []);

  const dirty =
    prompt !== initial.prompt ||
    params.totalDays !== initial.totalDays ||
    params.dailyMinutes !== initial.dailyMinutes ||
    params.budgetVnd !== initial.budgetVnd ||
    params.experience !== initial.experience ||
    iotEnabled !== initial.iotEnabled;

  const value = useMemo<NewProjectState>(
    () => ({
      prompt,
      params,
      iotEnabled,
      ownedSupplies,
      blueprintId,
      suggestion,
      setPrompt,
      setParams,
      setIotEnabled,
      toggleOwned,
      setOwnedAll,
      generate,
      saveDraft,
      applyOps,
      reset,
      start,
      busy,
      editing,
      error,
      retry,
      dismissError,
      notice,
      dirty,
    }),
    [
      prompt,
      params,
      iotEnabled,
      ownedSupplies,
      blueprintId,
      suggestion,
      setIotEnabled,
      toggleOwned,
      setOwnedAll,
      generate,
      saveDraft,
      applyOps,
      reset,
      start,
      busy,
      editing,
      error,
      retry,
      dismissError,
      notice,
      dirty,
    ],
  );

  return <NewProjectContext.Provider value={value}>{children}</NewProjectContext.Provider>;
}

export function useNewProject(): NewProjectState {
  const ctx = useContext(NewProjectContext);
  if (!ctx) throw new Error("useNewProject must be used inside <NewProjectProvider>");
  return ctx;
}
