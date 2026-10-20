"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * One planning knob. The value is either set by the user or left to the AI —
 * a three-month renovation is not a 30-day job, so the right numbers depend on
 * the topic.
 */
export function ParamKnob({
  id,
  icon,
  label,
  auto,
  onToggleAuto,
  children,
}: {
  id: string;
  icon: string;
  label: string;
  /** True when the AI decides this value. */
  auto: boolean;
  onToggleAuto: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("newProject");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-1 font-mono text-label-sm text-on-surface-variant">
          <Icon name={icon} className="text-[14px] text-outline" />
          {label}
        </label>
        <button
          type="button"
          onClick={onToggleAuto}
          aria-pressed={auto}
          title={auto ? t("params.aiTitle") : t("params.manualTitle")}
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors duration-150",
            auto
              ? "bg-primary-fixed text-on-primary-fixed"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
          )}
        >
          {auto ? t("params.ai") : t("params.manual")}
        </button>
      </div>
      {children}
    </div>
  );
}
