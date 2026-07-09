"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toneColor, StatusPill } from "@/components/ui";
import AskCanary from "@/components/AskCanary";

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

// Range-based (non-zero) axis: pads around the data's own min/max so tight-range
// series (rates, vacancy, price indices) show real movement instead of a flat
// line pinned near a 0-based ceiling. Handles negative values too.
function niceScaleRange(min, max, maxTicks = 4) {
  if (!isFinite(min) || !isFinite(max)) return { lo: 0, hi: 1, ticks: [0, 1] };
  if (min === max) { const p = Math.abs(min) * 0.1 || 1; min -= p; max += p; }
  const pad = (max - min) * 0.12;
  let lo = min - pad, hi = max + pad;
  const rawStep = (hi - lo) / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 1.5 ? 1.5 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = niceNorm * mag;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step * 0.5; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

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

export function IndicatorTrend({ data, tone, periods, zeroBased = true }) {
  const color = toneColor(tone);
  const W = 480, H = 140, padL = 42, padR = 12, padT = 10, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const scale = zeroBased
    ? (() => { const { niceMax, ticks } = niceScaleZero(Math.max(...data), 4); return { lo: 0, hi: niceMax, ticks }; })()
    : niceScaleRange(Math.min(...data), Math.max(...data), 4);
  const { lo, hi, ticks } = scale;
  const labels = periods && periods.length === data.length ? periods : DEFAULT_PERIODS.slice(-data.length);
  const xAt = (i) => padL + (i / (data.length - 1)) * innerW;
  const yAt = (v) => padT + (1 - (v - lo) / (hi - lo)) * innerH;
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
      {labels.map((q, i) => {
        const step = Math.max(1, Math.ceil(labels.length / 7));
        return i % step === 0 || i === labels.length - 1 ? (
          <text key={i} x={xAt(i)} y={H - 9} textAnchor="middle" fontSize="9" fill="#AEB4BB" fontFamily="monospace">{q}</text>
        ) : null;
      })}
    </svg>
  );
}

// Which way is "good" for each indicator, so a direction read can say
// improving vs deteriorating rather than just up vs down. Rows may also set
// `goodUp` directly (submarket rows do); that takes precedence over this map.
const GOOD_UP = {
  "Wage Growth": true, "Job Growth": true, "Gross Domestic Product": true,
  "Real Consumer Spending": true, "Consumer Sentiment (UMich)": true,
  "Inflation": false, "Interest Rates": false, "Days On Market": false,
  "Multifamily Building Permits": false, "National Vacancy Rate": false,
  "Market Rent Growth (All Rentals)": true, "Market Rent Growth (Multifamily)": true,
  "Home Value Index": true, "Yield Curve Spread": true, "Initial Jobless Claims": false,
  "Leading Indicator (OECD)": true, "Cap Rate (National Avg)": false,
  "Absorption Rate (3-Mo)": true, "Debt Service Coverage": true,
  "Renter Demand Index (ZORDI)": true, "Wage Growth (Metro)": true,
  "Unemployment Rate (County)": false,
  "Net Renter Migration Index": true, "National Foreclosure Rate": false,
  "Renter-Age Employment (18-34)": true, "Renter Delinquency Rate": false,
  "CRE Loan Delinquency Rate": false,
  // submarket
  "Observed Rent (ZORI)": true, "Local Job Growth": true, "Real GDP (County)": true,
  "Unemployment Rate": false, "Apartment Vacancy": false, "Rental Days on Market": false,
  "Rent CPI": true, "Affluence Trend": true,
};

// Read the trajectory of a trend series (oldest->newest): recent third vs the
// prior third. Returns arrow + label + tone. When `goodUp` is known it reports
// improving/deteriorating (direction relative to what's good); otherwise it
// reports plain rising/falling. This is what lets a red, still-negative number
// read "improving" when it's climbing.
function trendRead(trend, goodUp) {
  if (!Array.isArray(trend) || trend.length < 4) return null;
  const n = trend.length;
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const t = Math.max(1, Math.floor(n / 3));
  const recent = mean(trend.slice(n - t));
  const earlier = mean(trend.slice(n - 2 * t, n - t));
  const delta = recent - earlier;
  const range = Math.max(...trend) - Math.min(...trend);
  const flat = range === 0 || Math.abs(delta) < 0.08 * range;
  const up = delta > 0;
  const arrow = flat ? "\u2192" : up ? "\u2197" : "\u2198";
  if (flat) return { arrow, label: goodUp == null ? "Flat" : "Holding steady", tone: "neutral" };
  if (goodUp == null) return { arrow, label: up ? "Rising" : "Falling", tone: "neutral" };
  const improving = up === goodUp;
  return { arrow, label: improving ? "Improving" : "Deteriorating", tone: improving ? "bull" : "bear" };
}

// Presentational indicator row used by both the national Indicators list and the
// submarket lookup. Self-manages its expanded state. The historical-trend panel
// only renders when a trend series is supplied (local signals may omit it).
export default function IndicatorRow({ row, ask }) {
  const [open, setOpen] = useState(false);
  const r = row;
  const hasTrend = Array.isArray(r.trend) && r.trend.length > 1;
  const hasDetail = r.measures || r.impact;
  const dir = hasTrend ? trendRead(r.trend, r.goodUp != null ? r.goodUp : GOOD_UP[r.name]) : null;

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
          {r.sub && <p className="mono mt-0.5 text-[10px] text-muted/70">{r.sub}</p>}
        </div>
        <div className="hidden md:block">
          <p className="mono flex items-center gap-1.5 text-sm" style={{ color: toneColor(r.tone) }}>
            {r.change}
            {dir && <span className="text-[13px]" style={{ color: toneColor(dir.tone) }} title={dir.label}>{dir.arrow}</span>}
          </p>
          <p className="mono mt-0.5 text-[11px] text-muted">{r.note}</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <StatusPill tone={r.tone} />
          <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (hasDetail || ask) && (
        <div className="border-t border-[var(--line)] px-6 py-7">
          {hasDetail && (
          <div className={`grid gap-8 ${hasTrend ? "lg:grid-cols-2" : ""}`}>
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
              <div className="flex items-center justify-between gap-2">
                <p className="mono text-[10px] tracking-[0.18em] text-muted">HISTORICAL TREND</p>
                {dir && (
                  <span
                    className="mono inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tracking-[0.08em]"
                    style={{ color: toneColor(dir.tone), borderColor: `${toneColor(dir.tone)}55` }}
                  >
                    <span className="text-[12px]">{dir.arrow}</span> {dir.label}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <IndicatorTrend data={r.trend} tone={r.tone} periods={r.periods} zeroBased={r.zeroBased !== false} />
              </div>
              <p className="mono mt-2 text-[10px] leading-relaxed text-muted">
                Direction reads the recent trajectory — a red level that is climbing back still reads
                <span style={{ color: "#5FB97C" }}> improving</span>.
              </p>
            </div>
          )}
          </div>
          )}
          {ask && (
            <div className={hasDetail ? "mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5" : "flex flex-wrap items-center justify-between gap-3"}>
              <span className="mono text-[10px] tracking-[0.16em] text-muted">GO DEEPER</span>
              <AskCanary variant="pill" question={ask} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
