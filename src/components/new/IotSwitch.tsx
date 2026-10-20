"use client";

import { useTranslations } from "next-intl";
import { useNewProject } from "./NewProjectProvider";

/** The IoT choice is a suggestion the user can accept or decline (FR-9.2). */
export function IotSwitch({ checked }: { checked: boolean }) {
  const t = useTranslations("newProject");
  const { setIotEnabled, busy } = useNewProject();

  return (
    <div className="flex items-center gap-2 text-body-sm text-on-surface">
      <span>{t("blueprint.hardware.enable")}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={t("blueprint.hardware.enable")}
        disabled={busy !== null}
        onClick={() => setIotEnabled(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors duration-150 ${checked ? "bg-primary-container" : "bg-surface-variant"}`}
      >
        {/* The knob moves on the GPU: `translate-x`, never `left`. */}
        <span
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-150 ease-out-strong ${checked ? "translate-x-[22px]" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}
