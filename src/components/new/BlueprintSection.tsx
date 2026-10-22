"use client";

import { useTranslations } from "next-intl";
import { useNewProject } from "./NewProjectProvider";

/**
 * Wraps the live blueprint section. While a new plan is being crafted the
 * section resets: the old draft leaves the screen (it is deleted server-side
 * before the run, so a failure keeps the empty studio too) and a quiet
 * crafting state holds its place until the refreshed route commits.
 */
export function BlueprintSection({ children }: { children: React.ReactNode }) {
  const t = useTranslations("newProject");
  const { busy, syncing } = useNewProject();

  if (busy !== "generate" && !syncing) return <>{children}</>;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-variant pb-2">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-3 rounded-full bg-outline-variant ring-4 ring-surface-variant" />
          <h2 className="font-display text-headline-md font-semibold tracking-tight text-on-surface">{t("blueprint.title")}</h2>
        </div>
        <p className="font-mono text-label-sm text-on-surface-variant">{t("blueprint.crafting.state")}</p>
      </div>

      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"
      >
        <span
          aria-hidden="true"
          className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
        <h3 className="font-display text-title-lg font-bold text-on-surface">{t("blueprint.crafting.title")}</h3>
        <p className="max-w-md text-body-md text-on-surface-variant">{t("blueprint.crafting.hint")}</p>
      </div>
    </section>
  );
}
