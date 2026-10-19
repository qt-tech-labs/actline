import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { MetricsGrid } from "@/components/metrics/MetricsGrid";
import { FinanceCard } from "@/components/right/FinanceCard";
import { LookaheadCard } from "@/components/right/LookaheadCard";
import { RulesCard } from "@/components/right/RulesCard";
import { SuppliesCard } from "@/components/right/SuppliesCard";
import { HardwareCard } from "@/components/sidebar/HardwareCard";
import { LiveCamCard } from "@/components/sidebar/LiveCamCard";
import { ProjectList } from "@/components/sidebar/ProjectList";
import { IncidentFab } from "@/components/today/IncidentFab";
import { TodaySection } from "@/components/today/TodaySection";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCurrentUser } from "@/server/auth";
import { getProjectOverview, resolveProjectId } from "@/server/services/projects";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const [{ project }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const projectId = await resolveProjectId(user.id, project);

  if (!projectId) return <EmptyState />;
  const { iotEnabled } = await getProjectOverview(user.id, projectId);

  // Each section streams in behind its own boundary; their cached queries run concurrently.
  return (
    <>
      <Suspense fallback={<Skeleton className="h-16 rounded-none" />}>
        <AppHeader projectId={projectId} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-[7.5rem] rounded-none" />}>
        <ProgressBar projectId={projectId} />
      </Suspense>
      {iotEnabled ? (
        <Suspense fallback={<Skeleton className="mx-auto mt-space-lg h-52 w-full max-w-[1720px]" />}>
          <MetricsGrid projectId={projectId} />
        </Suspense>
      ) : null}

      <main className="mx-auto grid w-full max-w-[1720px] flex-1 grid-cols-1 items-start gap-space-lg px-4 pb-28 pt-space-md md:px-space-xl lg:grid-cols-12 lg:pb-space-md">
        <aside className="flex flex-col gap-space-lg lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-60" />}>
            <ProjectList activeId={projectId} />
          </Suspense>
          {iotEnabled ? (
            <>
              <Suspense fallback={<Skeleton className="h-72" />}>
                <LiveCamCard projectId={projectId} />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-40" />}>
                <HardwareCard projectId={projectId} />
              </Suspense>
            </>
          ) : null}
        </aside>

        <div className="flex flex-col gap-space-md lg:col-span-6">
          <Suspense fallback={<Skeleton className="h-[32rem]" />}>
            <TodaySection projectId={projectId} />
          </Suspense>
        </div>

        <aside className="flex flex-col gap-space-lg lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-52" />}>
            <SuppliesCard projectId={projectId} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-52" />}>
            <FinanceCard projectId={projectId} />
          </Suspense>
          {iotEnabled ? (
            <Suspense fallback={<Skeleton className="h-48" />}>
              <RulesCard projectId={projectId} />
            </Suspense>
          ) : null}
          <Suspense fallback={<Skeleton className="h-32" />}>
            <LookaheadCard projectId={projectId} />
          </Suspense>
        </aside>
      </main>

      <MobileNav iot={iotEnabled} />
      <IncidentFab projectId={projectId} />
    </>
  );
}

async function EmptyState() {
  const t = await getTranslations("empty");
  return (
    <>
      <AppHeader projectId={null} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <Icon name="psychiatry" className="text-[40px] text-outline" />
        <h1 className="font-display text-headline-md">{t("title")}</h1>
        <p className="text-body-md text-on-surface-variant">{t("hint")}</p>
      </main>
    </>
  );
}
