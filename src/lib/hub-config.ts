import { z } from "zod";

export const TELEMETRY_INTERVALS = [15, 30, 60] as const;
export type SensorMetricName = "air_temperature" | "air_humidity" | "soil_moisture" | "substrate_ph" | "light_intensity";

/** One physical port on the ESP32 board and the peripheral wired to it. */
export type HubPin = {
  id: string;
  /** Silkscreen label, e.g. "A04". */
  port: string;
  /** Secondary label under the port, e.g. "GPIO 32". */
  channel: string;
  type: "i2c" | "analog" | "digital_out";
  name: string;
  description: string;
  /** Metrics whose latest reading is shown on the row. */
  metrics: SensorMetricName[];
  action: "calibrate_soil" | "calibrate_ph" | "test_valve" | null;
};

/** Persisted in `hubs.config`. Device facts (wifi, firmware, pins) are reported by the hub; the rest is user-editable. */
export type HubConfig = {
  chip: string;
  firmwareVersion: string;
  flash: string;
  bleReady: boolean;
  bootedAt: string;
  wifi: { ssid: string; rssiDbm: number; ip: string; mac: string };
  mqtt: { host: string; port: number; clientId: string; auth: "mtls" | "tls" | "none" };
  pins: HubPin[];
  cameraUrl: string;
  telemetryIntervalSec: (typeof TELEMETRY_INTERVALS)[number];
  lightSleepLowBattery: boolean;
  valveWatchdog: boolean;
};

export const DEFAULT_SETTINGS = {
  telemetryIntervalSec: 15,
  lightSleepLowBattery: true,
  valveWatchdog: true,
  mqtt: { host: "mqtt.actline.io", port: 8883 },
} as const;

/** The editable subset of {@link HubConfig}; the PATCH body of `/projects/{id}/hub`. */
export const hubSettingsSchema = z.object({
  telemetryIntervalSec: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  lightSleepLowBattery: z.boolean(),
  valveWatchdog: z.boolean(),
  mqtt: z.object({
    host: z.string().trim().min(1).max(253).regex(/^[A-Za-z0-9.-]+$/),
    port: z.number().int().min(1).max(65535),
  }),
  cameraUrl: z.string().trim().max(500).regex(/^rtsps?:\/\/\S+$/i),
});
export type HubSettingsInput = z.infer<typeof hubSettingsSchema>;

/** Credentials never leave the server: `rtsp://user:pass@host` is returned as `rtsp://user:***@host`. */
export const CREDENTIAL_MASK = "***";
export function maskCameraUrl(url: string) {
  return url.replace(/^(rtsps?:\/\/[^:/@]+):[^@/]*@/i, `$1:${CREDENTIAL_MASK}@`);
}
/** If the client sent back a masked URL, restore the stored password so a round-trip does not erase it. */
export function unmaskCameraUrl(incoming: string, stored: string) {
  if (!incoming.includes(`:${CREDENTIAL_MASK}@`)) return incoming;
  const password = /^rtsps?:\/\/[^:/@]+:([^@/]*)@/i.exec(stored)?.[1];
  return password == null ? incoming : incoming.replace(`:${CREDENTIAL_MASK}@`, `:${password}@`);
}

export type HubSettingsDto = {
  hub: { id: string; name: string; online: boolean; lastSeenAt: string | null };
  config: HubConfig;
  /** Latest reading per metric, for the pin rows. */
  readings: Partial<Record<SensorMetricName, number>>;
};

export type HubPingDto = { online: boolean; ageSeconds: number | null };
export type HubCommandDto = { id: string; kind: "valve_test"; status: "queued" };
