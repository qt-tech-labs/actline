import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { compactVnd } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { getFinance } from "@/server/services/finance";
import { getProjectOverview } from "@/server/services/projects";

export async function FinanceCard({ projectId }: { projectId: string }) {
  const user = await getCurrentUser();
  const [t, format, overview, f] = await Promise.all([
    getTranslations("finance"),
    getFormatter(),
    getProjectOverview(user.id, projectId),
    getFinance(user.id, projectId),
  ]);
  const vnd = (n: number) => t("currency", { value: format.number(n) });
  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
  const spentOfRevenue = pct(f.spentVnd, f.expectedRevenueVnd);
  const reserve = Math.max(f.budgetVnd - f.spentVnd, 0);
  const reserveOfRevenue = pct(reserve, f.expectedRevenueVnd);
  const profit = f.expectedRevenueVnd - f.spentVnd;

  return (
    <Card as="section" aria-label={t("title")} className="p-space-md shadow-sm">
      <div className="mb-space-sm flex items-center justify-between border-b border-surface-variant pb-space-xs">
        <h2 className="flex items-center gap-1 text-title-sm text-on-surface">
          <Icon name="account_balance_wallet" className="text-[16px] text-primary" />
          {t("title")}
        </h2>
        <span className="rounded bg-primary-fixed px-1.5 py-0.5 font-mono text-[10px] font-medium text-on-primary-fixed">
          N{overview.currentDay} / {overview.totalDays}
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="block text-[11px] text-outline">{t("spent")}</span>
            <span className="font-mono text-[17px] font-bold text-on-surface">{vnd(f.spentVnd)}</span>
          </div>
          <div className="text-right">
            <span className="block text-[11px] text-outline">{t("revenue")}</span>
            <span className="font-mono text-[17px] font-bold text-primary">{vnd(f.expectedRevenueVnd)}</span>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-primary">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              {t("ratio", { pct: format.number(spentOfRevenue, { maximumFractionDigits: 1 }) })}
            </span>
            <span className="text-outline">{t("budget", { amount: compactVnd(f.budgetVnd) })}</span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-surface-variant/60 bg-surface-container p-0.5" role="img" aria-label={t("ratio", { pct: format.number(spentOfRevenue, { maximumFractionDigits: 1 }) })}>
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(spentOfRevenue, 100)}%` }}
              title={t("spentTooltip", { spent: compactVnd(f.spentVnd), revenuePct: format.number(spentOfRevenue, { maximumFractionDigits: 1 }), budgetPct: format.number(pct(f.spentVnd, f.budgetVnd), { maximumFractionDigits: 1 }) })}
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
            {profit >= 0 ? "+" : "-"}{vnd(Math.abs(profit))}
          </span>
        </div>
      </div>
    </Card>
  );
}
