"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { compactVnd } from "@/lib/format";
import { useSectionData } from "@/lib/use-section-data";
import type { FinanceDto } from "@/lib/types";

/** The money of the project: what went out, what came in, and the result. */
export function FinancePanel({ projectId, initial }: { projectId: string; initial: FinanceDto }) {
  const t = useTranslations("finance");
  const format = useFormatter();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"cost" | "income">("cost");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  // The card owns its ledger: it refetches its own endpoint instead of
  // re-rendering the whole page.
  const { data: finance, refetch } = useSectionData<FinanceDto>(initial, `/api/v1/projects/${projectId}/expenses`);

  const vnd = (n: number) => t("currency", { value: format.number(n) });
  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
  const spentOfRevenue = pct(finance.spentVnd, finance.expectedRevenueVnd);
  const reserve = Math.max(finance.budgetVnd - finance.spentVnd, 0);
  const reserveOfRevenue = pct(reserve, finance.expectedRevenueVnd);
  const profit = finance.profitVnd;
  const entries = finance.expenses;

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
    const value = Number(amount.replace(/\D/g, ""));
    if (!label.trim() || !value) return;
    try {
      await call("/expenses", "POST", { label: label.trim(), amountVnd: value, kind });
      setLabel("");
      setAmount("");
      setAdding(false);
      void refetch();
    } catch {
      /* handled */
    }
  };

  const remove = async (id: string) => {
    try {
      await call(`/expenses/${id}`, "DELETE");
      void refetch();
    } catch {
      /* handled */
    }
  };

  const clone = async () => {
    setCloning(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/clone`, { method: "POST" });
      if (!res.ok) throw new Error("clone failed");
      const json = (await res.json()) as { data: { id: string } };
      router.push(`/?project=${json.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("error"));
      setCloning(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="block text-[11px] text-outline">{t("spent")}</span>
          <span className="font-mono text-[17px] font-bold text-on-surface">{vnd(finance.spentVnd)}</span>
        </div>
        <div className="text-right">
          <span className="block text-[11px] text-outline">{t("revenue")}</span>
          <span className="font-mono text-[17px] font-bold text-primary">{vnd(finance.expectedRevenueVnd + finance.incomeVnd)}</span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
          <span className="flex items-center gap-1 font-semibold text-primary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            {t("ratio", { pct: format.number(spentOfRevenue, { maximumFractionDigits: 1 }) })}
          </span>
          <span className="text-outline">{t("budget", { amount: compactVnd(finance.budgetVnd) })}</span>
        </div>
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full border border-surface-variant/60 bg-surface-container p-0.5"
          role="img"
          aria-label={t("ratio", { pct: format.number(spentOfRevenue, { maximumFractionDigits: 1 }) })}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(spentOfRevenue, 100)}%` }}
            title={t("spentTooltip", { spent: compactVnd(finance.spentVnd), revenuePct: format.number(spentOfRevenue, { maximumFractionDigits: 1 }), budgetPct: format.number(pct(finance.spentVnd, finance.budgetVnd), { maximumFractionDigits: 1 }) })}
          />
          <div className="ml-0.5 h-full rounded-full bg-secondary/30" style={{ width: `${Math.min(reserveOfRevenue, 100 - spentOfRevenue)}%` }} title={t("reserveTooltip", { amount: compactVnd(reserve) })} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-surface-variant/40 bg-surface-container-low p-2 font-mono text-[11px]">
        <span className="flex min-w-0 items-center gap-1.5 text-on-surface-variant">
          <Icon name={profit >= 0 ? "trending_up" : "trending_down"} className={profit >= 0 ? "text-[15px] text-ok" : "text-[15px] text-error"} />
          <span className="truncate">{t("profit")}</span>
        </span>
        <span className={profit >= 0 ? "shrink-0 font-bold text-ok" : "shrink-0 font-bold text-error"}>
          {profit >= 0 ? "+" : "-"}
          {vnd(Math.abs(profit))}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-surface-variant pt-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wide text-outline">{t("log")}</span>
          <button
            type="button"
            onClick={() => setAdding((value) => !value)}
            className="flex items-center gap-1 rounded-md border border-surface-variant bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            <Icon name="add_circle" className="text-[14px] text-primary" />
            {t("addEntry")}
          </button>
        </div>

        {adding ? (
          <div className="flex flex-col gap-1.5 rounded-lg border border-surface-variant bg-surface-container-low p-2">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("labelPlaceholder")}
              aria-label={t("label")}
              className="rounded-lg border border-surface-variant bg-surface px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary"
            />
            <div className="flex gap-1.5">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="numeric"
                placeholder={t("amountPlaceholder")}
                aria-label={t("amount")}
                className="w-28 rounded-lg border border-surface-variant bg-surface px-2.5 py-1.5 font-mono text-body-sm text-on-surface focus:border-primary"
              />
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as "cost" | "income")}
                aria-label={t("kind")}
                className="rounded-lg border border-surface-variant bg-surface px-2 py-1.5 text-body-sm text-on-surface focus:border-primary"
              >
                <option value="cost">{t("cost")}</option>
                <option value="income">{t("income")}</option>
              </select>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => void add()}
                disabled={busy || !label.trim() || !amount}
                className="rounded-lg bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary disabled:opacity-60"
              >
                {t("save")}
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
        ) : null}

        {entries.length === 0 ? (
          <p className="text-[11px] text-outline">{t("noEntries")}</p>
        ) : (
          <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-surface-container-low">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon name={entry.kind === "income" ? "trending_up" : "payments"} className={cn("text-[13px]", entry.kind === "income" ? "text-ok" : "text-outline")} />
                  <span className="truncate text-on-surface-variant">{entry.label}</span>
                  <span className="shrink-0 font-mono text-[10px] text-outline">N{String(entry.day).padStart(2, "0")}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className={cn("font-mono font-bold", entry.kind === "income" ? "text-ok" : "text-on-surface")}>
                    {entry.kind === "income" ? "+" : "-"}
                    {format.number(entry.amountVnd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(entry.id)}
                    disabled={busy}
                    aria-label={t("removeEntry", { label: entry.label })}
                    title={t("removeEntry", { label: entry.label })}
                    className="flex size-5 items-center justify-center rounded text-outline transition-colors hover:text-error disabled:opacity-50"
                  >
                    <Icon name="delete" className="text-[13px]" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => void clone()}
        disabled={cloning || busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
      >
        <Icon name="autorenew" className="text-[16px] text-primary" />
        {cloning ? t("cloning") : t("nextRun")}
      </button>

      {error ? <p role="alert" className="text-[11px] text-error">{error}</p> : null}
    </div>
  );
}
