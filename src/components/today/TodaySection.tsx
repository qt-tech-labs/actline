import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clampProjectDay, dateOfProjectDay, dayMonthLabel } from "@/lib/day";
import { getCurrentUser } from "@/server/auth";
import { getDayPlan } from "@/server/services/day";
import { getHardware } from "@/server/services/hardware";
import { getProjectOverview } from "@/server/services/projects";
import { DayPlanFrame } from "./DayPlanFrame";
import { QuickNoteButton } from "./QuickNoteButton";
import { StepsPanel } from "./StepsPanel";

export async function TodaySection({ projectId, day }: { projectId: string; day?: number }) {
  const user = await getCurrentUser();
  const overview = await getProjectOverview(user.id, projectId);
  const currentDay = overview.currentDay;
  const selected = clampProjectDay(day, overview.totalDays, currentDay);
  const [t, plan, { hub }] = await Promise.all([
    getTranslations("day"),
    getDayPlan(projectId, selected),
    getHardware(projectId),
  ]);
  const offline = !!hub && !hub.online;

  if (!plan) {
    return (
      <DayPlanFrame day={selected}>
        <Card className="p-space-xl text-center">
          <Icon name="event_busy" className="text-[32px] text-outline" />
          <h1 className="mt-2 font-display text-headline-md text-on-surface">{t("noPlanTitle", { day: selected })}</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">{t("noPlanHint")}</p>
        </Card>
      </DayPlanFrame>
    );
  }

  const date = dayMonthLabel(dateOfProjectDay(overview.startDate, selected));
  const isToday = selected === currentDay;

  return (
    <DayPlanFrame day={selected}>
      <Card as="section" className="relative p-space-xl">
        <div className="mb-space-sm flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary-fixed px-2.5 py-0.5 font-mono text-label-md font-bold text-on-primary-fixed">
              {t("progress", { day: selected, total: overview.totalDays })}
            </span>
            <span title={isToday ? t("todayLabel") : t("dayLabel", { day: selected })} className="rounded bg-surface-container px-2 py-0.5 font-mono text-label-sm font-medium text-on-surface">
              {date}
            </span>
            {plan.goldenStart && plan.goldenEnd ? (
              <span title={t("goldenWindow")} className="flex items-center gap-1 rounded bg-secondary-fixed/40 px-2.5 py-0.5 font-mono text-label-sm text-on-secondary-fixed">
                <Icon name="alarm" className="text-[15px]" />
                <span className="font-semibold">{plan.goldenStart} - {plan.goldenEnd}</span>
              </span>
            ) : null}
            {isToday ? null : (
              <Link
                href={`/?project=${projectId}`}
                className="flex items-center gap-1 rounded border border-surface-variant bg-surface px-2.5 py-0.5 font-mono text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <Icon name="today" className="text-[14px] text-primary" />
                {t("backToToday", { day: currentDay })}
              </Link>
            )}
          </div>
          <QuickNoteButton projectId={projectId} day={selected} />
        </div>
        <h1 className="mb-space-xs font-display text-headline-lg-mobile font-bold tracking-tight text-on-surface md:text-headline-lg">{plan.title}</h1>
        <p className="max-w-[65ch] text-body-md text-on-surface-variant">{plan.summary}</p>
        {offline ? (
          <div className="mt-space-md flex items-center justify-between gap-space-sm rounded-lg border-l-4 border-error bg-error-container/20 p-space-sm">
            <p className="flex min-w-0 items-center gap-2 text-body-sm text-on-surface-variant">
              <Icon name="warning" className="shrink-0 text-[18px] text-error" />
              <span className="truncate sm:whitespace-normal">
                <strong className="text-error">{t("iotWarningLabel")}</strong> {t("iotWarning")}
              </span>
            </p>
            <span className="shrink-0 rounded bg-error px-2 py-0.5 font-mono text-[10px] font-bold text-white">{t("safeMode")}</span>
          </div>
        ) : null}
        {plan.aiHint ? (
          <div className="mt-space-md flex items-center justify-between gap-space-sm rounded-lg border-l-4 border-primary bg-surface-container p-space-sm">
            <p className="flex min-w-0 items-center gap-2 text-body-sm text-on-surface-variant">
              <Icon name="neurology" className="shrink-0 text-[18px] text-primary" />
              <span className="truncate sm:whitespace-normal">
                <strong className="text-primary">{t("aiHint")}</strong> {plan.aiHint.body}
              </span>
            </p>
            {plan.aiHint.confidencePct != null ? (
              <span title={t("aiConfidence")} className="shrink-0 rounded bg-primary-fixed px-1.5 py-0.5 font-mono text-[10px] text-on-primary-fixed">
                {plan.aiHint.confidencePct}% AI
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      <StepsPanel
        projectId={projectId}
        day={plan.day}
        totalDays={overview.totalDays}
        planTitle={plan.title}
        steps={plan.steps}
        completed={plan.completed}
      />
    </DayPlanFrame>
  );
}
