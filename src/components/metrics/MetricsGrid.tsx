import { getFormatter, getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { METRIC_CONFIG } from "@/lib/metrics";
import type { MetricCard, SensorMetric } from "@/lib/types";
import { getCurrentUser } from "@/server/auth";
import { getHardware } from "@/server/services/hardware";
import { getMetricCards } from "@/server/services/metrics";
import { getProjectOverview } from "@/server/services/projects";
import { HubOfflineBanner } from "@/components/hub/HubOfflineBanner";
import { Sparkline } from "./Sparkline";

/** Sensors that hang off a probe: when the hub is gone they answer "no response" instead of "no signal". */
const PROBE_METRICS: SensorMetric[] = ["soil_moisture", "substrate_ph"];

export async function MetricsGrid({ projectId }: { projectId: string }) {
  const user = await getCurrentUser();
  const [t, format, cards, overview, hardware] = await Promise.all([
    getTranslations("metrics"),
    getFormatter(),
    getMetricCards(projectId),
    getProjectOverview(user.id, projectId),
    getHardware(projectId),
  ]);
  const hub = hardware.hub;
  const offline = !!hub && !hub.online;
  const latestReading = cards.map((c) => c.lastReadingAt).filter((at): at is string => !!at).sort().pop() ?? null;

  return (
    <section id="sensors" aria-label={t("label")} className="mx-auto w-full max-w-[1720px] px-4 pb-space-sm pt-space-lg md:px-space-xl">
      {offline ? (
        <HubOfflineBanner
          projectId={projectId}
          hubName={hub!.name}
          signalLost={hub!.lastSeenAt ? format.relativeTime(new Date(hub!.lastSeenAt)) : t("signalUnknown")}
          lastReading={latestReading ? format.dateTime(new Date(latestReading), { hour: "2-digit", minute: "2-digit", hour12: false }) : null}
        />
      ) : null}

      {cards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline-variant p-space-lg text-center text-body-sm text-on-surface-variant">{t("noData")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-space-sm md:grid-cols-3 xl:grid-cols-5">
          {cards.map((card, i) => (
            <MetricTile
              key={card.metric}
              card={card}
              lastDay={overview.currentDay}
              wide={i === cards.length - 1 && cards.length % 2 === 1}
              offline={offline}
            />
          ))}
        </div>
      )}
    </section>
  );
}

async function MetricTile({
  card,
  lastDay,
  wide,
  offline,
}: {
  card: MetricCard;
  lastDay: number;
  wide: boolean;
  offline: boolean;
}) {
  const [t, format] = await Promise.all([getTranslations("metrics"), getFormatter()]);
  const cfg = METRIC_CONFIG[card.metric];
  const warn = card.status !== "ok";
  const num = (v: number) => format.number(v, { minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals });
  const compact = card.metric === "light_intensity";
  const show = (v: number) => (compact ? `${Math.round(v / 1000)}k` : num(v));
  const inlineUnit = cfg.unit === "°C" || cfg.unit === "%";
  const name = t(card.metric);
  const statusText = t(`status.${card.status}`);
  const range = `${show(card.min)}-${show(card.max)}${inlineUnit ? cfg.unit : ""}`;

  if (offline) {
    const storedAt = card.lastReadingAt
      ? format.dateTime(new Date(card.lastReadingAt), { hour: "2-digit", minute: "2-digit", hour12: false })
      : null;
    return (
      <article
        title={t("offlineTooltip", { name, status: statusText, min: show(card.min), max: show(card.max) })}
        className={cn(
          "rounded-xl border bg-surface-container-lowest p-3 opacity-80 shadow-sm",
          warn ? "border-error/40" : "border-outline-variant/60",
          wide && "col-span-2 md:col-span-1",
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <h3 className="flex min-w-0 items-center gap-1 font-mono text-label-sm tracking-wider text-on-surface-variant">
            <Icon name={cfg.icon} className="text-[16px] text-outline" />
            <span className="truncate">{name}</span>
          </h3>
          <span className={cn("shrink-0 rounded px-1 font-mono text-[10px]", warn ? "bg-error-container text-on-error-container" : "bg-surface-container text-outline")}>
            {warn ? t("alertBadge") : t("offlineBadge")}
          </span>
        </div>

        <div className="my-1.5 flex items-baseline justify-between gap-2">
          <span className="font-mono text-headline-md font-bold text-outline">
            {t("offlineValue")}
            {inlineUnit ? cfg.unit : <span className="ml-1 text-[11px] font-normal text-outline">{cfg.unit}</span>}
          </span>
          <span className="font-mono text-[11px] text-outline">{t("lastValue", { value: `${show(card.value)}${inlineUnit ? cfg.unit : ""}` })}</span>
        </div>

        <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
          <span className="flex items-center gap-1 font-medium text-error">
            <span aria-hidden="true" className="size-1 rounded-full bg-error" />
            {PROBE_METRICS.includes(card.metric) ? t("noResponse") : t("noSignal")}
          </span>
          {storedAt ? <span className="text-outline">{t("storedAt", { time: storedAt })}</span> : null}
        </div>
      </article>
    );
  }

  return (
    <article
      title={t("tooltip", { name, status: statusText, min: show(card.min), max: show(card.max) })}
      className={cn(
        "rounded-xl border bg-surface-container-lowest p-3 shadow-sm transition-colors",
        warn ? "border-secondary/40" : "border-card-border hover:border-primary-container/40",
        wide && "col-span-2 md:col-span-1",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("flex items-center gap-1 font-mono text-label-sm tracking-wider", warn ? "font-semibold text-secondary" : "text-on-surface-variant")}>
          <Icon name={cfg.icon} className={cn("text-[16px]", warn || cfg.iconTone === "secondary" ? "text-secondary" : "text-primary")} />
          {name}
        </h3>
        <Icon
          name={warn ? "warning" : "check_circle"}
          className={cn("text-[16px]", warn ? "text-secondary" : "text-ok")}
        />
        <span className="sr-only">{statusText}</span>
      </div>

      <div className="my-1.5 flex items-baseline justify-between">
        <span className={cn("font-mono text-headline-md font-bold", warn ? "text-secondary" : "text-on-surface")}>
          {show(card.value)}
          {inlineUnit ? cfg.unit : <span className="ml-1 text-[11px] font-normal text-outline">{cfg.unit}</span>}
        </span>
        <span className={cn("font-mono text-[11px]", warn ? "font-medium text-secondary" : "text-outline")}>{warn ? statusText : range}</span>
      </div>

      <div className="mb-1.5 mt-1">
        <div className="h-8 w-full">
          <Sparkline values={card.series} band={{ min: card.min, max: card.max }} stroke={cfg.stroke} dot={warn ? "#994703" : "#1b8a5a"} id={card.metric} />
        </div>
        <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-outline">
          <span className="flex items-center gap-1">
            <span className="size-1 rounded-full" style={{ background: cfg.stroke }} />
            {t("period", { day: lastDay })}
          </span>
          <span className={cn("font-medium", warn ? "text-secondary" : "text-primary")}>{t("average", { value: `${show(card.avg)}${inlineUnit ? cfg.unit : ""}` })}</span>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
        <div
          className={cn("h-full rounded-full", warn ? "bg-secondary" : "bg-primary-container")}
          style={{ width: `${Math.min(100, Math.max(0, (card.value / cfg.scaleMax) * 100))}%` }}
        />
      </div>
    </article>
  );
}
