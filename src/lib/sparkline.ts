/** Build smooth SVG area/line paths for a sparkline in a `w` x `h` viewBox. */
export function sparklinePaths(
  values: number[],
  band?: { min: number; max: number },
  w = 160,
  h = 32,
  pad = 4,
) {
  if (values.length < 2) return { line: "", area: "", last: { x: w, y: h / 2 }, band: null };
  let lo = band ? band.min : Infinity;
  let hi = band ? band.max : -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  const yOf = (v: number) => pad + (1 - (v - lo) / span) * (h - pad * 2);
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * w, y: yOf(v) }));
  const f = (n: number) => n.toFixed(1);
  let line = `M${f(pts[0]!.x)},${f(pts[0]!.y)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]!;
    const p1 = pts[i]!;
    const mx = (p0.x + p1.x) / 2;
    line += ` C${f(mx)},${f(p0.y)} ${f(mx)},${f(p1.y)} ${f(p1.x)},${f(p1.y)}`;
  }
  return {
    line,
    area: `${line} L${w},${h} L0,${h} Z`,
    last: pts[pts.length - 1]!,
    band: band ? { y: yOf(band.max), height: yOf(band.min) - yOf(band.max) } : null,
  };
}
