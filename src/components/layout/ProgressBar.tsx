import { getFormatter, getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { clampProjectDay } from "@/lib/day";
import { getCurrentUser } from "@/server/auth";
import { getHardware } from "@/server/services/hardware";
import { getProjectOverview } from "@/server/services/projects";
import { getTimeline } from "@/server/services/timeline";
import { EnableIotButton } from "@/components/hub/EnableIotButton";
import { HubSettingsButton } from "@/components/hub/HubSettingsButton";
import { MilestoneTimeline } from "./MilestoneTimeline";

/** Sub-header: overall progress, IoT hub status and the milestone track. */
export async function ProgressBar({ projectId, selectedDay }: { projectId: string; selectedDay?: number }) {
  const user = await getCurrentUser();
  const [t, format, overview, timeline, hardware] = await Promise.all([
    getTranslations("progress"),
    getFormatter(),
    getProjectOverview(user.id, projectId),
    getTimeline(user.id, projectId),
    getHardware(projectId),
  ]);
  const day = clampProjectDay(selectedDay, overview.totalDays, overview.currentDay);
  const hub = hardware.hub;

  return (
    <section className="sticky top-16 z-30 border-b border-surface-variant bg-surface-container-lowest px-4 py-space-sm shadow-[0_2px_8px_rgba(0,0,0,0.02)] md:px-space-xl">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-2">
        <div className="flex items-center justify-between gap-space-md">
          <div className="flex min-w-0 items-center gap-2">
            <span
              title={t("summary", { day: overview.currentDay, total: overview.totalDays, pct: overview.progressPct })}
              className="flex min-w-0 items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-0.5 font-mono text-label-sm font-bold text-on-primary-fixed shadow-sm"
            >
              <Icon name="pace" className="shrink-0 text-[15px]" />
              <span className="truncate">{t("summary", { day: overview.currentDay, total: overview.totalDays, pct: overview.progressPct })}</span>
            </span>
            {overview.stageName ? (
              <span className="hidden items-center gap-1 truncate text-caption text-on-surface-variant sm:inline-flex">
                <Icon name="calendar_month" className="text-[15px] text-primary" />
                {overview.stageName}
              </span>
            ) : null}
          </div>

          {overview.iotEnabled && hub ? (
            hub.online ? (
              <div className="flex shrink-0 items-center gap-space-sm rounded-lg border border-surface-variant bg-surface-container-low px-2.5 py-0.5">
                <div className="flex items-center gap-1.5 border-r border-outline-variant/40 pr-2">
                  <span aria-hidden="true" className="glow-ok size-2 animate-pulse rounded-full bg-ok" />
                  <span className="font-mono text-label-md font-semibold text-primary">{hub.name}</span>
                  <span className="font-mono text-label-sm text-outline">(IoT)</span>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-label-sm text-on-surface-variant">
                  {hub.batteryPct != null ? (
                    <span className="flex items-center gap-0.5" title={t("battery")}>
                      <Icon name="battery_5_bar" className="text-[14px] text-primary" /> {hub.batteryPct}%
                    </span>
                  ) : null}
                  {hub.lastSeenAt ? (
                    <span className="hidden items-center gap-0.5 sm:flex">
                      <Icon name="sync" className="text-[14px] text-secondary" />
                      <strong className="text-[11px] font-medium text-on-surface">
                        {t("synced", { time: format.relativeTime(new Date(hub.lastSeenAt)) })}
                      </strong>
                    </span>
                  ) : null}
                  {hub.location ? (
                    <span className="hidden rounded border border-surface-variant bg-surface-container-lowest px-1.5 text-[10px] text-on-surface md:inline-flex">
                      {hub.location}
                    </span>
                  ) : null}
                </div>
                <HubSettingsButton projectId={projectId} />
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-space-sm rounded-lg border border-error/40 bg-error-container/40 px-2.5 py-1">
                <div className="flex items-center gap-1.5 border-r border-error/40 pr-2">
                  <span aria-hidden="true" className="relative flex size-2">
                    <span aria-hidden="true" className="absolute inline-flex size-full animate-pulse rounded-full bg-error opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-error" />
                  </span>
                  <span className="font-mono text-label-md font-semibold text-error">{hub.name}</span>
                  <span className="rounded bg-error px-1 font-mono text-[10px] font-bold uppercase text-white">{t("offline")}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-label-sm text-on-surface">
                  {hub.lastSeenAt ? (
                    <span className="flex items-center gap-0.5 font-medium text-error">
                      <Icon name="wifi_off" className="text-[14px]" />
                      {t("signalLost", { time: format.relativeTime(new Date(hub.lastSeenAt)) })}
                    </span>
                  ) : null}
                  {hub.location ? (
                    <span className="hidden rounded border border-surface-variant bg-surface-container-lowest px-1.5 text-[10px] text-outline md:inline-flex">
                      {hub.location}
                    </span>
                  ) : null}
                </div>
                <HubSettingsButton projectId={projectId} variant="solid" icon="settings_backup_restore" label={t("reconnect")} />
              </div>
            )
          ) : (
            <EnableIotButton projectId={projectId} enabled={overview.iotEnabled} />
          )}
        </div>

        <MilestoneTimeline projectId={projectId} nodes={timeline.nodes} phases={timeline.phases} progressPct={timeline.progressPct} selectedDay={day} />
      </div>
    </section>
  );
}
