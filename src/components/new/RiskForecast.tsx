import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Blueprint } from "@/lib/types";

/** What can go wrong, and what the engine does about it. */
export async function RiskForecast({ blueprint }: { blueprint: Blueprint }) {
  const t = await getTranslations("newProject");

  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-secondary-fixed bg-surface-container-lowest p-5 shadow-[0_1px_3px_rgba(30,38,33,0.04)]">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-secondary-container" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-secondary">
          <Icon name="shield_with_heart" fill className="text-[20px]" />
          <h4 className="text-title-md font-bold text-on-surface">{t("blueprint.risk.title")}</h4>
        </div>
        <span className="rounded bg-secondary-fixed px-2 py-0.5 font-mono text-label-sm font-medium text-on-secondary-fixed">
          {t("blueprint.risk.badge")}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 text-body-sm text-on-surface-variant">
        {blueprint.risks.map((risk) => (
          <div key={risk.title} className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-2.5">
            <Icon name={risk.icon} className={cn("mt-0.5 text-[16px]", risk.tone === "danger" ? "text-error" : "text-secondary")} />
            <p>
              <strong className="block text-on-surface">{risk.title}</strong>
              {risk.body}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-surface-variant pt-2 font-mono text-label-sm text-outline">
        <span>{t("blueprint.risk.replanReady")}</span>
        <span className="font-semibold text-primary">{t("blueprint.risk.replan")}</span>
      </div>
    </div>
  );
}
