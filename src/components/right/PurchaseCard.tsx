import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getCurrentUser } from "@/server/auth";
import { getPurchaseLog } from "@/server/services/purchases";
import { PurchaseList } from "./PurchaseList";

/** The purchase list of the project: planned items, what was bought, what it cost. */
export async function PurchaseCard({ projectId }: { projectId: string }) {
  const user = await getCurrentUser();
  const [t, log] = await Promise.all([getTranslations("purchases"), getPurchaseLog(user.id, projectId)]);

  return (
    <Card as="section" aria-label={t("title")} className="p-space-md shadow-sm">
      <div className="mb-space-sm flex items-center justify-between border-b border-surface-variant pb-space-xs">
        <h2 className="flex items-center gap-1 text-title-sm font-on-surface">
          <Icon name="shopping_basket" className="text-[16px] text-secondary" />
          {t("title")}
        </h2>
        <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] font-medium text-on-surface">
          {t("count", { count: log.items.length })}
        </span>
      </div>
      <PurchaseList projectId={projectId} initial={log} />
    </Card>
  );
}
