"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { compactVnd } from "@/lib/format";
import { useSectionData } from "@/lib/use-section-data";
import type { PurchaseLog } from "@/lib/types";

/** The purchase list: what the plan wanted, what was bought, what it really cost. */
export function PurchaseList({ projectId, initial }: { projectId: string; initial: PurchaseLog }) {
  const t = useTranslations("purchases");
  const format = useFormatter();
  // The card owns its list: it refetches its own endpoint instead of
  // re-rendering the whole page.
  const { data: log, refetch } = useSectionData<PurchaseLog>(initial, `/api/v1/projects/${projectId}/supplies`);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [actual, setActual] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The row changes straight away; the server confirms right after.
  const [optimistic, setOptimistic] = useState<{ id: string; bought?: boolean; actualPriceVnd?: number | null } | null>(null);

  const call = async (path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(json?.error?.message ?? "Request failed");
      }
      return (await res.json().catch(() => null)) as { data?: { id?: string } } | null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("error"));
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!name.trim()) return;
    try {
      await call("/supplies", "POST", {
        name: name.trim(),
        estimatedPriceVnd: price ? Number(price.replace(/\D/g, "")) : null,
      });
      setName("");
      setPrice("");
      setAdding(false);
      void refetch();
    } catch {
      /* the message is shown in the banner */
    }
  };

  const toggleBought = async (id: string, bought: boolean) => {
    setOptimistic({ id, bought });
    try {
      await call(`/supplies/${id}`, "PATCH", { bought });
      void refetch();
    } catch {
      setOptimistic(null);
    }
  };

  const saveActual = async (id: string) => {
    const value = actual ? Number(actual.replace(/\D/g, "")) : null;
    setOptimistic({ id, actualPriceVnd: value });
    try {
      await call(`/supplies/${id}`, "PATCH", { actualPriceVnd: value, bought: true });
      setEditing(null);
      void refetch();
    } catch {
      setOptimistic(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await call(`/supplies/${id}`, "DELETE");
      void refetch();
    } catch {
      /* handled */
    }
  };

  const boughtOf = (id: string, serverValue: boolean) => (optimistic?.id === id && optimistic.bought !== undefined ? optimistic.bought : serverValue);
  const priceOf = (id: string, serverValue: number | null) =>
    optimistic?.id === id && optimistic.actualPriceVnd !== undefined ? optimistic.actualPriceVnd : serverValue;

  return (
    <div className="flex flex-col gap-3">
      {log.items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-surface-variant">
          {log.items.map((item) => {
            const bought = boughtOf(item.id, item.bought);
            const actualPrice = priceOf(item.id, item.actualPriceVnd);
            return (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleBought(item.id, !bought)}
                    disabled={busy}
                    aria-pressed={bought}
                    aria-label={t("toggle", { name: item.name })}
                    title={t("toggle", { name: item.name })}
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
                      bought ? "border-ok bg-ok text-white" : "border-outline-variant text-outline hover:border-primary hover:text-primary",
                    )}
                  >
                    {bought ? <Icon name="check" className="text-[12px]" /> : null}
                  </button>
                  <div className="min-w-0">
                    <span className={cn("block truncate text-body-sm font-semibold", bought ? "text-on-surface-variant line-through" : "text-on-surface")}>
                      {item.name}
                    </span>
                    <span className="block font-mono text-[11px] text-outline">
                      {t("buyBy", { day: item.buyByDay ?? 1 })}
                      {item.estimatedPriceVnd ? ` · ${compactVnd(item.estimatedPriceVnd)}` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {editing === item.id ? (
                    <input
                      value={actual}
                      onChange={(event) => setActual(event.target.value)}
                      inputMode="numeric"
                      aria-label={t("actualPrice", { name: item.name })}
                      className="w-24 rounded border border-surface-variant bg-surface px-2 py-1 text-right font-mono text-[11px] text-on-surface focus:border-primary"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(item.id);
                        setActual(String(actualPrice ?? item.estimatedPriceVnd ?? ""));
                      }}
                      disabled={busy}
                      title={t("actualPrice", { name: item.name })}
                      className="rounded px-1 py-0.5 font-mono text-[11px] font-bold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
                    >
                      {bought ? `${compactVnd(actualPrice ?? item.estimatedPriceVnd ?? 0)}` : t("estimate")}
                    </button>
                  )}
                  {editing === item.id ? (
                    <button
                      type="button"
                      onClick={() => void saveActual(item.id)}
                      disabled={busy}
                      aria-label={t("savePrice")}
                      className="flex size-6 items-center justify-center rounded bg-primary text-on-primary disabled:opacity-60"
                    >
                      <Icon name="check" className="text-[13px]" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    disabled={busy}
                    aria-label={t("remove", { name: item.name })}
                    title={t("remove", { name: item.name })}
                    className="flex size-6 items-center justify-center rounded text-outline transition-colors hover:text-error disabled:opacity-50"
                  >
                    <Icon name="delete" className="text-[15px]" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-surface-variant pt-2 font-mono text-[11px]">
        <span className="text-outline">{t("summary", { estimated: format.number(log.estimatedTotalVnd), actual: format.number(log.actualTotalVnd) })}</span>
        {log.pendingCount > 0 ? <span className="font-bold text-secondary">{t("pending", { count: log.pendingCount })}</span> : <span className="font-bold text-ok">{t("allBought")}</span>}
      </div>

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-surface-variant bg-surface-container-low p-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            aria-label={t("name")}
            className="rounded-lg border border-surface-variant bg-surface px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary"
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="numeric"
            placeholder={t("pricePlaceholder")}
            aria-label={t("price")}
            className="rounded-lg border border-surface-variant bg-surface px-2.5 py-1.5 font-mono text-body-sm text-on-surface focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void add()}
              disabled={busy || !name.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary disabled:opacity-60"
            >
              {t("add")}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-surface-variant px-3 py-1.5 text-body-sm text-on-surface"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="add_circle" className="text-[16px] text-primary" />
          {t("add")}
        </button>
      )}

      {error ? <p role="alert" className="text-body-sm text-error">{error}</p> : null}
    </div>
  );
}
