"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, locales } from "@/i18n/config";

type Locale = (typeof locales)[number];

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("switch")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        <Icon name="language" className="text-[18px]" />
        <span className="hidden text-[13px] font-medium text-on-surface-variant sm:block">{t(locale)}</span>
        <Icon name="expand_more" className="hidden text-[16px] sm:block" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-lg border border-surface-variant bg-surface shadow-lg">
          <ul role="listbox" aria-label={t("label")} className="py-1">
            {locales.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === locale}
                  disabled={isPending}
                  onClick={() => switchLocale(l)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-on-surface transition-colors hover:bg-surface-container-high ${l === locale ? "font-semibold" : ""}`}
                >
                  <span>{t(l)}</span>
                  {l === locale ? <Icon name="check" className="text-[16px] text-primary" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}