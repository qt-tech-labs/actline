"use client";

import { useTranslations } from "next-intl";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-body-lg text-on-surface">{t("genericError")}</p>
      <button type="button" onClick={reset} className="rounded-lg bg-primary-container px-4 py-2 text-caption text-white hover:bg-primary">
        {t("retry")}
      </button>
    </main>
  );
}
