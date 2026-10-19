import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getAutomationRules } from "@/server/services/automation";
import { RuleList } from "./RuleList";

export async function RulesCard({ projectId }: { projectId: string }) {
  const [t, rules] = await Promise.all([getTranslations("rules"), getAutomationRules(projectId)]);

  return (
    <Card as="section" aria-label={t("title")} className="p-space-md shadow-sm">
      <div className="mb-space-sm flex items-center justify-between border-b border-surface-variant pb-space-xs">
        <h2 className="flex items-center gap-1 text-title-sm text-on-surface">
          <Icon name="tune" className="text-[16px] text-primary" />
          {t("title")}
        </h2>
        <span className="rounded bg-primary-fixed px-1.5 py-0.5 font-mono text-[10px] text-on-primary-fixed">{t("enabledCount", { count: rules.filter((r) => r.enabled).length })}</span>
      </div>
      {rules.length === 0 ? <p className="text-body-sm text-on-surface-variant">{t("empty")}</p> : <RuleList rules={rules} />}
    </Card>
  );
}
