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
      <li title={node.title} className={cn("relative z-10 flex flex-col items-center", node.missed ? "opacity-100" : node.state === "done" ? "opacity-60" : "opacity-40")}>
        <Link
          href={href}
          data-selected={selected || undefined}
          aria-label={t("review", { day: code })}
          className={cn("flex items-center justify-center", MARKER_BAND)}
        >
          <span className={cn("size-1.5 rounded-full", node.missed ? "bg-error" : node.state === "done" ? "bg-primary" : "bg-outline-variant", selected && "ring-2 ring-primary")} />
        </Link>
      </li>
    );
  }

  if (node.state === "today") {
    return (
      <li data-today title={node.title} aria-current="step" className="relative z-20 mx-2 flex flex-col items-center">
        <Link
          href={`/?project=${projectId}`}
          data-selected={selected || undefined}
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
  const circle = node.missed
    ? "border-2 border-error bg-error-container text-error"
    : done
    ? "bg-primary text-white"
    : node.kind === "target"
      ? "bg-secondary-fixed text-on-secondary-fixed ring-1 ring-secondary/40"
      : node.kind === "shopping"
        ? "border-2 border-secondary bg-surface-container-lowest text-secondary"
        : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant";

  return (
    <li title={node.missed ? `${node.title} · ${t("missed")}` : node.title} className="relative z-10 flex flex-col items-center">
      <Link href={href} aria-label={node.missed ? `${t("review", { day: code })} · ${t("missed")}` : t("review", { day: code })} className="group flex flex-col items-center">
        <span data-selected={selected || undefined} className={cn("flex items-center justify-center", MARKER_BAND)}>
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full shadow-sm interactive",
              circle,
              selected && "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low",
              "group-hover:ring-2 group-hover:ring-primary-fixed",
            )}
          >
            {node.missed ? (
              <Icon name="priority_high" className="text-[14px]" />
            ) : done ? (
              <Icon name="check" fill className="text-[13px]" />
            ) : node.icon ? (
              <Icon name={node.icon} className="text-[13px]" />
            ) : (
              <span className="font-mono text-[10px] font-medium">{node.day}</span>
            )}
          </span>
        </span>
        <span className={cn("mt-1 whitespace-nowrap font-mono text-[10px]", node.missed ? "font-bold text-error" : done ? "font-bold text-primary" : accent ? "font-bold text-secondary" : "text-on-surface-variant")}>
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
  const cursor = useRef<HTMLDivElement>(null);
  const pulse = useRef<HTMLSpanElement>(null);
  const travel = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const lastCentre = useRef<{ x: number; y: number } | null>(null);
  const sections = groupByPhase(nodes, phases);

  // The track: the solid part ends at today, the line runs through the markers,
  // and the day you are looking at stays in view. The icon font and the text
  // fonts land after the first paint and change the widths, so the geometry is
  // redone while the content still resizes.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    /** The marker the track keeps in view: the selected day, or today. */
    const focus = () => box.querySelector<HTMLElement>("[data-selected]") ?? box.querySelector<HTMLElement>("[data-today]");

    /** The geometry of the track. */
    const sync = () => {
      const today = box.querySelector<HTMLElement>("[data-today]");
      if (!today || cancelled) return;
      // The sections are sized by their content, so their widths are what change
      // when the fonts land: watch them, not just the scroller.
      content.current?.querySelectorAll("ol > li").forEach((el) => observer?.observe(el));
      // The solid track stops at today. The nodes are grouped by phase, so the
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

    /** Brings a marker into the middle of the strip (the page never scrolls). */
    const centre = (target: HTMLElement | null, smooth: boolean) => {
      if (!target) return;
      const boxRect = box.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const left = box.scrollLeft + (targetRect.left - boxRect.left) - (box.clientWidth - targetRect.width) / 2;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      box.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
    };

    observer = new ResizeObserver(() => sync());
    sync();
    centre(focus(), false);
    observer.observe(box);
    if (content.current) observer.observe(content.current);
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      sync();
      centre(focus(), false);
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  // The track follows the selection: picking a day (a link, the URL, the back
  // button) brings that day into view instead of leaving the strip where it was.
  const firstSelection = useRef(true);
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    if (firstSelection.current) {
      firstSelection.current = false;
      return; // the mount effect already centred it
    }
    const target = box.querySelector<HTMLElement>("[data-selected]");
    if (!target) return;
    const boxRect = box.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const left = box.scrollLeft + (targetRect.left - boxRect.left) - (box.clientWidth - targetRect.width) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [selectedDay]);

  // The cursor: a pulsing ring that glides to the selected marker. It is placed
  // with a transform, so the move never touches layout; the first placement and
  // the re-measures after a resize jump instead of gliding.
  useEffect(() => {
    const box = scroller.current;
    const ring = cursor.current;
    const frame = content.current;
    if (!box || !ring || !frame) return;
    let cancelled = false;

    /** Draws a short arrow from the previous marker to the new one, then lets it fade. */
    const point = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const el = travel.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const inset = 16;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy);
      const length = dist - inset * 2;
      if (length < 8) return;
      const angle = Math.atan2(dy, dx);
      el.style.width = `${length}px`;
      el.style.left = `${from.x + Math.cos(angle) * inset}px`;
      el.style.top = `${from.y + Math.sin(angle) * inset}px`;
      el.style.transform = `translateY(-50%) rotate(${angle}rad)`;
      el.getAnimations().forEach((a) => a.cancel());
      el.animate(
        [
          { opacity: 1, clipPath: "inset(0 100% 0 0)" },
          { opacity: 1, clipPath: "inset(0 0 0 0)", offset: 0.55 },
          { opacity: 1, clipPath: "inset(0 0 0 0)", offset: 0.75 },
          { opacity: 0, clipPath: "inset(0 0 0 0)" },
        ],
        { duration: 520, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    };

    const place = (glide: boolean) => {
      const band = box.querySelector<HTMLElement>("[data-selected]");
      if (!band || cancelled) {
        ring.style.opacity = "0";
        return;
      }
      const marker = band.firstElementChild ?? band;
      const markerRect = marker.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const width = Math.max(markerRect.width + 14, 32);
      const height = Math.max(markerRect.height + 14, 32);
      const x = markerRect.left - frameRect.left + markerRect.width / 2 - width / 2;
      const y = markerRect.top - frameRect.top + markerRect.height / 2 - height / 2;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ring.style.transition = glide && placed.current && !reduce ? "transform 320ms var(--ease-out-strong)" : "none";
      ring.style.width = `${width}px`;
      ring.style.height = `${height}px`;
      ring.style.transform = `translate(${x}px, ${y}px)`;
      ring.style.opacity = "1";
      // Today's pill already stands out, so it gets no pulse.
      if (pulse.current) pulse.current.style.display = band.closest("[data-today]") ? "none" : "";
      const centre = { x: x + width / 2, y: y + height / 2 };
      if (glide && placed.current && lastCentre.current) point(lastCentre.current, centre);
      lastCentre.current = centre;
      placed.current = true;
    };

    place(true);
    const observer = new ResizeObserver(() => place(false));
    observer.observe(frame);
    void document.fonts?.ready.then(() => place(false));
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [selectedDay]);

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
        {/* w-max: the frame grows with the nodes, so the track (sized to the frame) reaches the last one. */}
        <div ref={content} className="relative w-max px-4" style={{ minWidth: "max(100%, 1120px)" }}>
          <div
            aria-hidden="true"
            data-track
            className="pointer-events-none absolute inset-x-6 z-0 flex h-1 -translate-y-1/2"
            style={{ top: TRACK_OFFSET }}
          >
            <div ref={fill} className="h-full rounded-l-full bg-primary" style={{ width: `${progressPct}%` }} />
            <div className="mt-px h-full flex-1 border-t-2 border-dashed border-outline-variant/70" />
          </div>
          <div ref={cursor} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[5] opacity-0">
            <span ref={pulse} className="selection-pulse absolute inset-0 rounded-full border-2 border-primary" />
            <span className="absolute inset-0 rounded-full bg-primary/10 ring-1 ring-primary/40" />
          </div>
          <div ref={travel} aria-hidden="true" className="pointer-events-none absolute z-[6] flex origin-left items-center opacity-0">
            <span className="h-0.5 flex-1 rounded-full bg-primary" />
            <svg viewBox="0 0 8 10" className="-ml-px h-2.5 w-2 shrink-0 text-primary" fill="currentColor">
              <path d="M0 0 8 5 0 10z" />
            </svg>
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
