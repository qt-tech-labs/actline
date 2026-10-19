import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { compactVnd } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { getDayPlan } from "@/server/services/day";
import { getFinance } from "@/server/services/finance";
import { getProjectOverview } from "@/server/services/projects";

export async function SuppliesCard({ projectId }: { projectId: string }) {
  const user = await getCurrentUser();
  const overview = await getProjectOverview(user.id, projectId);
  const [t, plan, finance] = await Promise.all([
    getTranslations("supplies"),
    getDayPlan(projectId, overview.currentDay),
    getFinance(user.id, projectId),
  ]);
  const supplies = plan?.supplies ?? [];

  return (
    <Card as="section" aria-label={t("title")} className="p-space-md shadow-sm">
      <div className="mb-space-sm flex items-center justify-between border-b border-surface-variant pb-space-xs">
        <h2 className="flex items-center gap-1 text-title-sm text-on-surface">
          <Icon name="handyman" className="text-[16px] text-secondary" />
          {t("title")}
        </h2>
        <span className="rounded bg-secondary-fixed px-2 py-0.5 font-mono text-[10px] font-medium text-on-secondary-fixed">{t("count", { count: supplies.length })}</span>
      </div>
      {supplies.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {supplies.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg bg-surface-container-low p-1.5 px-2">
              <span className="flex min-w-0 items-center gap-2">
                <Icon name={s.icon} className="text-[15px] text-primary" />
                <span className="truncate text-body-sm text-on-surface">{s.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[11px] text-outline">{s.quantity}</span>
                <span role="img" aria-label={s.available ? t("available") : t("missing")} title={s.available ? t("available") : t("missing")}>
                  <Icon name={s.available ? "check_circle" : "shopping_cart"} className={s.available ? "text-[16px] text-ok" : "text-[16px] text-secondary"} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-space-sm flex items-center justify-between border-t border-surface-variant pt-space-xs font-mono text-[11px]">
        <span className="text-outline">{t("cost")}</span>
        <span className="font-semibold text-on-surface">
          {compactVnd(finance.spentVnd)} <span className="font-normal text-outline">/ {compactVnd(finance.budgetVnd)}</span>
        </span>
      </div>
    </Card>
  );
}
