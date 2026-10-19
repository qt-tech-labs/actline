"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { api } from "@/lib/api-client";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

type Severity = "low" | "medium" | "high";

/** Free-text form posting to the REST API; used for quick notes and incident reports. */
export function TextReportDialog({
  open,
  onClose,
  title,
  label,
  placeholder,
  successText,
  endpoint,
  extra,
  withSeverity,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  placeholder: string;
  successText: string;
  endpoint: string;
  extra?: Record<string, unknown>;
  withSeverity?: boolean;
}) {
  const t = useTranslations("dialogs");
  const tc = useTranslations("common");
  const fieldId = useId();
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setText("");
    setError(null);
    setSent(false);
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await api(endpoint, { method: "POST", body: { ...extra, body: text, ...(withSeverity ? { severity } : {}) } });
        setSent(true);
      } catch {
        setError(tc("genericError"));
      }
    });
  };

  return (
    <Dialog open={open} onClose={close} title={title}>
      {sent ? (
        <div className="space-y-space-md">
          <p role="status" className="flex items-center gap-2 text-body-md text-primary">
            <Icon name="check_circle" className="text-ok" />
            {successText}
          </p>
          <button type="button" onClick={close} className="rounded-lg bg-primary-container px-4 py-2 text-caption text-white hover:bg-primary">
            {tc("close")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-space-md">
          {withSeverity ? (
            <fieldset className="flex gap-2">
              <legend className="mb-1 text-label-md text-on-surface-variant">{t("incidentSeverity")}</legend>
              {(["low", "medium", "high"] as const).map((s) => (
                <label key={s} className="cursor-pointer">
                  <input type="radio" name="severity" value={s} checked={severity === s} onChange={() => setSeverity(s)} className="peer sr-only" />
                  <span className="block rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm peer-checked:border-primary peer-checked:bg-primary-fixed peer-checked:text-on-primary-fixed peer-focus-visible:outline-2 peer-focus-visible:outline-primary-container">
                    {t(`severity.${s}`)}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <div>
            <label htmlFor={fieldId} className="mb-1 block text-label-md text-on-surface-variant">{label}</label>
            <textarea
              id={fieldId}
              required
              rows={4}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low p-space-sm text-body-md focus:border-primary focus:outline-none"
            />
          </div>
          {error ? <p role="alert" className="text-body-sm text-error">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-caption text-on-surface-variant hover:bg-surface-container">
              {tc("cancel")}
            </button>
            <button type="submit" disabled={pending || !text.trim()} className="rounded-lg bg-primary-container px-4 py-2 text-caption text-white hover:bg-primary disabled:opacity-50">
              {tc("submit")}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
