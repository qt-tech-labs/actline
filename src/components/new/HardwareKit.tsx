import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Blueprint } from "@/lib/types";
import { DeviceEditor } from "./DeviceEditor";
import { IotSwitch } from "./IotSwitch";

/** Predicted IoT kit. IoT stays a suggestion: the user can decline it (FR-9.2). */
export async function HardwareKit({ blueprint, iotEnabled }: { blueprint: Blueprint; iotEnabled: boolean }) {
  const t = await getTranslations("newProject");

  return (
    <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-[0_1px_3px_rgba(30,38,33,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <Icon name="hub" className="text-[19px]" />
          </div>
          <div>
            <h4 className="flex items-center gap-2 text-title-sm font-bold text-on-surface">
              {t("blueprint.hardware.title")}
              {blueprint.iotSuggested ? (
                <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-mono text-[10px] text-on-primary-fixed">{t("blueprint.hardware.badge")}</span>
              ) : null}
            </h4>
            <p className="text-[11px] text-on-surface-variant">{t("blueprint.hardware.hint")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-variant bg-surface-container-low px-2.5 py-1 font-mono text-[11px] text-on-surface-variant">
            <span aria-hidden="true" className={cn("size-2 rounded-full", iotEnabled ? "glow-ok bg-ok" : "bg-outline-variant")} />
            {iotEnabled ? t("blueprint.hardware.ready") : t("blueprint.hardware.off")}
          </span>
          <DeviceEditor blueprint={blueprint} />
        </div>
      </div>

      {blueprint.devices.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {blueprint.devices.map((device) => (
            <div key={device.name} className="flex items-center gap-3 rounded-lg border border-surface-variant/60 bg-surface-container-low p-3">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border border-surface-variant bg-surface-container-lowest",
                  device.tone === "secondary" ? "text-secondary" : "text-primary",
                )}
              >
                <Icon name={device.icon} className="text-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-outline">{device.role}</span>
                  <span className={cn("font-mono text-[10px]", device.tone === "secondary" ? "text-secondary" : "text-primary")}>
                    {device.protocol}
                  </span>
                </div>
                <p className="truncate text-[13px] font-semibold text-on-surface">{device.name}</p>
                <p className="truncate text-[10px] text-on-surface-variant">{device.detail}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-body-sm text-on-surface-variant">{t("blueprint.hardware.notNeeded")}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-surface-variant pt-3">
        <p className="text-body-sm text-on-surface-variant">
          {blueprint.iotSuggested ? t("blueprint.hardware.suggested") : t("blueprint.hardware.notNeeded")}
        </p>
        <IotSwitch checked={iotEnabled} />
      </div>
    </div>
  );
}
