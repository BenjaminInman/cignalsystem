"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toneColor, StatusPill } from "@/components/ui";

const DEFAULT_PERIODS = ["Q2 '24", "Q3 '24", "Q4 '24", "Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26", "Q2 '26"];

// 0-based axis with headroom above the peak (gives e.g. 0/150/300/450/600 for permits)
function niceScaleZero(max, maxTicks = 4) {
  const padded = max * 1.2;
  const rawStep = padded / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 1.5 ? 1.5 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = niceNorm * mag;
  const niceMax = Math.ceil(padded / step) * step;
  const ticks = [];
  for (let v = 0; v <= niceMax + step * 0.5; v += step) ticks.push(+v.toFixed(6));
  return { niceMax, ticks };
}

const fmtTick = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function IndicatorTrend({ data, tone, periods }) {
  const color = toneColor(tone);
  const W = 480, H = 140, padL = 42, padR = 12, padT = 10, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const { niceMax, ticks } = niceScaleZero(Math.max(...data), 4);
  const labels = periods && periods.length === data.length ? periods : DEFAULT_PERIODS.slice(-data.length);
  const xAt = (i) => padL + (i / (data.length - 1)) * innerW;
  const yAt = (v) => padT + (1 - v / niceMax) * innerH;
  const pts = data.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const linePath = smooth(pts);
  const areaPath = `${linePath} L ${xAt(data.length - 1).toFixed(1)},${H - padB} L ${padL},${H - padB} Z`;
  const gid = `grad-${tone}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
          <text x={padL - 8} y={yAt(v) + 3} textAnchor="end" fontSize="10" fill="#AEB4BB" fontFamily="monospace">{fmtTick(v)}</text>
        </g>
      ))}
      <path className="trend-fade" d={areaPath} fill={`url(#${gid})`} />
      <path className="draw-line" d={linePath} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((q, i) =>
        i % 2 === 0 || i === labels.length - 1 ? (
          <text key={i} x={xAt(i)} y={H - 9} textAnchor="middle" fontSize="9" fill="#AEB4BB" fontFamily="monospace">{q}</text>
        ) : null
      )}
    </svg>
  );
}

// Presentational indicator row used by both the national Indicators list and the
// submarket lookup. Self-manages its expanded state. The historical-trend panel
// only renders when a trend series is supplied (local signals may omit it).
export default function IndicatorRow({ row }) {
  const [open, setOpen] = useState(false);
  const r = row;
  const hasTrend = Array.isArray(r.trend) && r.trend.length > 1;
  const hasDetail = r.measures || r.impact;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-2 items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02] md:grid-cols-[1.4fr_1fr_1.2fr_auto]"
      >
        <div>
          <p className="mono text-[10px] tracking-[0.18em] text-muted">{r.cat} · {r.type}</p>
          <p className="mt-1 font-semibold text-ink">{r.name}</p>
        </div>
        <div>
          <p className="headline text-2xl text-ink">{r.value}</p>
          <p className="mono text-[11px] text-muted">{r.unit}</p>
        </div>
        <div className="hidden md:block">
          <p className="mono text-sm" style={{ color: toneColor(r.tone) }}>{r.change}</p>
          <p className="mono mt-0.5 text-[11px] text-muted">{r.note}</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <StatusPill tone={r.tone} />
          <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && hasDetail && (
        <div className={`grid gap-8 border-t border-[var(--line)] px-6 py-7 ${hasTrend ? "lg:grid-cols-2" : ""}`}>
          <div>
            <p className="mono text-[10px] tracking-[0.18em] text-muted">WHAT THIS MEASURES</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{r.measures}</p>
            {r.impact && (
              <div className="mt-5 rounded-lg border border-[var(--line)] bg-bg/40 p-4">
                <p className="mono text-[11px] tracking-[0.16em]" style={{ color: "#38BDF8" }}>INVESTMENT IMPACT</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/90">{r.impact}</p>
              </div>
            )}
          </div>
          {hasTrend && (
            <div>
              <p className="mono text-[10px] tracking-[0.18em] text-muted">HISTORICAL TREND</p>
              <div className="mt-2">
                <IndicatorTrend data={r.trend} tone={r.tone} periods={r.periods} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
