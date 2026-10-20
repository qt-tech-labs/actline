import { getTranslations } from "next-intl/server";
import { BomSupplies } from "./BomSupplies";
import { DayBrowser } from "./DayBrowser";
import { HardwareKit } from "./HardwareKit";
import { NodeGrid } from "./NodeGrid";
import { RiskForecast } from "./RiskForecast";
import { BlueprintSummary } from "./BlueprintSummary";
import { Icon } from "@/components/ui/Icon";
import type { Blueprint } from "@/lib/types";

/** Section 2 — the live plan: summary, hardware kit, nodes, the days, BOM and risks. */
export async function BlueprintPreview({ blueprint, iotEnabled }: { blueprint: Blueprint | null; iotEnabled: boolean }) {
  const t = await getTranslations("newProject");

  if (!blueprint) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-variant pb-2">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="size-3 rounded-full bg-outline-variant ring-4 ring-surface-variant" />
            <h2 className="font-display text-headline-md font-semibold tracking-tight text-on-surface">{t("blueprint.title")}</h2>
          </div>
          <p className="font-mono text-label-sm text-on-surface-variant">{t("blueprint.empty.state")}</p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <Icon name="auto_awesome" className="text-[28px]" />
          </span>
          <h3 className="font-display text-title-lg font-bold text-on-surface">{t("blueprint.empty.title")}</h3>
          <p className="max-w-md text-body-md text-on-surface-variant">{t("blueprint.empty.hint")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-variant pb-2">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-3 rounded-full bg-primary ring-4 ring-primary-fixed" />
          <h2 className="font-display text-headline-md font-semibold tracking-tight text-on-surface">{t("blueprint.title")}</h2>
          <span
            className={
              blueprint.engine === "ai"
                ? "rounded bg-primary-fixed px-2 py-0.5 font-mono text-label-sm uppercase text-on-primary-fixed"
                : "rounded bg-secondary-fixed px-2 py-0.5 font-mono text-label-sm uppercase text-on-secondary-fixed"
            }
          >
            {blueprint.engine === "ai" ? t("blueprint.engineAi", { model: blueprint.model ?? "" }) : t("blueprint.engineTemplate")}
          </span>
        </div>
        <p className="font-mono text-label-sm text-on-surface-variant">{t("blueprint.version", { version: blueprint.version })}</p>
      </div>

      <BlueprintSummary blueprint={blueprint} />
      {blueprint.engine === "template" ? (
        <p className="flex items-center gap-2 rounded-lg border border-secondary/40 bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
          <Icon name="tips_and_updates" className="text-[16px] text-secondary" />
          {t("blueprint.engineTemplateHint")}
        </p>
      ) : null}
      <HardwareKit blueprint={blueprint} iotEnabled={iotEnabled} />
      <NodeGrid blueprint={blueprint} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <DayBrowser blueprint={blueprint} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <BomSupplies blueprint={blueprint} />
          <RiskForecast blueprint={blueprint} />
        </div>
      </div>
    </section>
  );
}
