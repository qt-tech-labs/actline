import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const ITEMS = [
  { key: "today", icon: "task_alt", href: "/", active: true },
  { key: "camera", icon: "videocam", href: "#live-cam", iot: true },
  { key: "sensors", icon: "sensors", href: "#sensors", iot: true },
  { key: "supplies", icon: "inventory_2" },
  { key: "more", icon: "more_horiz" },
] as const;

export async function MobileNav({ iot }: { iot: boolean }) {
  const t = await getTranslations("mobileNav");
  return (
    <nav aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-surface-variant bg-surface/95 px-space-md py-2 backdrop-blur-md md:hidden">
      {ITEMS.filter((item) => iot || !("iot" in item)).map((item) => {
        const href = "href" in item ? item.href : undefined;
        const active = "active" in item;
        const body = (
          <>
            <Icon name={item.icon} fill={active} className="text-[22px]" />
            <span className={cn("font-mono text-[10px]", active && "font-semibold")}>{t(item.key)}</span>
          </>
        );
        const cls = cn("flex flex-col items-center gap-0.5", active ? "text-primary" : "text-on-surface-variant");
        return href ? (
          <a key={item.key} href={href} aria-current={active ? "page" : undefined} className={cls}>{body}</a>
        ) : (
          <span key={item.key} aria-disabled="true" className={cn(cls, "opacity-60")}>{body}</span>
        );
      })}
    </nav>
  );
}
