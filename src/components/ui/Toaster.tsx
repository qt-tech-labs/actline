"use client";

import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type ToastKind = "success" | "error" | "warning" | "info";

type ToastAction = { label: string; onClick: () => void };

type ToastItem = { id: number; kind: ToastKind; title: string; detail?: string; action?: ToastAction };

type ToastApi = {
  /** Shows a message for a few seconds; errors stay longer. */
  toast: (kind: ToastKind, title: string, detail?: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastKind, string> = { success: "check_circle", error: "error", warning: "warning", info: "info" };

const TONES: Record<ToastKind, string> = {
  success: "bg-primary-fixed text-primary",
  error: "bg-error-container text-error",
  warning: "bg-tertiary-fixed text-tertiary",
  info: "bg-surface-container text-on-surface-variant",
};

const DURATION_MS: Record<ToastKind, number> = { success: 4000, info: 4000, warning: 7000, error: 8000 };
const MAX_VISIBLE = 4;

/** Status messages for any action: one stack, top right, announced to screen readers. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastApi["toast"]>(
    (kind, title, detail, action) => {
      nextId.current += 1;
      const id = nextId.current;
      setItems((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, kind, title, detail, action }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS[kind]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-3 shadow-lg"
          >
            <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[item.kind]}`}>
              <Icon name={ICONS[item.kind]} fill className="text-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-title-sm text-on-surface">{item.title}</p>
              {item.detail ? <p className="break-words text-body-sm text-on-surface-variant">{item.detail}</p> : null}
              {item.action ? (
                <button
                  type="button"
                  onClick={() => {
                    dismiss(item.id);
                    item.action?.onClick();
                  }}
                  className="mt-2 rounded-lg border border-surface-variant bg-surface px-3 py-1 text-body-sm font-medium text-primary interactive hover:bg-surface-container"
                >
                  {item.action.label}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t("close")}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-outline interactive hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
