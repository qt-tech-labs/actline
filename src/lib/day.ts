export const PROJECT_TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 86_400_000;

/** yyyy-mm-dd for `date` in the project timezone. */
export function isoDateInTz(date: Date, tz = PROJECT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

/** 1-based project day for `startDate`, clamped to [1, totalDays]. */
export function currentProjectDay(startDate: string, totalDays: number, now = new Date()): number {
  const diff = Math.round((Date.parse(isoDateInTz(now)) - Date.parse(startDate)) / DAY_MS);
  return Math.min(Math.max(diff + 1, 1), totalDays);
}

/** Calendar date (yyyy-mm-dd) of project day `day`. */
export function dateOfProjectDay(startDate: string, day: number): string {
  return new Date(Date.parse(startDate) + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
