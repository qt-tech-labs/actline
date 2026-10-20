"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HubSettingsButton } from "@/components/hub/HubSettingsButton";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api-client";
import type { HubPingDto } from "@/lib/hub-config";

/** Banner shown above the sensor cards while the hub is not connected. */
export function HubOfflineBanner({
  projectId,
  hubName,
  signalLost,
  lastReading,
}: {
  projectId: string;
  hubName: string;
  /** "42 phút trước" */
  signalLost: string;
  /** "07:42" */
  lastReading: string | null;
}) {
  const t = useTranslations("metrics");
  const tc = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  const check = async () => {
    setBusy(true);
    setResult(null);
    try {
      const ping = await api<HubPingDto>(`/projects/${projectId}/hub/ping`, { method: "POST" });
      if (ping.online) {
        setResult({ text: t("gatewayOk", { sec: ping.ageSeconds ?? 0 }), ok: true });
        router.refresh();
      } else {
        setResult({ text: t("gatewayFail"), ok: false });
      }
    } catch {
      setResult({ text: tc("genericError"), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-space-sm flex flex-wrap items-center justify-between gap-2 rounded-xl border border-error/40 bg-error-container/30 p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-error text-white">
          <Icon name="sensors_off" className="text-[20px]" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-title-sm font-bold text-error">
            <Icon name="warning" className="text-[15px]" />
            {t("offlineTitle", { hub: hubName, time: signalLost })}
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {lastReading ? t("offlineHint", { time: lastReading }) : t("offlineHintNoData")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={check}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-1.5 font-mono text-label-sm font-semibold text-on-surface shadow-sm interactive hover:bg-surface-container disabled:opacity-60"
        >
          <Icon name="refresh" className="text-[15px] text-outline" />
          {busy ? t("checking") : t("checkGateway")}
        </button>
        <HubSettingsButton projectId={projectId} variant="solid" icon="settings" label={t("configureIot")} />
      </div>

      {result ? (
        <p role={result.ok ? "status" : "alert"} className={`w-full text-center text-body-sm ${result.ok ? "text-primary" : "text-error"}`}>
          {result.text}
        </p>
      ) : null}
    </div>
  );
}
