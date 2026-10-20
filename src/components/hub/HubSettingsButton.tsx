"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { HubSettingsDialog } from "./HubSettingsDialog";

/** Opens the hub settings dialog; the variant decides how the trigger is presented. */
export function HubSettingsButton({
  projectId,
  variant = "icon",
  label,
  icon = "settings",
}: {
  projectId: string;
  variant?: "icon" | "solid" | "block";
  label?: string;
  icon?: string;
}) {
  const t = useTranslations("progress");
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t("hubSettings")}
          aria-label={t("hubSettings")}
          className="flex items-center rounded p-0.5 text-primary hover:bg-surface-container"
        >
          <Icon name="settings" className="text-[14px]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex items-center gap-1.5 font-mono text-label-sm font-semibold interactive active:scale-95",
            variant === "solid"
              ? "rounded bg-error px-2.5 py-1.5 text-white shadow-sm hover:bg-on-error-container"
              : "w-full justify-center rounded-lg border border-surface-variant bg-surface-container px-3 py-2 font-sans text-body-sm text-on-surface hover:bg-surface-container-high",
          )}
        >
          <Icon name={icon} className={variant === "solid" ? "text-[15px]" : "text-[16px] text-primary"} />
          {label ?? t("hubSettings")}
        </button>
      )}
      <HubSettingsDialog projectId={projectId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
