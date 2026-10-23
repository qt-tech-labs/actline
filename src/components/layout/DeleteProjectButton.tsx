"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";
import { api, apiErrorDetail } from "@/lib/api-client";

export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  const t = useTranslations("switcher");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api(`/projects/${projectId}`, { method: "DELETE" });
      toast("success", t("deleted"));
      setOpen(false);
      // Drop ?project= so the home screen falls back to another project (or the empty state).
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast("error", t("deleteFailed"), apiErrorDetail(error) ?? undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title={t("delete")}
        aria-label={t("delete")}
        onClick={() => setOpen(true)}
        className="flex size-8 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-low text-error transition-colors hover:bg-error-container sm:size-9"
      >
        <Icon name="delete" className="text-[18px] sm:text-[20px]" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-card-border bg-surface-container-lowest p-5 shadow-lg"
          >
            <h2 id="delete-project-title" className="text-title-sm font-semibold text-primary">{t("deleteTitle")}</h2>
            <p className="mt-2 text-body-sm text-on-surface-variant">{t("deleteBody", { name })}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-body-sm text-on-surface-variant hover:bg-surface-container">
                {t("cancel")}
              </button>
              <button type="button" disabled={busy} onClick={remove} className="rounded-lg bg-error px-3 py-1.5 text-body-sm font-semibold text-white disabled:opacity-60">
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
