"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Blueprint } from "@/lib/types";
import { useNewProject } from "./NewProjectProvider";

/** The nodes of the plan: a group of work with a time range and an objective. */
export function NodeGrid({ blueprint }: { blueprint: Blueprint }) {
  const t = useTranslations("newProject");
  const { applyOps, editing, blueprintId } = useNewProject();
  const [open, setOpen] = useState<number | null>(1);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(7);

  const addNode = async () => {
    if (!title.trim()) return;
    await applyOps([
      { op: "addNode", title: title.trim(), objective: objective.trim(), startDay, endDay: Math.max(endDay, startDay) },
    ]);
    setTitle("");
    setObjective("");
    setAdding(false);
  };

  const removeNode = async (index: number) => {
    await applyOps([{ op: "deleteNode", index }]);
    setOpen(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-title-md font-bold text-on-surface">
          <Icon name="linear_scale" className="text-primary" />
          {t("blueprint.nodes.title")}
        </h4>
        <div className="flex items-center gap-3">
          <p className="text-body-sm text-outline">{t("blueprint.nodes.hint")}</p>
          <button
            type="button"
            onClick={() => setAdding((value) => !value)}
            disabled={editing || !blueprintId}
            title={blueprintId ? undefined : t("blueprint.day.needGenerate")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-variant bg-surface px-3 py-1.5 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="add_circle" className="text-[16px] text-primary" />
            {t("blueprint.nodes.add")}
          </button>
        </div>
      </div>

      {adding ? (
        <div className="flex flex-col gap-3 rounded-xl border border-surface-variant bg-surface-container-low p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant">
              {t("blueprint.nodes.nodeTitle")}
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("blueprint.nodes.nodeTitlePlaceholder")}
                className="rounded-lg border border-surface-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant">
              {t("blueprint.nodes.nodeObjective")}
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder={t("blueprint.nodes.nodeObjectivePlaceholder")}
                className="rounded-lg border border-surface-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant">
              {t("blueprint.nodes.startDay")}
              <input
                type="number"
                min={1}
                max={blueprint.totalDays}
                value={startDay}
                onChange={(event) => setStartDay(Number(event.target.value))}
                className="w-24 rounded-lg border border-surface-variant bg-surface px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant">
              {t("blueprint.nodes.endDay")}
              <input
                type="number"
                min={1}
                max={blueprint.totalDays}
                value={endDay}
                onChange={(event) => setEndDay(Number(event.target.value))}
                className="w-24 rounded-lg border border-surface-variant bg-surface px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-lg border border-surface-variant px-3 py-2 text-body-sm text-on-surface"
              >
                {t("blueprint.day.itemCancel")}
              </button>
              <button
                type="button"
                onClick={addNode}
                disabled={editing || !title.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-title-sm text-on-primary interactive hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
              >
                {t("blueprint.nodes.add")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {blueprint.nodes.map((node) => {
          const active = node.index === 1;
          const last = node.index === blueprint.nodes.length;
          const expanded = open === node.index;
          return (
            <div
              key={node.index}
              className={cn(
                "flex flex-col justify-between rounded-xl border p-4 transition-colors",
                active
                  ? "border-2 border-primary bg-surface-container-lowest shadow-sm ring-2 ring-primary/20"
                  : "border-surface-variant bg-surface-container-low hover:border-outline-variant",
                expanded && !active && "border-outline-variant bg-surface-container-lowest",
              )}
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : node.index)}
                className="flex flex-col text-left"
              >
                <div className="flex items-center justify-between">
                  <span className={cn("flex items-center gap-1.5 font-mono text-[11px]", active ? "font-bold text-primary" : "text-outline")}>
                    {active ? <span aria-hidden="true" className="size-2 rounded-full bg-primary" /> : null}
                    {node.rangeLabel}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[11px]",
                      last
                        ? "bg-secondary-fixed font-bold text-on-secondary-fixed"
                        : active
                          ? "bg-primary-fixed font-bold text-on-primary-fixed"
                          : "bg-surface-variant font-medium text-on-surface-variant",
                    )}
                  >
                    {t("blueprint.nodes.label", { n: node.index })}
                  </span>
                </div>

                <div className="mt-2">
                  <h5 className="text-title-sm font-bold text-on-surface">{node.title}</h5>
                  <p className="mt-1.5 text-body-sm text-on-surface-variant">{node.objective}</p>
                </div>

                {expanded ? (
                  <ul className="mt-3 flex flex-col gap-1.5 border-t border-surface-variant pt-3">
                    {node.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-body-sm text-on-surface-variant">
                        <Icon name="check_circle" className="mt-0.5 text-[14px] text-primary" />
                        <span className="flex-1">
                          {item.title}
                          <span className="ml-1 font-mono text-[11px] text-outline">N{String(item.day).padStart(2, "0")}</span>
                        </span>
                        <span className="font-mono text-[11px] text-outline">{item.minutes}′</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </button>

              <div className="mt-4 flex items-center justify-between border-t border-surface-variant pt-3 text-body-sm">
                <span className="font-mono text-[11px] text-outline">{t("blueprint.nodes.items", { count: node.items.length })}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void removeNode(node.index)}
                    disabled={editing || !blueprintId}
                    title={t("blueprint.nodes.delete")}
                    aria-label={t("blueprint.nodes.delete")}
                    className="flex size-7 items-center justify-center rounded-lg border border-surface-variant text-outline transition-colors hover:border-error hover:text-error disabled:opacity-50"
                  >
                    <Icon name="delete" className="text-[16px]" />
                  </button>
                  {expanded ? (
                    <span className="flex items-center text-xs font-bold text-primary">
                      {t("blueprint.nodes.hide")}
                      <Icon name="expand_more" className="ml-0.5 text-[14px]" />
                    </span>
                  ) : active ? (
                    <span className="flex items-center text-xs font-bold text-primary">
                      {t("blueprint.nodes.details")}
                      <Icon name="chevron_right" className="ml-0.5 text-[14px]" />
                    </span>
                  ) : (
                    <span title={t("blueprint.nodes.locked")} className="flex items-center text-outline">
                      <Icon name="lock_clock" className="text-[16px]" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
