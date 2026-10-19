"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { TimelineNode } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

function NodeView({ node }: { node: TimelineNode }) {
  const t = useTranslations("timeline");
  const code = t("dayLabel", { day: pad(node.day) });

  if (node.isMinor) {
    return (
      <li title={node.title} className={cn("relative z-10 flex flex-col items-center", node.state === "done" ? "opacity-60" : "opacity-40")}>
        <span className={cn("size-1.5 rounded-full", node.state === "done" ? "bg-primary" : "bg-outline-variant")} />
      </li>
    );
  }

  if (node.state === "today") {
    return (
      <li data-today title={node.title} aria-current="step" className="relative z-20 mx-2 flex flex-col items-center">
        <div className="flex scale-105 items-center gap-1.5 rounded-full border border-primary-fixed bg-primary-container px-3.5 py-1.5 text-white shadow-[0_0_16px_rgba(45,90,70,0.4)] ring-4 ring-primary-fixed">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-fixed-dim opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          <span className="whitespace-nowrap font-mono text-[11px] font-bold tracking-tight">{t("today", { day: pad(node.day) })}</span>
        </div>
        <span className="mt-1.5 whitespace-nowrap font-mono text-[10px] font-bold text-primary">{node.label}</span>
      </li>
    );
  }

  const done = node.state === "done";
  const accent = node.kind !== "standard";
  const circle = done
    ? "bg-primary text-white"
    : node.kind === "target"
      ? "bg-secondary-fixed text-on-secondary-fixed ring-1 ring-secondary/40"
      : node.kind === "shopping"
        ? "border-2 border-secondary bg-surface-container-lowest text-secondary"
        : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant";

  return (
    <li title={node.title} className="relative z-10 flex flex-col items-center">
      <div className={cn("flex size-6 items-center justify-center rounded-full shadow-sm", circle)}>
        {done ? (
          <Icon name="check" fill className="text-[13px]" />
        ) : node.icon ? (
          <Icon name={node.icon} className="text-[13px]" />
        ) : (
          <span className="font-mono text-[10px] font-medium">{node.day}</span>
        )}
      </div>
      <span className={cn("mt-1 font-mono text-[10px]", done ? "font-bold text-primary" : accent ? "font-bold text-secondary" : "text-on-surface-variant")}>{code}</span>
      <span className={cn("max-w-[55px] truncate text-center text-[10px]", accent && !done ? "font-semibold text-secondary" : "text-outline")}>{node.label}</span>
    </li>
  );
}

export function MilestoneTimeline({ nodes, progressPct }: { nodes: TimelineNode[]; progressPct: number }) {
  const t = useTranslations("timeline");
  const scroller = useRef<HTMLDivElement>(null);

  // Centre the "today" node on first paint (scrollLeft only: never scrolls the page).
  useEffect(() => {
    const box = scroller.current;
    const today = box?.querySelector<HTMLElement>("[data-today]");
    if (!box || !today) return;
    box.scrollLeft = today.offsetLeft - box.clientWidth / 2 + today.offsetWidth / 2;
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const box = scroller.current;
    if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollBy({ left: dir * box.clientWidth * 0.7, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow = "z-20 flex size-7 shrink-0 items-center justify-center rounded-lg border border-surface-variant bg-surface-container-lowest text-outline shadow-sm transition-colors hover:bg-surface-container hover:text-primary";

  return (
    <div className="relative flex w-full items-center overflow-hidden rounded-xl border border-surface-variant/80 bg-surface-container-low/70 p-2 px-3">
      <button type="button" onClick={() => scrollBy(-1)} title={t("prev")} aria-label={t("prev")} className={cn(arrow, "mr-2")}>
        <Icon name="chevron_left" className="text-[16px]" />
      </button>
      <div ref={scroller} className="scrollbar-none relative flex-1 overflow-x-auto py-2" role="region" aria-label={t("label")} tabIndex={0}>
        <div className="relative min-w-[1120px] px-4">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-3 z-0 flex h-1 -translate-y-1/2">
            <div className="h-full rounded-l-full bg-primary" style={{ width: `${progressPct}%` }} />
            <div className="mt-px h-full flex-1 border-t-2 border-dashed border-outline-variant/70" />
          </div>
          <ol className="relative flex items-center justify-between">
            {nodes.map((n) => (
              <NodeView key={n.day} node={n} />
            ))}
          </ol>
        </div>
      </div>
      <button type="button" onClick={() => scrollBy(1)} title={t("next")} aria-label={t("next")} className={cn(arrow, "ml-2")}>
        <Icon name="chevron_right" className="text-[16px]" />
      </button>
    </div>
  );
}
