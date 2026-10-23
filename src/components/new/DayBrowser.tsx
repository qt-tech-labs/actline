"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { nodeForDay } from "@/lib/blueprint";
import type { Blueprint, BlueprintItem } from "@/lib/types";
import { useNewProject } from "./NewProjectProvider";

const pad = (day: number) => String(day).padStart(2, "0");

const FIELD =
  "w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary";

type ItemValues = { title: string; description: string; minutes: number; checklist: string; day: number };

/** The fields of an action item, for adding a new one and for editing an existing one. */
function ItemForm({
  initial,
  totalDays,
  disabled,
  onSubmit,
  onCancel,
}: {
  initial: ItemValues;
  totalDays: number;
  disabled: boolean;
  onSubmit: (values: ItemValues) => void | Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("newProject");
  const id = useId();
  const [values, setValues] = useState(initial);
  const set = <K extends keyof ItemValues>(key: K, value: ItemValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-surface-variant bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (values.title.trim()) void onSubmit(values);
      }}
    >
      <label htmlFor={`${id}-title`} className="font-mono text-label-sm text-on-surface-variant">
        {t("blueprint.day.itemTitle")}
      </label>
      <input
        id={`${id}-title`}
        value={values.title}
        onChange={(event) => set("title", event.target.value)}
        placeholder={t("blueprint.day.itemPlaceholder")}
        className={FIELD}
        autoFocus
      />
      <label htmlFor={`${id}-desc`} className="font-mono text-label-sm text-on-surface-variant">
        {t("blueprint.day.itemDescription")}
      </label>
      <textarea
        id={`${id}-desc`}
        rows={2}
        value={values.description}
        onChange={(event) => set("description", event.target.value)}
        className={FIELD}
      />
      <label htmlFor={`${id}-steps`} className="font-mono text-label-sm text-on-surface-variant">
        {t("blueprint.day.itemChecklist")}
      </label>
      <textarea
        id={`${id}-steps`}
        rows={3}
        value={values.checklist}
        onChange={(event) => set("checklist", event.target.value)}
        className={FIELD}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-min`} className="font-mono text-label-sm text-on-surface-variant">
          {t("blueprint.day.itemMinutes")}
        </label>
        <input
          id={`${id}-min`}
          type="number"
          min={5}
          max={600}
          value={values.minutes}
          onChange={(event) => set("minutes", Number(event.target.value))}
          className={cn(FIELD, "w-24 font-mono")}
        />
        <label htmlFor={`${id}-day`} className="font-mono text-label-sm text-on-surface-variant">
          {t("blueprint.day.itemDay")}
        </label>
        <input
          id={`${id}-day`}
          type="number"
          min={1}
          max={totalDays}
          value={values.day}
          onChange={(event) => set("day", Number(event.target.value))}
          className={cn(FIELD, "w-24 font-mono")}
        />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-surface-variant px-3 py-2 text-body-sm text-on-surface"
          >
            {t("blueprint.day.itemCancel")}
          </button>
          <button
            type="submit"
            disabled={disabled || !values.title.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-title-sm text-on-primary interactive hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
          >
            {t("blueprint.day.itemSave")}
          </button>
        </div>
      </div>
    </form>
  );
}

const checklistLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

/**
 * The plan day by day. Pick a day (or a phase card) and its action items show here, where
 * each one can be added, edited and deleted. A day without an item is a normal state.
 */
export function DayBrowser({ blueprint }: { blueprint: Blueprint }) {
  const t = useTranslations("newProject");
  const { toast } = useToast();
  const { applyOps, editing, blueprintId, selectedDay, selectDay } = useNewProject();
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // An edit can shrink the plan below the day that was open.
  const selected = Math.min(Math.max(selectedDay, 1), blueprint.totalDays);
  const node = nodeForDay(blueprint, selected);
  const entries = blueprint.nodes.flatMap((candidate) =>
    candidate.items.filter((item) => item.day === selected).map((item) => ({ item, nodeIndex: candidate.index })),
  );
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.item.minutes, 0);
  const locked = editing || !blueprintId;

  const pick = (day: number) => {
    selectDay(day);
    setAdding(false);
    setEditingItem(null);
  };

  const add = async (values: ItemValues) => {
    if (!node) return;
    await applyOps([
      {
        op: "addItem",
        nodeIndex: node.index,
        day: values.day,
        title: values.title.trim(),
        description: values.description.trim(),
        minutes: values.minutes,
        rationale: null,
        checklist: checklistLines(values.checklist),
        requiresPhoto: false,
        photoTitle: null,
        photoHint: null,
      },
    ]);
    setAdding(false);
  };

  const save = async (item: BlueprintItem, nodeIndex: number, values: ItemValues) => {
    await applyOps([
      {
        op: "updateItem",
        nodeIndex,
        itemId: item.id,
        title: values.title.trim(),
        description: values.description.trim(),
        minutes: values.minutes,
        checklist: checklistLines(values.checklist),
        day: values.day,
      },
    ]);
    setEditingItem(null);
    toast("success", t("blueprint.day.itemSaved"));
  };

  return (
    <div id="day-browser" className="flex scroll-mt-24 flex-col gap-4">
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
                    const count = blueprint.nodes.flatMap((entry) => entry.items).filter((item) => item.day === day).length;
                    return (
                      <li key={day}>
                        <button
                          type="button"
                          onClick={() => pick(day)}
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

          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-5 text-body-sm text-on-surface-variant">
              {t("blueprint.day.empty")}
            </p>
          ) : null}

          {entries.map(({ item, nodeIndex }) => (
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
                    disabled={locked}
                    title={t("blueprint.day.itemEdit")}
                    aria-label={t("blueprint.day.itemEdit")}
                    className="flex size-8 items-center justify-center rounded-lg border border-surface-variant text-outline transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    <Icon name="edit_note" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyOps([{ op: "deleteItem", nodeIndex, itemId: item.id }])}
                    disabled={locked}
                    title={t("blueprint.day.itemDelete")}
                    aria-label={t("blueprint.day.itemDelete")}
                    className="flex size-8 items-center justify-center rounded-lg border border-surface-variant text-outline transition-colors hover:border-error hover:text-error disabled:opacity-50"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>

              {editingItem === item.id ? (
                <ItemForm
                  initial={{
                    title: item.title,
                    description: item.description,
                    minutes: item.minutes,
                    checklist: item.checklist.join("\n"),
                    day: item.day,
                  }}
                  totalDays={blueprint.totalDays}
                  disabled={locked}
                  onSubmit={(values) => save(item, nodeIndex, values)}
                  onCancel={() => setEditingItem(null)}
                />
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
                    <li key={`${index}-${micro}`} className="flex items-center gap-3 text-body-sm">
                      <span className="font-mono text-label-sm font-bold text-outline">{pad(index + 1)}</span>
                      <span>{micro}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </article>
          ))}

          {adding ? (
            <ItemForm
              key={selected}
              initial={{ title: "", description: "", minutes: 15, checklist: "", day: selected }}
              totalDays={blueprint.totalDays}
              disabled={locked}
              onSubmit={add}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={locked || !node}
              title={!blueprintId ? t("blueprint.day.needGenerate") : !node ? t("blueprint.day.noNodeToAdd") : undefined}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-surface-variant bg-surface px-4 py-2 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="add_circle" className="text-[16px] text-primary" />
              {t("blueprint.day.add")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
