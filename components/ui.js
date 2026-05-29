"use client";

export const TONE = {
  bull: "#5FB97C",
  bear: "#E5634D",
  neutral: "#E8B04B",
  signal: "#F5B544",
  ink: "#ECEDEF",
};

export function toneColor(t) {
  return TONE[t] || TONE.ink;
}

export function StatusPill({ tone }) {
  const label = tone === "bull" ? "BULL" : tone === "bear" ? "BEAR" : "NEUTRAL";
  const c = toneColor(tone);
  return (
    <span
      className="mono inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] tracking-[0.14em]"
      style={{ color: c, backgroundColor: `${c}1a`, border: `1px solid ${c}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {label}
    </span>
  );
}

// Simple SVG sparkline from a numeric series
export function Sparkline({ series, color = "#5FB97C", w = 120, h = 36 }) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = w / (series.length - 1);
  const pts = series
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * (h - 6) - 3).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
