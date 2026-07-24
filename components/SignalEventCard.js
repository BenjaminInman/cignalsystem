"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

const LEAD = "#5FA8D9", MUT = "#797E85";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMonth(m) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${MON[+mo - 1]} '${y.slice(2)}`;
}

// Trendline sparkline. Plots the indicator's trailing z-score history against a
// zero baseline -- zero IS the indicator's own 12-month trend, so the gap
// between the line and the baseline is the divergence itself, not a raw-value
// wiggle. The line crosses the baseline at the moment the signal flipped, which
// is the event the card describes. Filled area between line and baseline makes
// the size of the divergence read at a glance.
function Trendline({ spark, color }) {
  const pts = (spark || []).filter((v) => v != null);
  if (pts.length < 2) return null;

  const W = 260, H = 56, PAD = 4;
  const lo = Math.min(...pts, 0), hi = Math.max(...pts, 0);
  const span = hi - lo || 1;
  const x = (i) => PAD + (i * (W - 2 * PAD)) / (pts.length - 1);
  const y = (v) => PAD + ((hi - v) * (H - 2 * PAD)) / span;
  const zeroY = y(0);

  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area =
    `M${x(0).toFixed(1)},${zeroY.toFixed(1)} ` +
    pts.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") +
    ` L${x(pts.length - 1).toFixed(1)},${zeroY.toFixed(1)} Z`;

  const gid = `sig-${color.replace("#", "")}`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" preserveAspectRatio="none" style={{ height: 56 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* trend baseline (zero = on its own trend) */}
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke={MUT} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(pts.length - 1)} cy={y(last)} r="3" fill={color} />
    </svg>
  );
}

// Renders a single "what just changed" event from /api/signals-intel — the same
// feed the Signals page runs on, so the home preview stays true to the page.
export default function SignalEventCard({ e }) {
  const bull = e.tone === "bull";
  const c = bull ? "#5FB97C" : "#E5634D";
  const Icon = bull ? TrendingUp : TrendingDown;
  const label = bull ? "BULLISH" : "BEARISH";
  const leading = e.class === "leading";
  const layer = leading ? "LEADING" : "LAGGING";
  const layerC = leading ? LEAD : MUT;

  return (
    <div className="card p-6 transition-colors hover:border-[var(--line-strong)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: `${c}1a` }}>
          <Icon size={15} style={{ color: c }} strokeWidth={2} />
        </span>
        <span
          className="mono inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] tracking-[0.14em]"
          style={{ color: c, backgroundColor: `${c}1a`, border: `1px solid ${c}40` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
          {label}
        </span>
        <span
          className="mono rounded-sm px-2 py-1 text-[10px] tracking-[0.14em]"
          style={{ color: layerC, border: `1px solid ${layerC}40` }}
        >
          {layer}
        </span>
        {e.mf && (
          <span className="mono rounded-sm px-2 py-1 text-[10px] tracking-[0.14em] text-signal" style={{ border: "1px solid var(--signal)" }}>
            MF
          </span>
        )}
      </div>
      <h3 className="text-[16px] font-semibold leading-snug text-ink">{e.text}</h3>
      <Trendline spark={e.spark} color={c} />
      <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <span className="mono text-[11px] text-muted">{e.name}</span>
        <span className="mono text-[11px] text-muted">{fmtMonth(e.month)}</span>
      </div>
    </div>
  );
}
