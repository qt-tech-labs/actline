import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getCurrentUser } from "@/server/auth";
import { getDayPlan } from "@/server/services/day";
import { getProjectOverview } from "@/server/services/projects";
import { QuickNoteButton } from "./QuickNoteButton";
import { StepsPanel } from "./StepsPanel";

export async function TodaySection({ projectId }: { projectId: string }) {
  const user = await getCurrentUser();
  const overview = await getProjectOverview(user.id, projectId);
  const [t, format, plan] = await Promise.all([
    getTranslations("day"),
    getFormatter(),
    getDayPlan(projectId, overview.currentDay),
  ]);

  if (!plan) {
    return (
      <Card className="p-space-xl text-center">
        <Icon name="event_busy" className="text-[32px] text-outline" />
        <h1 className="mt-2 font-display text-headline-md text-on-surface">{t("noPlanTitle", { day: overview.currentDay })}</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">{t("noPlanHint")}</p>
      </Card>
    );
  }

  const today = format.dateTime(new Date(`${overview.todayIso}T00:00:00Z`), { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  return (
    <>
      <Card as="section" className="relative p-space-xl">
        <div className="mb-space-sm flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary-fixed px-2.5 py-0.5 font-mono text-label-md font-bold text-on-primary-fixed">
              {t("progress", { day: overview.currentDay, total: overview.totalDays })}
            </span>
            <span title={t("todayLabel")} className="rounded bg-surface-container px-2 py-0.5 font-mono text-label-sm font-medium text-on-surface">{today}</span>
            {plan.goldenStart && plan.goldenEnd ? (
              <span title={t("goldenWindow")} className="flex items-center gap-1 rounded bg-secondary-fixed/40 px-2.5 py-0.5 font-mono text-label-sm text-on-secondary-fixed">
                <Icon name="alarm" className="text-[15px]" />
                <span className="font-semibold">{plan.goldenStart} - {plan.goldenEnd}</span>
              </span>
            ) : null}
          </div>
          <QuickNoteButton projectId={projectId} day={overview.currentDay} />
        </div>
        <h1 className="mb-space-xs font-display text-headline-lg-mobile font-bold tracking-tight text-on-surface md:text-headline-lg">{plan.title}</h1>
        <p className="max-w-[65ch] text-body-md text-on-surface-variant">{plan.summary}</p>
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
    </>
  );
}
