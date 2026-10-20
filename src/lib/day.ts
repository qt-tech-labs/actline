export const PROJECT_TZ = "Asia/Ho_Chi_Minh";
/** Cookie holding the timezone of the device the user browses from. */
export const TZ_COOKIE = "actline_tz";
const DAY_MS = 86_400_000;

/** yyyy-mm-dd for `date` in the given timezone. */
export function isoDateInTz(date: Date, tz = PROJECT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

/**
 * 1-based project day for `startDate`, clamped to [1, totalDays].
 * The day follows the timezone of whoever is looking: the calendar date of
 * that day is the one the device shows.
 */
export function currentProjectDay(startDate: string, totalDays: number, now = new Date(), tz = PROJECT_TZ): number {
  const diff = Math.round((Date.parse(isoDateInTz(now, tz)) - Date.parse(startDate)) / DAY_MS);
  return Math.min(Math.max(diff + 1, 1), totalDays);
}

/** Calendar date (yyyy-mm-dd) of project day `day`. */
export function dateOfProjectDay(startDate: string, day: number): string {
  return new Date(Date.parse(startDate) + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** "dd/MM" for a yyyy-mm-dd date, without any timezone shifting. */
export function dayMonthLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}`;
}

/** The day to show: the requested one, clamped to the project. */
export function clampProjectDay(day: number | undefined, totalDays: number, fallback: number): number {
  if (day === undefined || !Number.isFinite(day)) return fallback;
  return Math.min(Math.max(Math.round(day), 1), totalDays);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
