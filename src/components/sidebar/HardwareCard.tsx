import { getTranslations } from "next-intl/server";
import { HubSettingsButton } from "@/components/hub/HubSettingsButton";
import { Badge, Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { DeviceDto } from "@/lib/types";
import { getHardware } from "@/server/services/hardware";

const ICON: Record<DeviceDto["kind"], string> = { gateway: "router", soil_probe: "sensors", valve: "valve", camera: "videocam" };

/** What each device does when the hub is unreachable. */
const OFFLINE_LABEL: Record<DeviceDto["kind"], string> = {
  gateway: "disconnected",
  soil_probe: "noResponse",
  valve: "manualMode",
  camera: "noResponse",
};

export async function HardwareCard({ projectId }: { projectId: string }) {
  const [t, { hub, devices }] = await Promise.all([getTranslations("hardware"), getHardware(projectId)]);
  const offline = !!hub && !hub.online;
  const online = devices.filter((d) => d.status !== "offline").length;

  return (
    <Card as="section" aria-label={t("title")} className={cn("p-space-md", offline && "border-error/40")}>
      <div className="mb-space-sm flex items-center justify-between">
        <h2 className={cn("flex items-center gap-1 text-title-sm", offline ? "text-error" : "text-on-surface")}>
          <Icon name="hub" className={cn("text-[16px]", offline ? "text-error" : "text-primary")} />
          {t("title")}
        </h2>
        {offline ? (
          <span className="rounded bg-error px-2 py-0.5 font-mono text-[10px] font-bold text-white">
            {t("offlineCount", { online: 0, total: devices.length })}
          </span>
        ) : (
          <Badge className="py-0.5">{t("online", { online, total: devices.length })}</Badge>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="space-y-1.5 text-body-sm text-on-surface">
          {devices.map((d) => {
            const gateway = d.kind === "gateway";
            return (
              <li
                key={d.id}
                title={offline ? `${d.name} - ${t(OFFLINE_LABEL[d.kind])}` : `${d.name} - ${t(`status.${d.status}`)}`}
                className={cn(
                  "flex items-center justify-between rounded-lg p-1.5 px-2",
                  offline ? (gateway ? "border border-error/30 bg-error-container/30" : "bg-surface-container-low") : "bg-surface-container-low",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon name={ICON[d.kind]} className={cn("text-[16px]", offline && gateway ? "text-error" : offline ? "text-outline" : "text-primary")} />
                  <span className={cn("truncate", offline && gateway && "font-medium text-error")}>{d.name}</span>
                </span>
                {offline ? (
                  gateway ? (
                    <span className="shrink-0 rounded bg-error px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{t("disconnected")}</span>
                  ) : (
                    <span className="shrink-0 font-mono text-[11px] font-medium text-error">{t(OFFLINE_LABEL[d.kind])}</span>
                  )
                ) : d.displayValue ? (
                  <span className={cn("shrink-0 font-mono", d.status === "warning" ? "text-[11px] font-bold text-secondary" : "rounded bg-surface-container px-1.5 text-[10px] text-outline")}>
                    {d.displayValue}
                  </span>
                ) : (
                  <span
                    role="img"
                    aria-label={t(`status.${d.status}`)}
                    className={cn("size-2 shrink-0 rounded-full", d.status === "ok" ? "glow-ok bg-ok" : d.status === "warning" ? "bg-secondary" : "bg-error")}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {offline ? (
        <div className="mt-space-sm border-t border-surface-variant pt-space-xs">
          <HubSettingsButton projectId={projectId} variant="block" icon="settings" label={t("configure")} />
        </div>
      ) : null}
    </Card>
  );
}
