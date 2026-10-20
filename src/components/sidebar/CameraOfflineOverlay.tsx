"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api-client";
import type { HubPingDto } from "@/lib/hub-config";

const MAX_ATTEMPTS = 5;

/** Overlay shown over the camera preview while the RTSP stream is unreachable. */
export function CameraOfflineOverlay({ projectId, cameraLabel }: { projectId: string; cameraLabel: string }) {
  const t = useTranslations("camera");
  const tc = useTranslations("common");
  const router = useRouter();
  const [attempt, setAttempt] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      const ping = await api<HubPingDto>(`/projects/${projectId}/hub/ping`, { method: "POST" });
      if (ping.online) {
        router.refresh();
        return;
      }
      setAttempt((n) => Math.min(MAX_ATTEMPTS, n + 1));
      setError(t("retryFailed"));
    } catch {
      setError(tc("genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-4 text-center backdrop-blur-sm">
      <Icon name="videocam_off" className="text-[32px] text-error" />
      <p className="text-[13px] font-semibold text-white">{t("cameraLost", { name: cameraLabel })}</p>
      <p className="max-w-[220px] text-[11px] text-surface-variant">{t("reconnecting", { attempt, max: MAX_ATTEMPTS })}</p>
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="mt-1 flex items-center gap-1 rounded-lg bg-surface-container-lowest/90 px-3 py-1 font-mono text-[11px] font-semibold text-on-surface shadow-sm interactive active:scale-95 hover:bg-surface-container-lowest disabled:opacity-60"
      >
        <Icon name="sync" className="text-[14px] text-primary" />
        {busy ? t("retrying") : t("retry")}
      </button>
      {error ? (
        <p role="alert" className="text-[11px] text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
