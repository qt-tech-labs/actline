import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { ComingSoonButton } from "@/components/ui/ComingSoon";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/server/auth";
import { listProjects } from "@/server/services/projects";
import { ProjectSwitcher } from "./ProjectSwitcher";

const NAV = [
  { key: "today", icon: "calendar_today" },
  { key: "timeline", icon: "timeline" },
  { key: "inventory", icon: "inventory_2" },
  { key: "photoLog", icon: "photo_library" },
] as const;

export async function AppHeader({ projectId, mode = "default" }: { projectId: string | null; mode?: "default" | "create" }) {
  const [t, user] = await Promise.all([getTranslations("header"), getCurrentUser()]);
  const projects = await listProjects(user.id);

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between bg-surface/95 px-4 text-primary shadow-sm backdrop-blur-md md:px-space-xl">
      <div className="flex items-center gap-space-lg">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-primary-container font-display text-headline-md font-bold text-white shadow-sm">
            mA
          </span>
          <span className="font-display text-headline-md font-bold tracking-tight">{t("brand")}</span>
          <span aria-hidden="true" className="glow-ok size-2 rounded-full bg-ok" />
        </div>
        {mode === "create" ? (
          <Link
            href="/"
            title={t("modeSwitch")}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-variant bg-surface-container px-3 py-1.5 text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-secondary-container" />
            <span className="font-mono text-label-md uppercase tracking-wider text-on-surface-variant">{t("mode")}</span>
            <span className="text-title-sm font-semibold text-primary">{t("modeName")}</span>
            <Icon name="unfold_more" className="text-[16px] text-outline" />
          </Link>
        ) : projectId ? (
          <ProjectSwitcher projects={projects} activeId={projectId} />
        ) : null}
      </div>

      <nav aria-label={t("nav.label")} className="hidden h-full items-center gap-1 md:flex">
        {NAV.map(({ key, icon }) =>
          key === "today" ? (
            // "Hôm nay" is the one tab that leads somewhere: on the home screen it
            // is the active page, in the studio it is the way back to it.
            <Link
              key={key}
              href="/"
              aria-current={mode === "default" ? "page" : undefined}
              className={cn(
                "flex h-full items-center gap-1.5 border-b-2 px-3 text-[13px] font-semibold",
                mode === "default"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant transition-colors hover:border-outline-variant hover:text-on-surface",
              )}
            >
              <Icon name={icon} fill={mode === "default"} className="text-[17px]" />
              {t(mode === "default" ? `nav.${key}` : "nav.todayCreate")}
            </Link>
          ) : (
            <ComingSoonButton key={key} label={t(`nav.${key}`)} className="flex h-full items-center gap-1.5 px-3 text-[13px] text-on-surface-variant">
              <Icon name={icon} className="text-[17px]" />
              {t(`nav.${key}`)}
            </ComingSoonButton>
          ),
        )}
      </nav>

      <div className="flex items-center gap-1.5">
        <ComingSoonButton label={t("notifications")} className="relative rounded-lg p-2 text-on-surface-variant">
          <Icon name="notifications" />
        </ComingSoonButton>
        <ComingSoonButton label={t("help")} className="hidden rounded-lg p-2 text-on-surface-variant sm:block">
          <Icon name="help_outline" />
        </ComingSoonButton>
        <ComingSoonButton label={t("settings")} className="rounded-lg p-2 text-on-surface-variant">
          <Icon name="tune" />
        </ComingSoonButton>
        <div className="ml-2 size-8 overflow-hidden rounded-full border border-outline-variant/40" title={t("account")}>
          {user.avatarUrl ? <Image src={user.avatarUrl} alt={user.name} width={32} height={32} className="size-full object-cover" /> : null}
        </div>
      </div>
    </header>
  );
}
