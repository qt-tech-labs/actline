/**
 * Every phase of a plan gets its own hue so the timeline reads as sections
 * instead of one long row of milestones. The palette is muted to sit with the
 * rest of the app; it cycles when a plan has more phases than colours.
 */
export const PHASE_COLORS = [
  "#2d5a46", // green (primary)
  "#994703", // amber (secondary)
  "#2d3b4e", // navy (tertiary)
  "#6b4b8f", // violet
  "#146b74", // teal
  "#8a3b52", // rose
] as const;

/** The colour of the phase at `index` in the plan. */
export function phaseColor(index: number): string {
  return PHASE_COLORS[index % PHASE_COLORS.length] ?? PHASE_COLORS[0];
}
