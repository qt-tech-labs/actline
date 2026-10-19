"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { TextReportDialog } from "@/components/ui/TextReportDialog";

export function IncidentFab({ projectId }: { projectId: string }) {
  const t = useTranslations("dialogs");
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t("incidentTitle")}
          className="flex items-center gap-2 rounded-full border border-error/40 bg-error px-4 py-3 text-[13px] font-semibold text-on-error shadow-lg backdrop-blur-sm transition-all hover:bg-on-error-container active:scale-95"
        >
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-error-container opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-white" />
          </span>
          <Icon name="warning" />
          {t("incidentTitle")}
        </button>
      </div>
      <TextReportDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("incidentTitle")}
        label={t("incidentLabel")}
        placeholder={t("incidentPlaceholder")}
        successText={t("incidentSent")}
        endpoint={`/projects/${projectId}/incidents`}
        withSeverity
      />
    </>
  );
}
