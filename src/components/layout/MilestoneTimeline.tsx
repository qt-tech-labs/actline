"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { dayMonthLabel } from "@/lib/day";
import { phaseColor } from "@/lib/phases";
import type { TimelineNode, TimelinePhase } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
/** Height of the band the markers sit in; the track line is centred on it. */
const MARKER_BAND = "h-10";
/** Height of the coloured phase header; the track sits below it. */
const PHASE_HEAD = "h-[22px]";
/** Where the track starts before it is measured against the marker band. */
const TRACK_OFFSET = 46;

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

/** The nodes of one phase, in day order. Nodes outside every phase keep their own group. */
type Section = { phase: TimelinePhase | null; color: string | null; nodes: TimelineNode[]; span: number };

function groupByPhase(nodes: TimelineNode[], phases: TimelinePhase[]): Section[] {
  const sections: Section[] = [];
  for (const node of nodes) {
    const index = phases.findIndex((p) => node.day >= p.startDay && node.day <= p.endDay);
    const phase = index >= 0 ? (phases[index] ?? null) : null;
    const color = index >= 0 ? phaseColor(index) : null;
    const last = sections[sections.length - 1];
    if (last && last.phase?.id === phase?.id) {
      last.nodes.push(node);
    } else {
      sections.push({ phase, color, nodes: [node], span: 0 });
    }
  }
  // A section grows with the number of days it covers, so the ribbon keeps the
  // shape of the plan: a long phase gets a long piece of the track.
  for (const section of sections) {
    const first = section.nodes[0];
    const last = section.nodes[section.nodes.length - 1];
    section.span = section.phase
      ? section.phase.endDay - section.phase.startDay + 1
      : first && last
        ? last.day - first.day + 1
        : 1;
  }
  return sections;
}

export function MilestoneTimeline({
  projectId,
  nodes,
  phases,
  progressPct,
  selectedDay,
}: {
  projectId: string;
  nodes: TimelineNode[];
  phases: TimelinePhase[];
  progressPct: number;
  /** The day the main view is showing. */
  selectedDay: number;
}) {
  const t = useTranslations("timeline");
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const sections = groupByPhase(nodes, phases);

  // Centre the "today" node on first paint (scrollLeft only: never scrolls the page)
  // and let the solid track end where today is. The icon font and the text fonts
  // land after the first paint and change the widths, so both are redone while
  // the content still resizes.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    const sync = () => {
      const today = box.querySelector<HTMLElement>("[data-today]");
      if (!today || cancelled) return;
      // The sections are sized by their content, so their widths are what change
      // when the fonts land: watch them, not just the scroller.
      content.current?.querySelectorAll("ol > li").forEach((el) => observer?.observe(el));
      // 1. centre today in the scroller
      const boxRect = box.getBoundingClientRect();
      const todayRect = today.getBoundingClientRect();
      box.scrollLeft += todayRect.left - boxRect.left - (box.clientWidth - todayRect.width) / 2;
      // 2. the solid track stops at today. The nodes are grouped by phase, so the
      // share of finished days is not the share of the track. Both rects are read
      // after the scroll, so they belong to the same frame.
      const track = box.querySelector<HTMLElement>("[data-track]");
      if (track && fill.current) {
        const trackRect = track.getBoundingClientRect();
        const after = today.getBoundingClientRect();
        const ratio = (after.left + after.width / 2 - trackRect.left) / trackRect.width;
        fill.current.style.width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
        // The line runs through the middle of the markers: its height is read
        // from the band, so the header and the padding can change freely.
        const band = today.querySelector<HTMLElement>("a");
        if (band && content.current) {
          const contentRect = content.current.getBoundingClientRect();
          const bandRect = band.getBoundingClientRect();
          track.style.top = `${bandRect.top - contentRect.top + bandRect.height / 2}px`;
        }
      }
    };
    observer = new ResizeObserver(() => sync());
    sync();
    observer.observe(box);
    if (content.current) observer.observe(content.current);
    void document.fonts?.ready.then(() => sync());
    return () => {
      cancelled = true;
      observer.disconnect();
    };
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
        <div ref={content} className="relative min-w-[1120px] px-4">
          <div
            aria-hidden="true"
            data-track
            className="pointer-events-none absolute inset-x-6 z-0 flex h-1 -translate-y-1/2"
            style={{ top: TRACK_OFFSET }}
          >
            <div ref={fill} className="h-full rounded-l-full bg-primary" style={{ width: `${progressPct}%` }} />
            <div className="mt-px h-full flex-1 border-t-2 border-dashed border-outline-variant/70" />
          </div>
          <ol className="relative flex items-start">
            {sections.map((section, index) => (
              <li
                key={section.phase?.id ?? `loose-${index}`}
                className="flex flex-col"
                style={{ flexGrow: section.span, flexBasis: 0 }}
              >
                {section.phase ? (
                  <span
                    title={t("phaseLabel", {
                      name: section.phase.name,
                      start: t("dayLabel", { day: pad(section.phase.startDay) }),
                      end: t("dayLabel", { day: pad(section.phase.endDay) }),
                    })}
                    className={cn("flex items-center justify-center gap-1.5 px-2", PHASE_HEAD)}
                    style={{ backgroundColor: section.color ?? undefined }}
                  >
                    <span className="min-w-0 max-w-full truncate text-center font-mono text-[10px] font-bold uppercase tracking-wide text-white">
                      {section.phase.name}
                    </span>
                  </span>
                ) : (
                  <span aria-hidden="true" className={cn("block", PHASE_HEAD)} />
                )}
                <ul
                  className="flex items-start justify-between gap-3 px-2 pt-1 pb-2"
                  style={{ backgroundColor: section.color ? `${section.color}14` : undefined }}
                >
                  {section.nodes.map((n) => (
                    <NodeView key={n.day} node={n} projectId={projectId} selected={n.day === selectedDay} />
                  ))}
                </ul>
              </li>
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
