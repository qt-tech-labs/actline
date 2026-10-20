"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { dayMonthLabel } from "@/lib/day";
import type { TimelineNode } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
/** Height of the band the markers sit in; the track line is centred on it. */
const MARKER_BAND = "h-10";

function NodeView({
  node,
  projectId,
  selected,
}: {
  node: TimelineNode;
  projectId: string;
  selected: boolean;
}) {
  const t = useTranslations("timeline");
  const code = t("dayLabel", { day: pad(node.day) });
  const date = dayMonthLabel(node.date);
  const href = `/?project=${projectId}&day=${node.day}`;

  if (node.isMinor) {
    return (
      <li title={node.title} className={cn("relative z-10 flex flex-col items-center", node.state === "done" ? "opacity-60" : "opacity-40")}>
        <Link
          href={href}
          aria-label={t("review", { day: code })}
          className={cn("flex items-center justify-center", MARKER_BAND)}
        >
          <span className={cn("size-1.5 rounded-full", node.state === "done" ? "bg-primary" : "bg-outline-variant", selected && "ring-2 ring-primary")} />
        </Link>
      </li>
    );
  }

  if (node.state === "today") {
    return (
      <li data-today title={node.title} aria-current="step" className="relative z-20 mx-2 flex flex-col items-center">
        <Link
          href={`/?project=${projectId}`}
          aria-label={t("today", { day: pad(node.day) })}
          className={cn("flex items-center justify-center", MARKER_BAND)}
        >
          <span className="flex scale-105 items-center gap-1.5 rounded-full border border-primary-fixed bg-primary-container px-3.5 py-1.5 text-white shadow-[0_0_16px_rgba(45,90,70,0.4)] ring-4 ring-primary-fixed">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-primary-fixed-dim opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            <span className="whitespace-nowrap font-mono text-[11px] font-bold tracking-tight">{t("today", { day: pad(node.day) })}</span>
          </span>
        </Link>
        <span className="mt-1.5 whitespace-nowrap font-mono text-[10px] font-bold text-primary">{date}</span>
        <span className="whitespace-nowrap text-[10px] text-on-surface-variant">{node.label}</span>
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
      <Link href={href} aria-label={t("review", { day: code })} className="group flex flex-col items-center">
        <span className={cn("flex items-center justify-center", MARKER_BAND)}>
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full shadow-sm interactive",
              circle,
              selected && "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low",
              "group-hover:ring-2 group-hover:ring-primary-fixed",
            )}
          >
            {done ? (
              <Icon name="check" fill className="text-[13px]" />
            ) : node.icon ? (
              <Icon name={node.icon} className="text-[13px]" />
            ) : (
              <span className="font-mono text-[10px] font-medium">{node.day}</span>
            )}
          </span>
        </span>
        <span className={cn("mt-1 whitespace-nowrap font-mono text-[10px]", done ? "font-bold text-primary" : accent ? "font-bold text-secondary" : "text-on-surface-variant")}>
          {code}
          <span className="text-outline"> · {date}</span>
        </span>
        <span className={cn("max-w-[72px] truncate text-center text-[10px]", accent && !done ? "font-semibold text-secondary" : "text-outline")}>{node.label}</span>
      </Link>
    </li>
  );
}

export function MilestoneTimeline({
  projectId,
  nodes,
  progressPct,
  selectedDay,
}: {
  projectId: string;
  nodes: TimelineNode[];
  progressPct: number;
  /** The day the main view is showing. */
  selectedDay: number;
}) {
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
        {/* The track is centred on the marker band, so it runs through the circles. */}
        <div className="relative min-w-[1120px] px-4">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-5 z-0 flex h-1 -translate-y-1/2">
            <div className="h-full rounded-l-full bg-primary" style={{ width: `${progressPct}%` }} />
            <div className="mt-px h-full flex-1 border-t-2 border-dashed border-outline-variant/70" />
          </div>
          <ol className="relative flex items-start justify-between">
            {nodes.map((n) => (
              <NodeView key={n.day} node={n} projectId={projectId} selected={n.day === selectedDay} />
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
