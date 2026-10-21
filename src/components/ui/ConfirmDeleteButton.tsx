"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * A destructive action that asks first: the trash morphs into a check and the
 * second press deletes. Both icons live in the same grid cell, so the button
 * never changes size and the rows around it never reflow.
 */
export function ConfirmDeleteButton({
  confirming,
  onConfirm,
  label,
  size = "sm",
  disabled,
}: {
  confirming: boolean;
  onConfirm: () => void;
  /** What the button does now, for screen readers and the tooltip. */
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const t = useTranslations("finance");
  const text = confirming ? t("removeConfirm") : label;
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={disabled}
      aria-label={text}
      title={text}
      aria-pressed={confirming}
      className={cn(
        "grid place-items-center rounded transition-colors disabled:opacity-50",
        size === "sm" ? "size-5" : "size-6",
        confirming
          ? "bg-error/10 text-error"
          : "text-outline [@media(hover:hover)_and_(pointer:fine)]:hover:text-error",
      )}
    >
      <Icon
        name="delete"
        className={cn(
          "morph col-start-1 row-start-1",
          confirming ? "scale-90 opacity-0" : "scale-100 opacity-100",
        )}
      />
      <Icon
        name="check"
        className={cn(
          "morph col-start-1 row-start-1",
          confirming ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      />
    </button>
  );
}
