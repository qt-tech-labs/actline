"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FALLBACK_PARAMS, PLAN_PROVIDERS, SUGGESTIONS } from "@/lib/blueprint";
import type { BlueprintExperience } from "@/lib/types";
import { ParamKnob } from "./ParamKnob";
import { useNewProject } from "./NewProjectProvider";

/** Whole seconds since `since`, ticking once a second. */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{Math.max(0, Math.round((now - since) / 1000))}</>;
}

/** What the studio is doing right now, or how the last run ended. */
function PlanStatus() {
  const t = useTranslations("newProject");
  const { provider, generatingSince, lastRun } = useNewProject();

  if (generatingSince !== null) {
    return (
      <p role="status" className="flex items-center gap-2 text-body-sm text-primary">
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span>
          {t("status.generating", { model: t(`models.${provider}`) })} <Elapsed since={generatingSince} />s
        </span>
      </p>
    );
  }
  if (!lastRun) return null;
  return (
    <p role="status" className={`flex items-center gap-2 text-body-sm ${lastRun.engine === "ai" ? "text-primary" : "text-secondary"}`}>
      <Icon name={lastRun.engine === "ai" ? "check_circle" : "warning"} fill className="text-[16px]" />
      {lastRun.engine === "ai"
        ? t("status.done", { model: lastRun.model ?? t(`models.${lastRun.provider}`), seconds: lastRun.seconds })
        : t("status.template", { provider: t(`models.${lastRun.provider}`), seconds: lastRun.seconds })}
    </p>
  );
}

/** Section 1 — the AI idea generator: free text, sample plans and the planning knobs. */
export function IdeaGenerator() {
  const t = useTranslations("newProject");
  const format = useFormatter();
  const { prompt, params, provider, setProvider, setPrompt, setParams, generate, busy, dirty, suggestion } = useNewProject();
  const generating = busy === "generate";

  return (
    <section className="relative overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgba(30,38,33,0.04)] md:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-10 size-64 rounded-full bg-primary-fixed/20 blur-3xl" />

      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 self-start rounded-md bg-primary-fixed px-2.5 py-1 font-mono text-label-sm text-on-primary-fixed">
            <Icon name="auto_awesome" fill className="text-[14px]" />
            {t("engine")}
          </span>
          <h1 className="font-display text-headline-lg font-bold tracking-tight text-on-surface">{t("headline")}</h1>
          <p className="text-body-lg text-on-surface-variant">{t("intro")}</p>
        </div>

        <div className="relative rounded-xl border-2 border-surface-variant bg-surface p-4 shadow-inner interactive focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
          <label htmlFor="idea-prompt" className="sr-only">
            {t("promptLabel")}
          </label>
          <textarea
            id="idea-prompt"
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t("promptPlaceholder")}
            className="w-full resize-none border-0 bg-transparent p-0 text-body-lg text-on-surface placeholder:text-outline/70 focus:ring-0"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-surface-variant/80 pt-3">
            <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Icon name="tips_and_updates" className="text-[14px] text-primary" />
              <span className="font-mono text-label-sm text-outline">{t("knowledge")}</span>
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="plan-provider" className="text-label-sm text-on-surface-variant">
                  {t("modelLabel")}
                </label>
                <select
                  id="plan-provider"
                  value={provider}
                  disabled={generating}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    const next = PLAN_PROVIDERS.find((name) => name === value);
                    if (next) setProvider(next);
                  }}
                  className="min-w-40 rounded-lg border border-surface-variant bg-surface px-3 py-2.5 text-body-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {PLAN_PROVIDERS.map((name) => (
                    <option key={name} value={name}>
                      {t(`models.${name}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={generating || prompt.trim().length < 8}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-title-sm text-on-primary shadow-sm interactive hover:bg-primary-container active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="smart_toy" className="text-[18px]" />
                {generating ? t("generating") : t("generate")}
                <Icon name="arrow_forward" className="ml-0.5 text-[16px]" />
              </button>
            </div>
          </div>
        </div>

        <PlanStatus />

        {dirty && !generating ? <p className="text-body-sm text-secondary">{t("stale")}</p> : null}

        <div className="flex flex-col gap-2">
          <span className="font-mono text-label-sm uppercase tracking-wider text-outline">{t("suggestionsLabel")}</span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.key}
                type="button"
                onClick={() => setPrompt(suggestion.prompt)}
                className="flex items-center gap-1.5 rounded-full border border-surface-variant bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface transition-colors hover:bg-surface-container"
              >
                <Icon name={suggestion.icon} className="text-[14px] text-primary" />
                {t(`suggestions.${suggestion.key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-surface-variant bg-surface-container-low p-4 sm:grid-cols-2 lg:grid-cols-4">
          <ParamKnob
            id="param-duration"
            icon="event_repeat"
            label={t("params.duration")}
            auto={params.totalDays === null}
            onToggleAuto={() =>
              setParams({ ...params, totalDays: params.totalDays === null ? (suggestion?.totalDays ?? FALLBACK_PARAMS.totalDays) : null })
            }
          >
            <input
              id="param-duration"
              type="number"
              min={7}
              max={365}
              disabled={params.totalDays === null}
              value={params.totalDays ?? ""}
              placeholder={suggestion?.totalDays ? `${suggestion.totalDays} · ${t("params.aiValue")}` : t("params.aiValue")}
              onChange={(event) => setParams({ ...params, totalDays: Number(event.target.value) })}
              className="w-full rounded-lg border border-surface-variant bg-surface px-3 py-2 font-mono text-body-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
            />
          </ParamKnob>

          <ParamKnob
            id="param-time"
            icon="timer"
            label={t("params.dailyTime")}
            auto={params.dailyMinutes === null}
            onToggleAuto={() =>
              setParams({
                ...params,
                dailyMinutes: params.dailyMinutes === null ? (suggestion?.dailyMinutes ?? FALLBACK_PARAMS.dailyMinutes) : null,
              })
            }
          >
            <input
              id="param-time"
              type="number"
              min={10}
              max={600}
              step={5}
              disabled={params.dailyMinutes === null}
              value={params.dailyMinutes ?? ""}
              placeholder={suggestion?.dailyMinutes ? `${suggestion.dailyMinutes} · ${t("params.aiValue")}` : t("params.aiValue")}
              onChange={(event) => setParams({ ...params, dailyMinutes: Number(event.target.value) })}
              className="w-full rounded-lg border border-surface-variant bg-surface px-3 py-2 font-mono text-body-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
            />
          </ParamKnob>

          <ParamKnob
            id="param-budget"
            icon="payments"
            label={t("params.budget")}
            auto={params.budgetVnd === null}
            onToggleAuto={() =>
              setParams({ ...params, budgetVnd: params.budgetVnd === null ? (suggestion?.budgetVnd ?? FALLBACK_PARAMS.budgetVnd) : null })
            }
          >
            <input
              id="param-budget"
              type="text"
              inputMode="numeric"
              disabled={params.budgetVnd === null}
              value={params.budgetVnd === null ? "" : `${format.number(params.budgetVnd)} VNĐ`}
              placeholder={suggestion?.budgetVnd ? `${format.number(suggestion.budgetVnd)} · ${t("params.aiValue")}` : t("params.aiValue")}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "");
                setParams({ ...params, budgetVnd: digits ? Math.min(Number(digits), 1_000_000_000) : 0 });
              }}
              className="w-full rounded-lg border border-surface-variant bg-surface px-3 py-2 font-mono text-body-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
            />
          </ParamKnob>

          <ParamKnob
            id="param-experience"
            icon="school"
            label={t("params.experience")}
            auto={params.experience === null}
            onToggleAuto={() =>
              setParams({
                ...params,
                experience: params.experience === null ? (suggestion?.experience ?? FALLBACK_PARAMS.experience) : null,
              })
            }
          >
            <select
              id="param-experience"
              disabled={params.experience === null}
              value={params.experience ?? ""}
              onChange={(event) => setParams({ ...params, experience: event.target.value as BlueprintExperience })}
              className="w-full rounded-lg border border-surface-variant bg-surface px-3 py-2 text-body-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {params.experience === null ? (
                <option value="">{suggestion?.experience ? `${t(`experienceOptions.${suggestion.experience}`)} · ${t("params.aiValue")}` : t("params.aiValue")}</option>
              ) : null}
              <option value="beginner">{t("experienceOptions.beginner")}</option>
              <option value="basic">{t("experienceOptions.basic")}</option>
              <option value="pro">{t("experienceOptions.pro")}</option>
            </select>
          </ParamKnob>
        </div>
      </div>
    </section>
  );
}
