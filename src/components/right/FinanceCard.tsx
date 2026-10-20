import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getCurrentUser } from "@/server/auth";
import { getFinance } from "@/server/services/finance";
import { getProjectOverview } from "@/server/services/projects";
import { FinancePanel } from "./FinancePanel";

/** The money of the project: the log, the result, and the way to the next run. */
export async function FinanceCard({ projectId }: { projectId: string }) {
  const user = await getCurrentUser();
  const [t, overview, finance] = await Promise.all([
    getTranslations("finance"),
    getProjectOverview(user.id, projectId),
    getFinance(user.id, projectId),
  ]);

  return (
    <Card as="section" aria-label={t("title")} className="p-space-md shadow-sm">
      <div className="mb-space-sm flex items-center justify-between border-b border-surface-variant pb-space-xs">
        <h2 className="flex items-center gap-1 text-title-sm font-on-surface">
          <Icon name="account_balance_wallet" className="text-[16px] text-primary" />
          {t("title")}
        </h2>
        <span className="rounded bg-primary-fixed px-1.5 py-0.5 font-mono text-[10px] font-medium text-on-primary-fixed">
          N{overview.currentDay} / {overview.totalDays}
        </span>
      </div>
      <FinancePanel projectId={projectId} initial={finance} />
    </Card>
  );
}
