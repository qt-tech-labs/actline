import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/server/auth";
import { getLookahead } from "@/server/services/day";
import { getProjectOverview } from "@/server/services/projects";

export async function LookaheadCard({ projectId }: { projectId: string }) {
  const user = await getCurrentUser();
  const overview = await getProjectOverview(user.id, projectId);
  const [t, days] = await Promise.all([getTranslations("lookahead"), getLookahead(projectId, overview.currentDay)]);

  return (
    <Card as="section" aria-label={t("title")} className="p-space-md shadow-sm">
      <h2 className="mb-space-xs flex items-center gap-1 text-title-sm text-on-surface">
        <Icon name="event_upcoming" className="text-[16px] text-primary" />
        {t("title")}
      </h2>
      {days.length === 0 ? (
        <p className="mt-2 text-body-sm text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {days.map((d, i) => (
            <li key={d.day} className={cn("border-l-2 pl-2", i === 0 ? "border-primary-container" : "border-surface-variant")}>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className={cn("font-semibold", i === 0 ? "text-primary" : "text-on-surface-variant")}>
                  {d.day === overview.currentDay + 1 ? t("tomorrow", { day: d.day }) : t("day", { day: d.day })}
                </span>
                {d.estimatedMinutes ? <span className="text-outline">{t("minutes", { count: d.estimatedMinutes })}</span> : null}
              </div>
              <p className={cn("truncate text-[12px]", i === 0 ? "text-on-surface" : "text-on-surface-variant")}>{d.title}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
