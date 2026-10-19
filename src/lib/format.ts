/** Render `**bold**` segments as alternating plain/bold parts. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split("**")
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((p) => p.text.length > 0);
}

/** Compact VND, e.g. 1_200_000 -> "1.2M", 845_000 -> "845k". */
export function compactVnd(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** "HH:mm:ss" from Postgres `time` -> "HH:mm". */
export function hhmm(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}
