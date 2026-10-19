"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api-client";

/** Call to action for projects that have not opted in to IoT (it is a suggestion, never required). */
export function EnableIotButton({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const t = useTranslations("progress");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  // Enabled but no hub row yet reported: nothing to offer here.
  if (enabled) return null;

  const enable = () => {
    setError(false);
    startTransition(async () => {
      try {
        await api(`/projects/${projectId}`, { method: "PATCH", body: { iotEnabled: true } });
        router.refresh();
      } catch {
        setError(true);
      }
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      {error ? <span role="alert" className="text-caption text-error">{tc("genericError")}</span> : null}
      <button
        type="button"
        onClick={enable}
        disabled={pending}
        title={t("connectIotHint")}
        className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-0.5 text-caption font-semibold text-primary hover:bg-surface-container disabled:opacity-60"
      >
        <Icon name="hub" className="text-[15px]" />
        {t("connectIot")}
      </button>
    </div>
  );
}
