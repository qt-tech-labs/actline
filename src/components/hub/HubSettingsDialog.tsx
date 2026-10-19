"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import {
  DEFAULT_SETTINGS,
  TELEMETRY_INTERVALS,
  type HubCommandDto,
  type HubPin,
  type HubPingDto,
  type HubSettingsDto,
  type HubSettingsInput,
  type SensorMetricName,
} from "@/lib/hub-config";

const UNIT: Record<SensorMetricName, string> = {
  air_temperature: "°C",
  air_humidity: "%",
  soil_moisture: "%",
  substrate_ph: " pH",
  light_intensity: " lux",
};

const RTSP = /^rtsps?:\/\/\S+$/i;

const toInput = (c: HubSettingsDto["config"]): HubSettingsInput => ({
  telemetryIntervalSec: c.telemetryIntervalSec,
  lightSleepLowBattery: c.lightSleepLowBattery,
  valveWatchdog: c.valveWatchdog,
  mqtt: { host: c.mqtt.host, port: c.mqtt.port },
  cameraUrl: c.cameraUrl,
});

/** The Dialog only mounts its children while open, so the form below starts fresh (and reloads) on every open. */
export function HubSettingsDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const t = useTranslations("hubSettings");
  return (
    <Dialog open={open} onClose={onClose} title={t("title")} wide>
      <HubSettingsForm projectId={projectId} onClose={onClose} />
    </Dialog>
  );
}

function HubSettingsForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const base = `/projects/${projectId}/hub`;
  const t = useTranslations("hubSettings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [data, setData] = useState<HubSettingsDto | null>(null);
  const [draft, setDraft] = useState<HubSettingsInput | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState<"save" | "ping" | "valve" | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    api<HubSettingsDto>(base).then(
      (d) => {
        if (cancelled) return;
        setData(d);
        setDraft(toInput(d.config));
      },
      () => !cancelled && setLoadError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [base]);

  const patch = (p: Partial<HubSettingsInput>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const urlValid = draft ? RTSP.test(draft.cameraUrl) : true;
  const portValid = draft ? Number.isInteger(draft.mqtt.port) && draft.mqtt.port >= 1 && draft.mqtt.port <= 65535 : true;
  const hostValid = draft ? /^[A-Za-z0-9.-]+$/.test(draft.mqtt.host) : true;
  const canSave = !!draft && urlValid && portValid && hostValid && busy === null;

  const run = async (kind: "save" | "ping" | "valve", job: () => Promise<void>) => {
    setBusy(kind);
    setMessage(null);
    try {
      await job();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : tc("genericError"), ok: false });
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    draft &&
    run("save", async () => {
      await api(base, { method: "PATCH", body: draft });
      startTransition(() => router.refresh());
      onClose();
    });

  const ping = () =>
    run("ping", async () => {
      const r = await api<HubPingDto>(`${base}/ping`, { method: "POST" });
      setMessage(r.online ? { text: t("actions.pingOk", { sec: r.ageSeconds ?? 0 }), ok: true } : { text: t("actions.pingFail"), ok: false });
    });

  const testValve = () =>
    run("valve", async () => {
      await api<HubCommandDto>(`${base}/commands`, { method: "POST", body: { kind: "valve_test" } });
      setMessage({ text: t("pins.valveQueued"), ok: true });
    });

  return (
    <>
      {loadError ? (
        <p role="alert" className="text-body-sm text-error">{t("loadError")}</p>
      ) : !data || !draft ? (
        <p className="text-body-sm text-on-surface-variant">{t("loading")}</p>
      ) : (
        <div className="space-y-space-md">
          <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] font-bold", data.hub.online ? "bg-primary-fixed text-on-primary-fixed" : "bg-error-container text-on-error-container")}>
              {data.hub.online ? t("online") : t("offline")}
            </span>
            {t("subtitle")}
          </p>

          <NetworkSection data={data} draft={draft} patch={patch} hostValid={hostValid} portValid={portValid} />

          <section className="rounded-xl border border-surface-variant bg-surface-container-low p-space-md">
            <div className="mb-space-sm flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-title-sm text-on-surface">
                  <Icon name="pin" className="text-[18px] text-primary" />
                  {t("pins.title")}
                </h3>
                <p className="text-caption text-on-surface-variant">{t("pins.hint")}</p>
              </div>
              <span className="shrink-0 rounded bg-primary-fixed px-2 py-0.5 font-mono text-[10px] font-bold text-on-primary-fixed">
                {t("pins.count", { count: data.config.pins.length })}
              </span>
            </div>
            <ul className="space-y-2">
              {data.config.pins.map((pin) => (
                <PinRow key={pin.id} pin={pin} readings={data.readings} onTestValve={testValve} valveBusy={busy === "valve"} />
              ))}
            </ul>
            <CameraRow url={draft.cameraUrl} valid={urlValid} onChange={(cameraUrl) => patch({ cameraUrl })} />
          </section>

          <FirmwareSection draft={draft} patch={patch} valvePin={data.config.pins.find((p) => p.action === "test_valve")?.port ?? ""} />

          {message ? (
            <p role={message.ok ? "status" : "alert"} className={cn("text-body-sm", message.ok ? "text-primary" : "text-error")}>
              {message.text}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-variant pt-space-md">
            <div className="flex items-center gap-3">
              <button type="button" onClick={ping} disabled={busy !== null} className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-60">
                <Icon name="network_ping" className="text-[17px] text-primary" />
                {busy === "ping" ? t("actions.pinging") : t("actions.ping", { ip: data.config.wifi.ip })}
              </button>
              <button
                type="button"
                onClick={() => patch({ ...DEFAULT_SETTINGS, mqtt: { ...DEFAULT_SETTINGS.mqtt } })}
                className="text-body-sm text-outline hover:text-on-surface"
              >
                {t("actions.reset")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm font-semibold hover:bg-surface-container">
                {t("actions.cancel")}
              </button>
              <button type="button" onClick={save} disabled={!canSave} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-body-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60">
                <Icon name="save" className="text-[17px]" />
                {busy === "save" ? t("actions.saving") : t("actions.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NetworkSection({
  data,
  draft,
  patch,
  hostValid,
  portValid,
}: {
  data: HubSettingsDto;
  draft: HubSettingsInput;
  patch: (p: Partial<HubSettingsInput>) => void;
  hostValid: boolean;
  portValid: boolean;
}) {
  const t = useTranslations("hubSettings.network");
  const tm = useTranslations("hubSettings");
  const [editing, setEditing] = useState(false);
  const { config, hub } = data;
  const quality = config.wifi.rssiDbm >= -60 ? t("good") : config.wifi.rssiDbm >= -75 ? t("fair") : t("poor");
  const [now] = useState(() => Date.now());
  const upMin = Math.max(0, Math.floor((now - new Date(config.bootedAt).getTime()) / 60_000));

  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-low p-space-md">
      <div className="mb-space-sm flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-title-sm text-on-surface">
          <span aria-hidden="true" className={cn("size-2 rounded-full", hub.online ? "glow-ok bg-ok" : "bg-error")} />
          <Icon name="router" className="text-[18px] text-primary" />
          {t("title")}
        </h3>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-outline">
          FW {config.firmwareVersion}
          <span className="rounded bg-primary-fixed px-1.5 py-0.5 font-bold text-on-primary-fixed">{config.chip}</span>
        </span>
      </div>

      <div className="grid gap-space-sm md:grid-cols-2">
        <div className="rounded-lg border border-surface-variant bg-surface-container-lowest p-space-sm">
          <div className="mb-1 flex items-center justify-between font-mono text-label-sm uppercase text-on-surface-variant">
            <span className="flex items-center gap-1"><Icon name="wifi" className="text-[16px] text-primary" />{t("wifi")}</span>
            <button type="button" aria-disabled="true" title={tm("comingSoon")} className="flex cursor-not-allowed items-center gap-1 normal-case text-on-surface-variant">
              <Icon name="autorenew" className="text-[15px]" />{t("rescan")}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-on-surface">{config.wifi.ssid}</span>
            <span className="rounded bg-primary-fixed px-1.5 font-mono text-[11px] font-bold text-on-primary-fixed">{t("signal", { dbm: config.wifi.rssiDbm, quality })}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-[11px] text-on-surface-variant">
            <span>{t("ip")}: <strong className="text-on-surface">{config.wifi.ip}</strong></span>
            <span>{t("mac")}: <strong className="text-on-surface">{config.wifi.mac}</strong></span>
          </div>
        </div>

        <div className="rounded-lg border border-surface-variant bg-surface-container-lowest p-space-sm">
          <div className="mb-1 flex items-center justify-between font-mono text-label-sm uppercase text-on-surface-variant">
            <span className="flex items-center gap-1"><Icon name="cloud_sync" className="text-[16px] text-primary" />{t("broker")}</span>
            <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="flex items-center gap-1 normal-case text-on-surface hover:text-primary">
              <Icon name="tune" className="text-[15px]" />{t("editBroker")}
            </button>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <label className="flex-1 text-[11px] text-on-surface-variant">
                {t("brokerHost")}
                <input value={draft.mqtt.host} onChange={(e) => patch({ mqtt: { ...draft.mqtt, host: e.target.value } })} aria-invalid={!hostValid} className="mt-0.5 w-full rounded border border-outline-variant bg-surface px-2 py-1 font-mono text-body-sm text-on-surface aria-[invalid=true]:border-error" />
              </label>
              <label className="w-24 text-[11px] text-on-surface-variant">
                {t("brokerPort")}
                <input type="number" min={1} max={65535} value={draft.mqtt.port} onChange={(e) => patch({ mqtt: { ...draft.mqtt, port: Number(e.target.value) } })} aria-invalid={!portValid} className="mt-0.5 w-full rounded border border-outline-variant bg-surface px-2 py-1 font-mono text-body-sm text-on-surface aria-[invalid=true]:border-error" />
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-on-surface">{draft.mqtt.host}:{draft.mqtt.port}</span>
              <span className="rounded bg-secondary-fixed px-1.5 font-mono text-[11px] font-bold text-on-secondary-fixed">{t(`auth.${config.mqtt.auth}`)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between font-mono text-[11px] text-on-surface-variant">
            <span>{t("clientId")}: <strong className="text-on-surface">{config.mqtt.clientId}</strong></span>
            <span className={cn("flex items-center gap-1 font-bold", hub.online ? "text-ok" : "text-error")}>
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", hub.online ? "bg-ok" : "bg-error")} />
              {hub.online ? t("connected") : t("disconnected")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-space-sm flex flex-wrap items-center justify-between gap-2 border-t border-surface-variant pt-space-sm font-mono text-label-sm text-on-surface-variant">
        <span className="flex items-center gap-2">
          {config.bleReady ? <span className="flex items-center gap-1 font-bold text-primary"><Icon name="bluetooth" className="text-[16px]" />{t("ble")}</span> : null}
          <span>•</span>
          <span>{t("flash", { flash: config.flash })}</span>
        </span>
        <span>
          {t("uptime")}{" "}
          <strong className="text-on-surface">
            {t("uptimeValue", { days: Math.floor(upMin / 1440), hours: Math.floor((upMin % 1440) / 60), minutes: upMin % 60 })}
          </strong>
        </span>
      </div>
    </section>
  );
}

function PinRow({
  pin,
  readings,
  onTestValve,
  valveBusy,
}: {
  pin: HubPin;
  readings: HubSettingsDto["readings"];
  onTestValve: () => void;
  valveBusy: boolean;
}) {
  const t = useTranslations("hubSettings.pins");
  const tm = useTranslations("hubSettings");
  const values = pin.metrics.map((m) => readings[m]);
  const live =
    pin.action === "test_valve"
      ? t("valveIdle")
      : values.some((v) => v == null)
        ? t("noReading")
        : pin.metrics.map((m, i) => `${values[i]}${UNIT[m]}`).join(" | ");
  const accent = pin.type === "i2c" ? "bg-primary text-on-primary" : pin.type === "digital_out" ? "bg-secondary text-on-secondary" : "bg-secondary-container text-on-secondary-container";
  const disabled = "flex cursor-not-allowed items-center gap-1 rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-body-sm text-on-surface-variant";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-variant bg-surface-container-lowest p-space-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={cn("shrink-0 rounded-lg px-2 py-1.5 text-center font-mono text-label-md font-bold", accent)}>
          Pin {pin.port}
          <div className="text-[10px] font-medium opacity-80">{pin.channel}</div>
        </div>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-body-sm font-semibold text-on-surface">
            {pin.name}
            <span className="rounded bg-surface-container px-1.5 font-mono text-[10px] font-medium text-outline">{t(`type.${pin.type}`)}</span>
          </p>
          <p className="text-caption text-on-surface-variant">{pin.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded border border-surface-variant px-2 py-1 font-mono text-label-md font-bold text-primary">{live}</span>
        {pin.action === "calibrate_soil" || pin.action === "calibrate_ph" ? (
          <button type="button" aria-disabled="true" title={tm("comingSoon")} className={disabled}>
            <Icon name={pin.action === "calibrate_soil" ? "build" : "colorize"} className="text-[16px]" />
            {pin.action === "calibrate_soil" ? t("calibrateSoil") : t("calibratePh")}
          </button>
        ) : null}
        {pin.action === "test_valve" ? (
          <button type="button" onClick={onTestValve} disabled={valveBusy} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-body-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60">
            <Icon name="play_arrow" className="text-[16px]" />{t("testValve")}
          </button>
        ) : (
          <button type="button" aria-disabled="true" title={tm("comingSoon")} className={disabled}>
            <Icon name="tune" className="text-[16px]" />{t("configure")}
          </button>
        )}
      </div>
    </li>
  );
}

function CameraRow({ url, valid, onChange }: { url: string; valid: boolean; onChange: (url: string) => void }) {
  const t = useTranslations("hubSettings.camera");
  const tm = useTranslations("hubSettings");
  const [editing, setEditing] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-surface-variant bg-surface-container-lowest p-space-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-surface-variant"><Icon name="videocam" className="text-primary" /></span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-body-sm font-semibold text-on-surface">
              {t("title")}
              <span className="rounded bg-primary-fixed px-1.5 font-mono text-[10px] font-bold text-on-primary-fixed">{t("type")}</span>
            </p>
            {!editing ? <p className="truncate font-mono text-[11px] text-on-surface-variant">{url}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-disabled="true" title={tm("comingSoon")} className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-body-sm text-on-surface-variant">
            <Icon name="visibility" className="text-[16px]" />{t("test")}
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-body-sm text-on-surface hover:bg-surface-container">
            <Icon name="tune" className="text-[16px]" />{t("editUrl")}
          </button>
        </div>
      </div>
      {editing ? (
        <label className="mt-2 block text-[11px] text-on-surface-variant">
          {t("url")}
          <input value={url} onChange={(e) => onChange(e.target.value)} aria-invalid={!valid} className="mt-0.5 w-full rounded border border-outline-variant bg-surface px-2 py-1 font-mono text-body-sm text-on-surface aria-[invalid=true]:border-error" />
          {!valid ? <span role="alert" className="text-error">{t("invalidUrl")}</span> : null}
        </label>
      ) : null}
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "bg-primary-container" : "bg-surface-variant")}>
      <span className={cn("size-3.5 rounded-full bg-surface-container-lowest shadow-sm transition-transform", checked && "translate-x-3.5")} />
    </button>
  );
}

function FirmwareSection({ draft, patch, valvePin }: { draft: HubSettingsInput; patch: (p: Partial<HubSettingsInput>) => void; valvePin: string }) {
  const t = useTranslations("hubSettings.firmware");
  const row = "flex items-center justify-between gap-3 rounded-lg border border-surface-variant bg-surface-container-lowest p-space-sm";
  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-low p-space-md">
      <h3 className="mb-space-sm flex items-center gap-1.5 text-title-sm text-on-surface">
        <Icon name="tune" className="text-[18px] text-primary" />
        {t("title")}
      </h3>
      <div className="space-y-2">
        <div className={row}>
          <div>
            <p className="text-body-sm font-semibold text-on-surface">{t("telemetry")}</p>
            <p className="text-caption text-on-surface-variant">{t("telemetryHint")}</p>
          </div>
          <select aria-label={t("telemetry")} value={draft.telemetryIntervalSec} onChange={(e) => patch({ telemetryIntervalSec: Number(e.target.value) as HubSettingsInput["telemetryIntervalSec"] })} className="rounded border border-outline-variant bg-surface px-2 py-1 font-mono text-body-sm">
            {TELEMETRY_INTERVALS.map((s) => (
              <option key={s} value={s}>{t("interval", { sec: s })}</option>
            ))}
          </select>
        </div>
        <div className={row}>
          <div>
            <p className="text-body-sm font-semibold text-on-surface">{t("sleep")}</p>
            <p className="text-caption text-on-surface-variant">{t("sleepHint")}</p>
          </div>
          <Toggle checked={draft.lightSleepLowBattery} label={t("sleep")} onChange={(v) => patch({ lightSleepLowBattery: v })} />
        </div>
        <div className={row}>
          <div>
            <p className="flex items-center gap-2 text-body-sm font-semibold text-on-surface">
              {t("watchdog")}
              <span className="rounded bg-primary-fixed px-1.5 font-mono text-[10px] font-bold text-on-primary-fixed">{t("watchdogBadge")}</span>
            </p>
            <p className="text-caption text-on-surface-variant">{t("watchdogHint", { pin: valvePin })}</p>
          </div>
          <Toggle checked={draft.valveWatchdog} label={t("watchdog")} onChange={(v) => patch({ valveWatchdog: v })} />
        </div>
      </div>
    </section>
  );
}
