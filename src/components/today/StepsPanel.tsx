"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { statusFromItems } from "@/lib/steps";
import type { StepDto } from "@/lib/types";

type Action =
  | { type: "step"; id: string; status: StepDto["status"] }
  | { type: "item"; id: string; done: boolean }
  | { type: "complete" };

type State = { steps: StepDto[]; completed: boolean };

function reduce(state: State, a: Action): State {
  if (a.type === "complete") return { ...state, completed: true };
  return {
    ...state,
    steps: state.steps.map((s) => {
      if (a.type === "step") return s.id === a.id ? { ...s, status: a.status } : s;
      if (!s.items.some((i) => i.id === a.id)) return s;
      const items = s.items.map((i) => (i.id === a.id ? { ...i, done: a.done } : i));
      return { ...s, items, status: statusFromItems(items) };
    }),
  };
}

export function StepsPanel({
  projectId,
  day,
  totalDays,
  planTitle,
  steps,
  completed,
}: {
  projectId: string;
  day: number;
  totalDays: number;
  planTitle: string;
  steps: StepDto[];
  completed: boolean;
}) {
  const t = useTranslations("steps");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [state, apply] = useOptimistic<State, Action>({ steps, completed }, reduce);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Optimistic update, REST call, then refresh server data. On failure the optimistic state rolls back.
  const mutate = (action: Action, request: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      apply(action);
      try {
        await request();
        router.refresh();
      } catch {
        setError(tc("genericError"));
      }
    });
  };

  const doneCount = state.steps.filter((s) => s.status === "done").length;

  return (
    <>
      <ol aria-label={t("label")} className="space-y-space-md">
        {state.steps.map((step) => {
          const done = step.status === "done";
          const doing = step.status === "doing";
          const title = step.title;
          return (
            <li key={step.id}>
              <Card
                as="article"
                className={cn("flex items-start gap-space-sm p-space-md shadow-sm", doing && "border-2 border-primary", done && "opacity-80")}
              >
                <div className="pt-0.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done ? true : doing ? "mixed" : false}
                    aria-label={done ? t("markTodo", { title }) : t("markDone", { title })}
                    title={done ? t("done") : doing ? t("doing") : t("notStarted")}
                    onClick={() => mutate({ type: "step", id: step.id, status: done ? "todo" : "done" }, () => api(`/steps/${step.id}`, { method: "PATCH", body: { status: done ? "todo" : "done" } }))}
                    className={cn(
                      "flex size-5 items-center justify-center rounded transition-colors",
                      done ? "bg-primary-container text-white shadow-sm" : doing ? "border-2 border-primary-container bg-surface-container-low" : "border border-outline-variant bg-surface-container-low hover:border-primary",
                    )}
                  >
                    {done ? <Icon name="check" className="text-[15px]" /> : doing ? <span className="size-2 rounded-sm bg-primary-container" /> : null}
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className={cn("font-mono text-[11px]", doing ? "font-bold text-primary" : "text-outline")}>
                      {t("stepOf", { n: step.position, total: state.steps.length })}
                    </span>
                    <span className="flex items-center gap-1">
                      {doing ? <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">{t("doing")}</span> : null}
                      {done && step.completedAt ? (
                        <span title={t("completedAt")} className="flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 font-mono text-[11px] text-outline">
                          <Icon name="done_all" className="text-[12px]" />
                          {format.dateTime(new Date(step.completedAt), { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                      ) : null}
                      {!done && step.requiresPhoto ? (
                        <span className="flex items-center gap-0.5 rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
                          <Icon name="photo_camera" className="text-[12px]" /> {t("samplePhoto")}
                        </span>
                      ) : null}
                      {!done && step.estimatedMinutes ? (
                        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", doing ? "bg-primary-fixed/40 text-on-primary-fixed" : "bg-surface-container text-outline")}>
                          ⏱ {t("minutes", { count: step.estimatedMinutes })}
                        </span>
                      ) : null}
                    </span>
                  </div>

                  <h3 className={cn("text-title-sm", done ? "font-semibold text-outline line-through" : doing ? "font-bold text-on-surface" : "text-on-surface")}>{title}</h3>
                  {step.description ? (
                    <p className={cn("mt-0.5 text-body-sm", done ? "truncate text-outline" : "text-on-surface-variant")}>{step.description}</p>
                  ) : null}

                  {step.items.length > 0 ? (
                    <ul className="mt-space-sm space-y-1.5 rounded-lg border border-surface-variant/60 bg-surface-container-low p-2">
                      {step.items.map((item) => (
                        <li key={item.id}>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={(e) => mutate({ type: "item", id: item.id, done: e.target.checked }, () => api(`/step-items/${item.id}`, { method: "PATCH", body: { done: e.target.checked } }))}
                              className="size-3.5 rounded border-outline-variant accent-primary"
                            />
                            <span className={cn("text-body-sm text-on-surface", item.done && "text-outline line-through")}>{item.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {step.clipSeconds || step.hasCameraShortcut ? (
                    <div className="mt-2 flex items-center gap-3 text-caption">
                      {step.clipSeconds ? (
                        <span title={tc("comingSoon")} className="flex cursor-not-allowed items-center gap-1 text-primary">
                          <Icon name="play_circle" className="text-[15px]" /> {t("clip", { seconds: step.clipSeconds })}
                        </span>
                      ) : null}
                      {step.clipSeconds && step.hasCameraShortcut ? <span aria-hidden="true" className="text-outline-variant">•</span> : null}
                      {step.hasCameraShortcut ? (
                        <a href="#live-cam" className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface">
                          <Icon name="camera_alt" className="text-[15px]" /> {t("cameraCloseup")}
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {step.requiresPhoto ? (
                    <div className="mt-space-sm grid grid-cols-1 gap-space-sm sm:grid-cols-2">
                      <span title={tc("comingSoon")} className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-2.5 text-center">
                        <Icon name="add_a_photo" className="text-[20px] text-outline" />
                        <span className="text-caption text-on-surface">{t("upload")}</span>
                      </span>
                      {step.photos.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 rounded-lg border border-surface-variant bg-surface-container-lowest p-2">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded border border-outline-variant">
                            <Image src={p.url} alt={p.filename} fill sizes="40px" className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-[10px] text-primary">{p.filename}</span>
                            <span className="block text-[11px] font-semibold text-primary">{t("useAsProof")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="mt-space-md flex flex-col items-center justify-between gap-3 p-space-md shadow-sm sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Icon name="verified" />
          </div>
          <div>
            <p className="text-title-sm text-on-surface">{state.completed ? t("dayCompleted", { day }) : t("completeTitle", { day, total: totalDays })}</p>
            <p className="text-[12px] text-on-surface-variant" aria-live="polite">
              {t("completeProgress", { done: doneCount, total: state.steps.length, title: planTitle })}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={state.completed}
          onClick={() => mutate({ type: "complete" }, () => api(`/projects/${projectId}/days/${day}/complete`, { method: "POST" }))}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 text-caption text-white shadow-sm transition-all hover:bg-primary active:scale-[0.98] disabled:cursor-default disabled:opacity-60 sm:w-auto"
        >
          <Icon name="check_circle" className="text-[18px]" />
          {t("completeAction")}
        </button>
      </Card>
      {error ? <p role="alert" className="mt-2 text-body-sm text-error">{error}</p> : null}
    </>
  );
}
