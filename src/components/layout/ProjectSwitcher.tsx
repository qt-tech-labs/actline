"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ProjectSummary } from "@/lib/types";

export function ProjectSwitcher({ projects, activeId }: { projects: ProjectSummary[]; activeId: string }) {
  const t = useTranslations("switcher");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = projects.find((p) => p.id === activeId);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("label")}
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-on-surface transition-colors hover:bg-surface-container"
      >
        <Icon name={active?.icon ?? "psychiatry"} className="text-[17px] text-primary" />
        <span className="max-w-[10rem] truncate text-[13px] font-semibold text-primary">{active?.name}</span>
        <Icon name="expand_more" className="text-[16px] text-outline transition-colors group-hover:text-primary" />
      </button>
      {open ? (
        <ul role="listbox" aria-label={t("heading")} className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-card-border bg-surface-container-lowest p-1 shadow-lg">
          {projects.map((p) => (
            <li key={p.id} role="option" aria-selected={p.id === activeId}>
              <Link
                href={`/?project=${p.id}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm hover:bg-surface-container ${p.id === activeId ? "font-semibold text-primary" : "text-on-surface-variant"}`}
              >
                <Icon name={p.icon} className="text-[18px]" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-mono text-label-sm text-outline">N{String(p.currentDay).padStart(2, "0")}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
