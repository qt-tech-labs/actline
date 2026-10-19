"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { HubSettingsDialog } from "./HubSettingsDialog";

/** Gear button in the sub-header that opens the hub settings dialog. */
export function HubSettingsButton({ projectId }: { projectId: string }) {
  const t = useTranslations("progress");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("hubSettings")}
        aria-label={t("hubSettings")}
        className="flex items-center rounded p-0.5 text-primary hover:bg-surface-container"
      >
        <Icon name="settings" className="text-[14px]" />
      </button>
      <HubSettingsDialog projectId={projectId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
