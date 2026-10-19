import { sparklinePaths } from "@/lib/sparkline";

export function Sparkline({
  values,
  band,
  stroke,
  dot,
  id,
}: {
  values: number[];
  band: { min: number; max: number };
  stroke: string;
  dot: string;
  id: string;
}) {
  const { line, area, last, band: b } = sparklinePaths(values, band);
  const gradient = `spark-${id}`;
  return (
    <svg aria-hidden="true" viewBox="0 0 160 32" preserveAspectRatio="none" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {b ? <rect x="0" y={b.y.toFixed(1)} width="160" height={Math.max(b.height, 0).toFixed(1)} rx="2" fill={stroke} fillOpacity="0.06" /> : null}
      <path d={area} fill={`url(#${gradient})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="2.5" fill={dot} stroke="#fff" strokeWidth="1" />
    </svg>
  );
}
