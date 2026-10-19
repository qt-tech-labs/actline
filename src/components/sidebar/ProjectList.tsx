import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ComingSoonButton } from "@/components/ui/ComingSoon";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/server/auth";
import { listProjects } from "@/server/services/projects";

export async function ProjectList({ activeId }: { activeId: string }) {
  const user = await getCurrentUser();
  const [t, projects] = await Promise.all([getTranslations("projects"), listProjects(user.id)]);

  return (
    <Card className="p-space-md">
      <div className="mb-space-sm flex items-center justify-between border-b border-surface-variant pb-space-sm">
        <div>
          <h2 className="text-title-sm text-on-surface">{t("title")}</h2>
          <p className="font-mono text-label-sm text-on-surface-variant">{t("count", { count: projects.length })}</p>
        </div>
        <ComingSoonButton label={t("add")} className="flex size-7 items-center justify-center rounded-lg bg-surface-container text-primary">
          <Icon name="add_circle" className="text-[18px]" />
        </ComingSoonButton>
      </div>
      <nav className="space-y-1">
        {projects.map((p) => {
          const active = p.id === activeId;
          return (
            <Link
              key={p.id}
              href={`/?project=${p.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between rounded-lg px-space-md py-space-sm transition-colors",
                active ? "border-l-4 border-primary bg-surface-container-highest text-title-sm text-primary" : "text-body-md text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <span className="flex min-w-0 items-center gap-space-sm">
                <Icon name={p.icon} className={cn("text-[20px]", active ? "text-primary" : "text-outline")} />
                <span className="truncate">{p.name}</span>
              </span>
              {active ? (
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary-container" />
              ) : (
                <span className="font-mono text-label-sm text-outline">N{String(p.currentDay).padStart(2, "0")}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}
