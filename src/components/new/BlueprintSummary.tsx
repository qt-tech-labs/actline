import { getFormatter, getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Blueprint, BlueprintTag } from "@/lib/types";

const TAG_TONE: Record<BlueprintTag["tone"], string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
};

/** Bento header of the blueprint: what the AI proposes, for how long and at what cost. */export async function BlueprintSummary({ blueprint }: { blueprint: Blueprint }) {
  const t = await getTranslations("newProject");
  const format = await getFormatter();
  const firstNode = blueprint.nodes[0];
  const nodeShare = firstNode ? Math.round(((firstNode.endDay - firstNode.startDay + 1) / blueprint.totalDays) * 100) : 25;
  const delta = blueprint.budgetDeltaVnd;

  return (
    <div className="grid grid-cols-1 gap-6 rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgba(30,38,33,0.04)] md:grid-cols-4">
      <div className="flex flex-col justify-between md:col-span-2">
        <div>
          <span className="font-mono text-label-sm uppercase tracking-wider text-outline">{t("blueprint.nameLabel")}</span>
          <h3 className="mt-1 font-display text-headline-md font-bold text-primary">{blueprint.name}</h3>
          <p className="mt-2 text-body-md text-on-surface-variant">{blueprint.summary}</p>
        </div>
        <ul className="mt-4 flex flex-wrap items-center gap-3 border-t border-surface-variant pt-4">
          {blueprint.tags.map((tag, index) => (
            <li key={tag.label} className="flex items-center gap-3">
              {index > 0 ? <span aria-hidden="true" className="text-outline">·</span> : null}
              <span className="inline-flex items-center gap-1 text-body-sm font-medium text-on-surface">
                <Icon name={tag.icon} className={cn("text-[16px]", TAG_TONE[tag.tone])} />
                {tag.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-between rounded-lg border border-surface-variant bg-surface-container-low p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-label-sm uppercase text-outline">{t("blueprint.durationTile")}</span>
          <Icon name="calendar_month" className="text-[20px] text-primary" />
        </div>
        <div className="my-2">
          <p className="font-display text-headline-lg font-bold text-on-surface">
            {blueprint.totalDays} <span className="text-body-md font-normal text-on-surface-variant">{t("blueprint.days")}</span>
          </p>
          <p className="mt-1 font-mono text-label-sm font-medium text-primary">{t("blueprint.nodeCount", { count: blueprint.nodeCount })}</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
          <div className="h-full rounded-full bg-primary" style={{ width: `${nodeShare}%` }} />
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-lg border border-surface-variant bg-surface-container-low p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-label-sm uppercase text-outline">{t("blueprint.budgetTile")}</span>
          <Icon name="account_balance_wallet" className="text-[20px] text-secondary" />
        </div>
        <div className="my-2">
          <p className="font-display text-headline-lg font-bold text-on-surface">
            {format.number(blueprint.totalPackageVnd)} <span className="text-body-md font-normal text-on-surface-variant">đ</span>
          </p>
          <p className={cn("mt-1 font-mono text-label-sm font-medium", delta >= 0 ? "text-secondary" : "text-error")}>
            {delta >= 0
              ? t("blueprint.saving", { amount: `${format.number(delta)} đ` })
              : t("blueprint.overBudget", { amount: `${format.number(Math.abs(delta))} đ` })}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-surface-variant/80 pt-2 font-mono text-label-sm text-on-surface-variant">
          <span>{t("blueprint.rhythm")}</span>
          <span className="font-semibold text-on-surface">{blueprint.rhythmLabel}</span>
        </div>
      </div>
    </div>
  );
}
