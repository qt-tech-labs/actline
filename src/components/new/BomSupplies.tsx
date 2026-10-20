"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Blueprint } from "@/lib/types";
import { useNewProject } from "./NewProjectProvider";

const URGENCY_DOT = {
  now: "bg-primary",
  soon: "bg-secondary",
  later: "bg-outline",
} as const;

const URGENCY_TEXT = {
  now: "text-primary",
  soon: "text-secondary",
  later: "text-outline",
} as const;

/** The bill of materials the engine prepared, with the contingency split out. */
export function BomSupplies({ blueprint }: { blueprint: Blueprint }) {
  const t = useTranslations("newProject");
  const format = useFormatter();
  const { ownedSupplies, toggleOwned, setOwnedAll, applyOps, editing, blueprintId } = useNewProject();
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [price, setPrice] = useState("");

  const download = () => {
    const rows = [
      [t("blueprint.bom.csv.name"), t("blueprint.bom.csv.spec"), t("blueprint.bom.csv.price"), t("blueprint.bom.csv.buyBy")],
      ...blueprint.supplies.map((item) => [item.name, item.spec, String(item.priceVnd), `N${item.buyByDay}`]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${blueprint.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-bom.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const savePrice = async (name: string) => {
    const digits = price.replace(/\D/g, "");
    if (!digits) return;
    await applyOps([{ op: "updateSupply", name, priceVnd: Number(digits) }]);
    setEditingPrice(null);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-[0_1px_3px_rgba(30,38,33,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="shopping_basket" className="text-[20px] text-secondary" />
          <h4 className="text-title-md font-bold text-on-surface">{t("blueprint.bom.title")}</h4>
        </div>
        <span className="rounded bg-secondary-fixed px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-on-secondary-fixed">
          {t("blueprint.bom.count", { count: blueprint.supplies.length })}
        </span>
      </div>

      <p className="text-body-sm text-on-surface-variant">
        {t("blueprint.bom.hint", { area: blueprint.tags[0]?.label ?? "" })}
      </p>

      <ul className="flex flex-col divide-y divide-surface-variant">
        {blueprint.supplies.map((item) => {
          const owned = ownedSupplies.includes(item.name);
          return (
            <li key={item.name} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", URGENCY_DOT[item.urgency])} />
                <div className="min-w-0">
                  <span className="block truncate text-body-sm font-semibold text-on-surface">{item.name}</span>
                  <span className="block truncate font-mono text-label-sm text-outline">{item.spec}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {editingPrice === item.name ? (
                  <div className="flex items-center justify-end gap-1">
                    <input
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      inputMode="numeric"
                      aria-label={t("blueprint.bom.editPrice", { name: item.name })}
                      className="w-24 rounded border border-surface-variant bg-surface px-2 py-1 text-right font-mono text-label-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => void savePrice(item.name)}
                      disabled={editing}
                      aria-label={t("blueprint.bom.savePrice")}
                      className="flex size-6 items-center justify-center rounded bg-primary text-on-primary disabled:opacity-60"
                    >
                      <Icon name="check" className="text-[14px]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPrice(item.name);
                      setPrice(String(item.priceVnd));
                    }}
                    disabled={editing || !blueprintId}
                    title={t("blueprint.bom.editPrice", { name: item.name })}
                    className="group flex items-center justify-end gap-1 disabled:cursor-not-allowed"
                  >
                    <span className="font-mono text-label-md font-bold text-on-surface group-hover:text-primary">
                      {format.number(item.priceVnd)} đ
                    </span>
                    <Icon name="edit_note" className="text-[15px] text-outline opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )}
                {item.priceSource === "user" ? (
                  <span className="block font-mono text-[10px] text-secondary">{t("blueprint.bom.userPrice")}</span>
                ) : null}
                <span className={cn("font-mono text-label-sm", URGENCY_TEXT[item.urgency])}>
                  {item.urgency === "now" ? t("blueprint.bom.buyBy", { day: item.buyByDay }) : t("blueprint.bom.needBy", { day: item.buyByDay })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleOwned(item.name)}
                aria-pressed={owned}
                aria-label={t("blueprint.bom.ownedLabel", { name: item.name })}
                title={t("blueprint.bom.ownedLabel", { name: item.name })}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  owned ? "border-ok bg-ok text-white" : "border-outline-variant text-outline hover:border-primary hover:text-primary",
                )}
              >
                {owned ? <Icon name="check" className="text-[14px]" /> : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 rounded-lg border border-surface-variant bg-surface-container-low p-3">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="font-medium text-outline">{t("blueprint.bom.base")}</span>
          <span className="font-bold text-on-surface">{format.number(blueprint.suppliesSubtotalVnd)} đ</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="flex items-center gap-1 text-outline">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-error" />
            {t("blueprint.bom.contingency")}
          </span>
          <span className="font-bold text-error">{format.number(blueprint.contingencyVnd)} đ</span>
        </div>
        <div className="flex items-center justify-between border-t border-surface-variant pt-1.5 font-mono text-label-sm">
          <span className="font-semibold text-primary">{t("blueprint.bom.total")}</span>
          <span className="font-bold text-on-surface">{format.number(blueprint.totalPackageVnd)} đ</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={download}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-variant bg-surface-container px-3 py-2 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <Icon name="file_download" className="text-[16px]" />
          {t("blueprint.bom.download")}
        </button>
        <button
          type="button"
          onClick={() => setOwnedAll(blueprint.supplies.map((item) => item.name), !blueprint.supplies.every((item) => ownedSupplies.includes(item.name)))}
          className="rounded-lg border border-surface-variant bg-surface px-3 py-2 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          {t("blueprint.bom.owned")}
        </button>
      </div>
    </div>
  );
}
