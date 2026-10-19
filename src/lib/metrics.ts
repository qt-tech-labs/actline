import type { SensorMetric } from "./types";

/** Display configuration per sensor; labels live in messages/*.json under `metrics.<key>`. */
export const METRIC_ORDER: SensorMetric[] = [
  "air_temperature",
  "air_humidity",
  "soil_moisture",
  "substrate_ph",
  "light_intensity",
];

export const METRIC_CONFIG: Record<
  SensorMetric,
  { icon: string; iconTone: "primary" | "secondary"; unit: string; decimals: number; scaleMax: number; stroke: string }
> = {
  air_temperature: { icon: "thermostat", iconTone: "primary", unit: "°C", decimals: 1, scaleMax: 40, stroke: "#134230" },
  air_humidity: { icon: "humidity_mid", iconTone: "primary", unit: "%", decimals: 0, scaleMax: 100, stroke: "#1b8a5a" },
  soil_moisture: { icon: "water_drop", iconTone: "primary", unit: "%", decimals: 0, scaleMax: 100, stroke: "#994703" },
  substrate_ph: { icon: "science", iconTone: "primary", unit: "pH", decimals: 1, scaleMax: 10, stroke: "#2d5a46" },
  light_intensity: { icon: "wb_sunny", iconTone: "secondary", unit: "Lux", decimals: 0, scaleMax: 50_000, stroke: "#994703" },
};
