"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { TextReportDialog } from "@/components/ui/TextReportDialog";

export function QuickNoteButton({ projectId, day }: { projectId: string; day: number }) {
  const t = useTranslations("dialogs");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-1 text-[12px] font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container active:scale-95"
      >
        <Icon name="edit_note" className="text-[16px] text-primary" />
        {t("noteTitle")}
      </button>
      <TextReportDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("noteTitle")}
        label={t("noteLabel")}
        placeholder={t("notePlaceholder")}
        successText={t("noteSaved")}
        endpoint={`/projects/${projectId}/notes`}
        extra={{ day }}
      />
    </>
  );
}
