"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import type { Blueprint } from "@/lib/types";
import { useNewProject } from "./NewProjectProvider";

/** Section 3 — the persistent action bar under the whole studio. */
export function ActionBar({ blueprint }: { blueprint: Blueprint | null }) {
  const t = useTranslations("newProject");
  const { saveDraft, start, reset, busy, notice, blueprintId } = useNewProject();

  const refine = () => {
    const field = document.getElementById("idea-prompt");
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus();
  };

  return (
    <div className="sticky bottom-6 z-40 flex flex-col items-center justify-between gap-4 rounded-xl border border-surface-variant bg-surface/95 p-4 shadow-lg backdrop-blur-md sm:flex-row">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-bold text-primary">
          <Icon name={blueprint ? "task" : "auto_awesome"} className="text-[20px]" />
        </span>
        <div>
          <p className="text-title-sm text-on-surface">{blueprint ? t("actions.ready") : t("actions.pending")}</p>
          <p className="text-body-sm text-outline">
            {blueprint
              ? t("actions.readyDetail", {
                  days: blueprint.totalDays,
                  supplies: blueprint.supplies.length,
                  checks: blueprint.checkpointCount,
                })
              : t("actions.pendingDetail")}
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
        {blueprintId ? (
          <button
            type="button"
            onClick={reset}
            disabled={busy !== null}
            className="rounded-lg border border-surface-variant bg-surface px-4 py-2.5 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "reset" ? t("actions.resetting") : t("actions.reset")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={saveDraft}
          disabled={busy !== null || !blueprint}
          className="rounded-lg border border-surface-variant bg-surface px-4 py-2.5 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("actions.saveDraft")}
        </button>
        <button
          type="button"
          onClick={refine}
          className="flex items-center gap-1.5 rounded-lg border border-surface-variant bg-surface px-4 py-2.5 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="tune" className="text-[16px]" />
          {t("actions.refine")}
        </button>
        <button
          type="button"
          onClick={start}
          disabled={busy !== null || !blueprint}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-title-sm text-on-primary shadow-md interactive hover:bg-primary-container hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="play_arrow" fill className="text-[18px]" />
          {busy === "start" ? t("actions.starting") : t("actions.start")}
        </button>
      </div>

      <p aria-live="polite" className="w-full text-center text-body-sm text-secondary sm:w-auto">
        {notice === "draft" ? t("actions.draftSaved") : ""}
      </p>
    </div>
  );
}
