"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useNewProject } from "./NewProjectProvider";

/** What went wrong, in plain words, with a way to try again. */
export function PlanErrorNotice() {
  const t = useTranslations("newProject");
  const { error, retry, dismissError, busy } = useNewProject();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3"
    >
      <span aria-hidden="true" className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-error-container text-error">
        <Icon name="warning" className="text-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-title-sm font-semibold text-on-surface">{t(`errors.${error.action}`)}</p>
        <p className="text-body-sm text-on-surface-variant">{t(`errors.reason.${error.code}`)}</p>
        {error.detail ? (
          <p className="mt-1 break-words font-mono text-[11px] text-outline">{error.detail}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void retry()}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-variant bg-surface px-3 py-1.5 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="refresh" className="text-[16px] text-primary" />
          {t("errors.retry")}
        </button>
        <button
          type="button"
          onClick={dismissError}
          aria-label={t("errors.dismiss")}
          className="flex size-8 items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
