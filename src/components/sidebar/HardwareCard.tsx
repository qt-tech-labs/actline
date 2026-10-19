import { getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { DeviceDto } from "@/lib/types";
import { getHardware } from "@/server/services/hardware";

const ICON: Record<DeviceDto["kind"], string> = { gateway: "router", soil_probe: "sensors", valve: "valve", camera: "videocam" };

export async function HardwareCard({ projectId }: { projectId: string }) {
  const [t, { devices }] = await Promise.all([getTranslations("hardware"), getHardware(projectId)]);
  const online = devices.filter((d) => d.status !== "offline").length;

  return (
    <Card as="section" aria-label={t("title")} className="p-space-md">
      <div className="mb-space-sm flex items-center justify-between">
        <h2 className="flex items-center gap-1 text-title-sm text-on-surface">
          <Icon name="hub" className="text-[16px] text-primary" />
          {t("title")}
        </h2>
        <Badge className="py-0.5">{t("online", { online, total: devices.length })}</Badge>
      </div>
      {devices.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="space-y-1.5 text-body-sm text-on-surface">
          {devices.map((d) => (
            <li key={d.id} title={`${d.name} - ${t(`status.${d.status}`)}`} className="flex items-center justify-between rounded-lg bg-surface-container-low p-1.5 px-2">
              <span className="flex min-w-0 items-center gap-2">
                <Icon name={ICON[d.kind]} className="text-[16px] text-primary" />
                <span className="truncate">{d.name}</span>
              </span>
              {d.displayValue ? (
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
          ))}
        </ul>
      )}
    </Card>
  );
}
