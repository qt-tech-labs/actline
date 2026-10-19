"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/** Native <dialog>: focus trap, Esc to close and backdrop come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cn("m-auto rounded-xl border border-card-border bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-inverse-surface/40", wide ? "w-[min(96vw,60rem)]" : "w-[min(92vw,28rem)]")}
    >
      <div className="flex items-center justify-between border-b border-surface-variant px-space-lg py-space-md">
        <h2 className="font-display text-headline-md">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container">
          <Icon name="close" />
        </button>
      </div>
      <div className="p-space-lg">{open ? children : null}</div>
    </dialog>
  );
}
