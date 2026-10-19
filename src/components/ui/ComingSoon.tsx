import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";

/** Button for features from the design that have no backing screen yet. */
export async function ComingSoonButton({ className, children, label }: { className?: string; children: React.ReactNode; label: string }) {
  const t = await getTranslations("common");
  return (
    <button type="button" aria-disabled="true" aria-label={label} title={`${label} · ${t("comingSoon")}`} className={cn("cursor-not-allowed", className)}>
      {children}
    </button>
  );
}
