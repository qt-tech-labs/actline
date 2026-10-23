"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { readDebugMock } from "@/lib/debug-mock";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toaster";
import { PLAN_PROVIDERS } from "@/lib/blueprint";
import { api, apiErrorCode, apiErrorDetail } from "@/lib/api-client";
import type { BlueprintOp } from "@/lib/plan-ops";
import type { Blueprint, BlueprintConstraints, BlueprintInput, BlueprintParams, BlueprintProvider } from "@/lib/types";

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

/** The outcome of the last plan generation, for the status label. */
export type GenerationRun = {
  provider: BlueprintProvider;
  /** "ai" when the model answered, "template" when the fallback did. */
  engine: Blueprint["engine"];
  model: string | null;
  seconds: number;
};

type NewProjectState = {
  prompt: string;
  params: BlueprintParams;
  provider: BlueprintProvider;
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
  setProvider: (provider: BlueprintProvider) => void;
  /** The plan day shown in the day browser; the phase cards and the day list both drive it. */
  selectedDay: number;
  selectDay: (day: number) => void;
  setIotEnabled: (iotEnabled: boolean) => void;
  toggleOwned: (name: string) => void;
  setOwnedAll: (names: string[], owned: boolean) => void;
  /** Rebuilds the blueprint from the current form values. */
  generate: (provider?: BlueprintProvider) => Promise<void>;
  /** Keeps the current plan as a draft on this device. */
  saveDraft: () => Promise<void>;
  /** Applies hand edits to the plan (add, edit or remove a node or an action item). */
  applyOps: (ops: BlueprintOp[]) => Promise<void>;
  /** Throws the plan away and starts the studio fresh. */
  reset: () => Promise<void>;
  /** Creates the project and opens it. */
  start: () => Promise<void>;
  busy: Busy;
  /** True while an action's route refresh has not landed on screen yet. */
  syncing: boolean;
  /** When the running generation started (ms since epoch); null when idle. */
  generatingSince: number | null;
  /** How the last generation ended. */
  lastRun: GenerationRun | null;
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
  initialProvider,
  blueprintId,
  suggestion: initialSuggestion = null,
  children,
}: {
  initial: BlueprintInput;
  initialProvider: BlueprintProvider;
  blueprintId: string | null;
  suggestion?: BlueprintConstraints | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  // The crafting card stays up until the refreshed route replaces the stale
  // children — `syncing` covers the gap between the response and the refresh.
  const [syncing, startSync] = useTransition();
  const t = useTranslations("newProject");
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(initial.prompt);
  const [params, setParams] = useState<BlueprintParams>({
    totalDays: initial.totalDays,
    dailyMinutes: initial.dailyMinutes,
    budgetVnd: initial.budgetVnd,
    experience: initial.experience,
  });
  const [provider, setProvider] = useState<BlueprintProvider>(initialProvider);
  const [selectedDay, selectDay] = useState(1);
  const [iotEnabled, setIotEnabledState] = useState<boolean | null>(initial.iotEnabled);
  const [ownedSupplies, setOwnedSupplies] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<BlueprintConstraints | null>(initialSuggestion);
  const [busy, setBusy] = useState<Busy>(null);
  const [generatingSince, setGeneratingSince] = useState<number | null>(null);
  const [lastRun, setLastRun] = useState<GenerationRun | null>(null);
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
    const code = apiErrorCode(cause);
    setError({ action, code, detail: apiErrorDetail(cause) });
    toast("error", t(`errors.${action}`), t(`errors.reason.${code}`));
  }, [t, toast]);

  // The failure toast offers the other model and needs the latest `generate`.
  const generateRef = useRef<(provider?: BlueprintProvider) => Promise<void>>(async () => {});

  const generate = useCallback(async (override?: BlueprintProvider) => {
    const chosen = override ?? provider;
    // Debug drawer: a mocked plan stands in for the model.
    const mock = readDebugMock();
    if (mock && "error" in mock) {
      toast("error", "The mocked plan can't be used", mock.error);
      return;
    }
    if (chosen !== provider) setProvider(chosen);
    setBusy("generate");
    setError(null);
    setNotice(null);
    lastAction.current = { kind: "generate" };
    const startedAt = Date.now();
    setGeneratingSince(startedAt);
    try {
      // Crafting is a fresh start: the previous draft is discarded before the
      // run, so a failed attempt leaves an empty studio (banner + retry)
      // instead of resurrecting the old plan. Best effort — an already-deleted
      // draft must not block a retry; if the discard truly failed, the catch
      // below re-syncs the studio with what the server actually holds.
      if (blueprintId) {
        await api(`/blueprints/${blueprintId}`, { method: "DELETE" }).catch(() => undefined);
      }
      const result = await api<{ constraints: BlueprintConstraints; blueprint: Blueprint }>("/blueprints", {
        method: "POST",
        body: { ...body(), provider: chosen, ...(mock && "plan" in mock ? { mockPlan: mock.plan } : {}) },
      });
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const { engine, model } = result.blueprint;
      setLastRun({ provider: chosen, engine, model, seconds });
      setSuggestion(result.constraints);
      // Keeps the crafting card over the stale children until the refreshed
      // route commits — the old plan must not flash before the new one lands.
      startSync(() => router.refresh());
      if (engine === "ai") {
        toast("success", t("toasts.generated"), t("toasts.generatedDetail", { model: model ?? "", seconds }));
      } else {
        toast("warning", t("toasts.fallback"), t("toasts.fallbackDetail", { provider: t(`models.${chosen}`) }));
      }
    } catch (cause) {
      if (apiErrorCode(cause) === "ai_failed") {
        const other: BlueprintProvider = PLAN_PROVIDERS[(PLAN_PROVIDERS.indexOf(chosen) + 1) % PLAN_PROVIDERS.length]!;
        setError({ action: "generate", code: "ai_failed", detail: apiErrorDetail(cause) });
        toast("error", t("toasts.providerFailed", { provider: t(`models.${chosen}`) }), apiErrorDetail(cause) ?? undefined, {
          label: t("toasts.tryWith", { provider: t(`models.${other}`) }),
          onClick: () => void generateRef.current(other),
        });
      } else {
        fail("generate", cause);
      }
      // The old draft is gone (or the discard itself failed and it is
      // untouched) — re-render so the screen matches what the server holds.
      startSync(() => router.refresh());
    } finally {
      setGeneratingSince(null);
      setBusy(null);
    }
  }, [body, provider, blueprintId, fail, router, startSync, t, toast]);

  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);

  const saveDraft = useCallback(async () => {
    setBusy("draft");
    setError(null);
    lastAction.current = { kind: "draft" };
    try {
      await api("/blueprints", { method: "POST", body: { ...body(), provider } });
      setNotice("draft");
      toast("success", t("toasts.draftSaved"));
    } catch (cause) {
      fail("draft", cause);
    } finally {
      setBusy(null);
    }
  }, [body, provider, fail, t, toast]);

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
      setLastRun(null);
      router.refresh();
      toast("info", t("toasts.reset"));
    } catch (cause) {
      fail("reset", cause);
    } finally {
      setBusy(null);
    }
  }, [blueprintId, fail, router, t, toast]);

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
      void api("/blueprints", { method: "POST", body: { ...initial, iotEnabled: value, provider } })
        .then(() => router.refresh())
        .catch((cause: unknown) => {
          setIotEnabledState(initial.iotEnabled);
          fail("iot", cause);
        });
    },
    [initial, provider, fail, router],
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
      provider,
      iotEnabled,
      ownedSupplies,
      blueprintId,
      suggestion,
      setPrompt,
      setParams,
      setProvider,
      selectedDay,
      selectDay,
      setIotEnabled,
      toggleOwned,
      setOwnedAll,
      generate,
      saveDraft,
      applyOps,
      reset,
      start,
      busy,
      syncing,
      generatingSince,
      lastRun,
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
      provider,
      iotEnabled,
      ownedSupplies,
      blueprintId,
      suggestion,
      setProvider,
      selectedDay,
      setIotEnabled,
      toggleOwned,
      setOwnedAll,
      generate,
      saveDraft,
      applyOps,
      reset,
      start,
      busy,
      syncing,
      generatingSince,
      lastRun,
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
