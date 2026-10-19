"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { AutomationRuleDto } from "@/lib/types";

export function RuleList({ rules }: { rules: AutomationRuleDto[] }) {
  const t = useTranslations("rules");
  const tc = useTranslations("common");
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(rules, (list, patch: { id: string; enabled: boolean }) =>
    list.map((r) => (r.id === patch.id ? { ...r, enabled: patch.enabled } : r)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (rule: AutomationRuleDto) => {
    setError(null);
    startTransition(async () => {
      setOptimistic({ id: rule.id, enabled: !rule.enabled });
      try {
        await api(`/automation-rules/${rule.id}`, { method: "PATCH", body: { enabled: !rule.enabled } });
        router.refresh();
      } catch {
        setError(tc("genericError"));
      }
    });
  };

  return (
    <>
      <ul className="space-y-2">
        {optimistic.map((r) => (
          <li key={r.id} className={cn("flex items-center justify-between gap-2 rounded-lg border border-surface-variant/40 bg-surface-container-low p-2", !r.enabled && "opacity-65")}>
            <div className="min-w-0">
              <p className="truncate text-caption font-semibold text-on-surface">{r.name}</p>
              <p className="truncate text-[10px] text-on-surface-variant">{r.condition}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={r.enabled}
              aria-label={t("toggle", { name: r.name })}
              title={r.enabled ? t("on") : t("off")}
              onClick={() => toggle(r)}
              className={cn("flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5 transition-colors", r.enabled ? "bg-primary-container" : "bg-surface-variant")}
            >
              <span className={cn("size-3.5 rounded-full bg-surface-container-lowest shadow-sm transition-transform", r.enabled && "translate-x-3.5")} />
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="mt-2 text-body-sm text-error">{error}</p> : null}
    </>
  );
}
