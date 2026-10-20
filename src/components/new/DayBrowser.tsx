"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { nodeForDay } from "@/lib/blueprint";
import type { Blueprint } from "@/lib/types";
import { useNewProject } from "./NewProjectProvider";

const pad = (day: number) => String(day).padStart(2, "0");

/**
 * The plan day by day. A day without an action item is a normal state: the node's
 * objective is shown and the user can add the missing work by hand.
 */
export function DayBrowser({ blueprint }: { blueprint: Blueprint }) {
  const t = useTranslations("newProject");
  const { applyOps, editing, blueprintId } = useNewProject();
  const [selected, setSelected] = useState(1);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMinutes, setEditMinutes] = useState(15);

  const node = nodeForDay(blueprint, selected);
  const items = blueprint.nodes.flatMap((candidate) => candidate.items.filter((item) => item.day === selected));
  const totalMinutes = items.reduce((sum, item) => sum + item.minutes, 0);

  const submit = async () => {
    if (!node || !title.trim()) return;
    await applyOps([
      {
        op: "addItem",
        nodeIndex: node.index,
        day: selected,
        title: title.trim(),
        minutes,
        description: "",
        rationale: null,
        checklist: [],
        requiresPhoto: false,
        photoTitle: null,
        photoHint: null,
      },
    ]);
    setTitle("");
    setMinutes(15);
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="task_alt" className="text-[20px] text-primary" />
          <h4 className="text-title-md font-bold text-on-surface">{t("blueprint.day.title", { total: blueprint.totalDays })}</h4>
        </div>
        <span className="rounded bg-surface-container px-2.5 py-1 font-mono text-label-sm text-on-surface-variant">
          {t("blueprint.day.total", { minutes: totalMinutes })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <nav aria-label={t("blueprint.day.list")} className="max-h-[28rem] overflow-y-auto rounded-xl border border-surface-variant bg-surface-container-low p-2">
          {blueprint.nodes.map((candidate) => (
            <div key={candidate.index} className="mb-2 last:mb-0">
              <p className="px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-outline">
                {candidate.rangeLabel} · {candidate.title}
              </p>
              <ul className="flex flex-wrap gap-1 px-1">
                {Array.from({ length: candidate.endDay - candidate.startDay + 1 }, (_, offset) => candidate.startDay + offset).map(
                  (day) => {
                    const count = blueprint.nodes
                      .flatMap((entry) => entry.items)
                      .filter((item) => item.day === day).length;
                    return (
                      <li key={day}>
                        <button
                          type="button"
                          onClick={() => setSelected(day)}
                          aria-current={selected === day ? "date" : undefined}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg font-mono text-[11px] transition-colors",
                            selected === day
                              ? "bg-primary font-bold text-on-primary"
                              : count > 0
                                ? "bg-surface-container text-on-surface hover:bg-surface-container-high"
                                : "text-outline hover:bg-surface-container",
                          )}
                        >
                          {pad(day)}
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-3 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary-fixed px-2 py-0.5 font-mono text-[11px] font-bold text-on-primary-fixed">
                N{pad(selected)}
              </span>
              <span className="text-body-sm font-semibold text-on-surface">{node?.title ?? t("blueprint.day.noNode")}</span>
            </div>
            {node?.objective ? <p className="text-body-sm text-on-surface-variant">{node.objective}</p> : null}
          </div>

          {items.length > 0 ? (
            items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 shadow-[0_1px_3px_rgba(30,38,33,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="mt-0.5 size-5 shrink-0 rounded border-2 border-outline-variant" />
                    <div>
                      <h5 className="text-title-sm font-bold text-on-surface">{item.title}</h5>
                      {item.description ? <p className="mt-1 text-body-sm text-on-surface-variant">{item.description}</p> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-surface-container-low px-2 py-1 font-mono text-label-sm text-on-surface-variant">
                      <Icon name="timer" className="text-[13px]" />
                      {t("blueprint.day.minutes", { count: item.minutes })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                      disabled={editing || !blueprintId}
                      title={t("blueprint.day.itemEdit")}
                      aria-label={t("blueprint.day.itemEdit")}
                      className="flex size-8 items-center justify-center rounded-lg border border-surface-variant text-outline transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <Icon name="edit_note" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void applyOps([{ op: "deleteItem", nodeIndex: node?.index ?? 1, itemId: item.id }])}
                      disabled={editing || !blueprintId}
                      title={t("blueprint.day.itemDelete")}
                      aria-label={t("blueprint.day.itemDelete")}
                      className="flex size-8 items-center justify-center rounded-lg border border-surface-variant text-outline transition-colors hover:border-error hover:text-error disabled:opacity-50"
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                </div>

                {editingItem === item.id ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-surface-variant bg-surface p-3">
                    <label htmlFor={`edit-title-${item.id}`} className="font-mono text-label-sm text-on-surface-variant">
                      {t("blueprint.day.itemTitle")}
                    </label>
                    <input
                      id={`edit-title-${item.id}`}
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <label htmlFor={`edit-minutes-${item.id}`} className="font-mono text-label-sm text-on-surface-variant">
                        {t("blueprint.day.itemMinutes")}
                      </label>
                      <input
                        id={`edit-minutes-${item.id}`}
                        type="number"
                        min={5}
                        max={600}
                        value={editMinutes}
                        onChange={(event) => setEditMinutes(Number(event.target.value))}
                        className="w-24 rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!node || !editTitle.trim()) return;
                          await applyOps([
                            {
                              op: "updateItem",
                              nodeIndex: node.index,
                              itemId: item.id,
                              title: editTitle.trim(),
                              minutes: editMinutes,
                            },
                          ]);
                          setEditingItem(null);
                        }}
                        disabled={editing || !editTitle.trim()}
                        className="ml-auto rounded-lg bg-primary px-4 py-2 text-title-sm text-on-primary interactive hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
                      >
                        {t("blueprint.day.itemSave")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="rounded-lg border border-surface-variant px-3 py-2 text-body-sm text-on-surface"
                      >
                        {t("blueprint.day.itemCancel")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {item.rationale ? (
                  <div className="flex flex-col gap-1 rounded-lg border-l-4 border-primary bg-surface-container-low p-3.5 text-body-sm">
                    <span className="flex items-center gap-1 font-mono text-label-sm font-bold text-primary">
                      <Icon name="psychology" className="text-[14px]" />
                      {t("blueprint.day.rationale")}
                    </span>
                    <p className="italic text-on-surface-variant">{item.rationale}</p>
                  </div>
                ) : null}

                {item.checklist.length > 0 ? (
                  <ol className="flex flex-col gap-2 border-t border-surface-variant pt-2">
                    {item.checklist.map((micro, index) => (
                      <li key={micro} className="flex items-center gap-3 text-body-sm">
                        <span className="font-mono text-label-sm font-bold text-outline">{String(index + 1).padStart(2, "0")}</span>
                        <span>{micro}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </article>
            ))
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-5">
              <p className="text-body-sm text-on-surface-variant">{t("blueprint.day.empty")}</p>
              {adding ? (
                <div className="flex w-full flex-col gap-2">
                  <label htmlFor="new-item-title" className="font-mono text-label-sm text-on-surface-variant">
                    {t("blueprint.day.itemTitle")}
                  </label>
                  <input
                    id="new-item-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t("blueprint.day.itemPlaceholder")}
                    className="w-full rounded-lg border border-surface-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2">
                    <label htmlFor="new-item-minutes" className="font-mono text-label-sm text-on-surface-variant">
                      {t("blueprint.day.itemMinutes")}
                    </label>
                    <input
                      id="new-item-minutes"
                      type="number"
                      min={5}
                      max={600}
                      value={minutes}
                      onChange={(event) => setMinutes(Number(event.target.value))}
                      className="w-24 rounded-lg border border-surface-variant bg-surface px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={submit}
                      disabled={editing || !title.trim()}
                      className="ml-auto rounded-lg bg-primary px-4 py-2 text-title-sm text-on-primary interactive hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
                    >
                      {t("blueprint.day.itemSave")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      className="rounded-lg border border-surface-variant px-3 py-2 text-body-sm text-on-surface"
                    >
                      {t("blueprint.day.itemCancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  disabled={editing || !blueprintId}
                  title={blueprintId ? undefined : t("blueprint.day.needGenerate")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-variant bg-surface px-4 py-2 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="add_circle" className="text-[16px] text-primary" />
                  {t("blueprint.day.add")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
