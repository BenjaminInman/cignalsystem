"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { toneColor } from "@/components/ui";
import { useContent, useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";

const SCENARIOS = ["Base Case", "Bull Case", "Bear Case"];
const DEFAULT_METRICS = ["Rent Growth", "Vacancy", "Cap Rate", "NOI Growth"];
const YEARS = [2025, 2026, 2027, 2028, 2029];

// Per-indicator, per-scenario 5-year sample projections (matches the multifamily
// metric set). unit + mean drive the axis reference line and the hover readout.
const FORECAST_SERIES = {
  "Rent Growth": {
    unit: "%", mean: 3.5,
    "Base Case": [3.8, 4.2, 4.5, 4.3, 4.1],
    "Bull Case": [3.8, 4.8, 5.6, 5.9, 6.1],
    "Bear Case": [3.8, 3.1, 2.4, 2.1, 2.3],
  },
  Vacancy: {
    unit: "%", mean: 6.5,
    "Base Case": [6.8, 6.5, 6.2, 6.0, 5.9],
    "Bull Case": [6.8, 6.2, 5.5, 5.1, 4.8],
    "Bear Case": [6.8, 7.4, 8.1, 8.4, 8.2],
  },
  "Cap Rate": {
    unit: "%", mean: 5.4,
    "Base Case": [5.4, 5.5, 5.5, 5.4, 5.3],
    "Bull Case": [5.4, 5.3, 5.1, 5.0, 4.9],
    "Bear Case": [5.4, 5.8, 6.3, 6.5, 6.4],
  },
  "NOI Growth": {
    unit: "%", mean: 3.4,
    "Base Case": [3.2, 3.8, 4.1, 4.0, 3.9],
    "Bull Case": [3.2, 4.5, 5.4, 5.8, 6.0],
    "Bear Case": [3.2, 2.1, 1.2, 0.9, 1.4],
  },
};

function seriesFor(metric, scenario) {
  const m = FORECAST_SERIES[metric] || Object.values(FORECAST_SERIES)[0];
  return { data: m[scenario] || m["Base Case"], unit: m.unit, mean: m.mean };
}

function LineChart({ data, unit, mean, metric, scenario }) {
  const [hi, setHi] = useState(null);
  const w = 1100, h = 320, pad = 40;
  const max = 8, min = 0;
  const stepX = (w - pad * 2) / (data.length - 1);
  const y = (v) => pad + ((max - v) / (max - min)) * (h - pad * 2);
  const xOf = (i) => pad + i * stepX;
  const pts = data.map((v, i) => `${xOf(i)},${y(v)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${xOf(data.length - 1)},${h - pad}`;

  // tooltip geometry (clamped within the viewBox)
  const tipW = 200, tipH = 96;
  const tipX = hi == null ? 0 : Math.min(Math.max(xOf(hi) - tipW / 2, 6), w - tipW - 6);
  const tipY = hi == null ? 0 : Math.max(y(data[hi]) - tipH - 16, 6);
  const yoy = hi != null && hi > 0 ? data[hi] - data[hi - 1] : null;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" onMouseLeave={() => setHi(null)}>
      {[2, 4, 6, 8].map((g) => (
        <g key={g}>
          <line x1={pad} y1={y(g)} x2={w - pad} y2={y(g)} stroke="rgba(255,255,255,0.05)" />
          <text x={pad - 10} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#797e85" fontFamily="IBM Plex Mono">{g}</text>
        </g>
      ))}
      {/* historical mean reference */}
      <polyline points={`${pad},${y(mean)} ${w - pad},${y(mean)}`} stroke="#797e85" strokeWidth="1" strokeDasharray="5 5" fill="none" />
      <polygon points={area} fill="#F5B544" opacity="0.08" />
      <polyline points={pts} fill="none" stroke="#F5B544" strokeWidth="2.4" strokeLinecap="round" />

      {/* hover guide */}
      {hi != null && (
        <line x1={xOf(hi)} y1={pad} x2={xOf(hi)} y2={h - pad} stroke="#F5B544" strokeOpacity="0.25" strokeWidth="1" />
      )}

      {/* year bullets + hit targets */}
      {data.map((v, i) => (
        <g key={i} onMouseEnter={() => setHi(i)} onClick={() => setHi(i)} style={{ cursor: "pointer" }}>
          <circle cx={xOf(i)} cy={y(v)} r="16" fill="transparent" />
          <circle cx={xOf(i)} cy={y(v)} r={hi === i ? 6 : 4} fill="#F5B544"
            style={{ transition: "r .15s ease" }} />
          {hi === i && <circle cx={xOf(i)} cy={y(v)} r="9" fill="none" stroke="#F5B544" strokeOpacity="0.4" />}
        </g>
      ))}

      {YEARS.map((yr, i) => (
        <text key={yr} x={xOf(i)} y={h - pad + 22} textAnchor="middle" fontSize="11"
          fill={hi === i ? "#F5B544" : "#797e85"} fontFamily="IBM Plex Mono">{yr}</text>
      ))}

      {/* info box */}
      {hi != null && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8"
            fill="#12141a" stroke="rgba(245,181,68,0.35)" />
          <text x={tipX + 14} y={tipY + 24} fontSize="13" fontWeight="700" fill="#e9eaec" fontFamily="Archivo">{YEARS[hi]}</text>
          <text x={tipX + tipW - 14} y={tipY + 24} textAnchor="end" fontSize="10" fill="#797e85" fontFamily="IBM Plex Mono">{scenario.replace(" Case", "").toUpperCase()}</text>
          <text x={tipX + 14} y={tipY + 52} fontSize="22" fontWeight="700" fill="#F5B544" fontFamily="Archivo">{data[hi].toFixed(1)}{unit}</text>
          <text x={tipX + 14} y={tipY + 72} fontSize="11" fill="#9aa0a6" fontFamily="IBM Plex Mono">{metric}</text>
          {yoy != null && (
            <text x={tipX + 14} y={tipY + 88} fontSize="11" fontFamily="IBM Plex Mono"
              fill={yoy >= 0 ? "#5FB97C" : "#E5634D"}>
              {yoy >= 0 ? "▲ +" : "▼ "}{yoy.toFixed(1)}{unit} vs {YEARS[hi - 1]}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}

export default function ForecastsPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "forecasts")) return <ComingSoonInline vertical={vertical} title="Market Forecasts" />;
  return <ForecastsInner />;
}

function ForecastsInner() {
  const { FORECAST_MARKETS = [], FORECAST_DRIVERS = [], COPY = {} } = useContent();
  const metrics = COPY.fcMetrics || DEFAULT_METRICS;
  const colLabel = COPY.fcColLabel || "RENT";
  const [sc, setSc] = useState("Base Case");
  const [metric, setMetric] = useState(metrics[0]);
  const conf = sc === "Base Case" ? 78 : sc === "Bull Case" ? 64 : 71;
  const series = seriesFor(metric, sc);

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Market Forecasts</h1>
      <p className="mt-3 max-w-2xl text-muted">{COPY.fcSubtitle || "5-year forward projections across leading indicators."}</p>

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="kicker">Scenario</span>
          <div className="inline-flex rounded-md border border-[var(--line)] p-1">
            {SCENARIOS.map((s) => (
              <button key={s} onClick={() => setSc(s)} className={`mono rounded px-3 py-1.5 text-[12px] ${sc === s ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="kicker">Metric</span>
          <div className="inline-flex flex-wrap rounded-md border border-[var(--line)] p-1">
            {metrics.map((m) => (
              <button key={m} onClick={() => setMetric(m)} className={`mono rounded px-3 py-1.5 text-[12px] ${metric === m ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-8 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-ink">{sc} — 5 Year Forecast</h2>
            <p className="mono text-[12px] text-muted">{metric} · {sc} projection</p>
          </div>
          <span className="mono rounded-sm border border-neutral/40 bg-neutral/10 px-2.5 py-1 text-[11px] text-neutral">{conf}% conf</span>
        </div>
        <LineChart data={series.data} unit={series.unit} mean={series.mean} metric={metric} scenario={sc} />
        <p className="mono mt-2 text-center text-[11px] text-muted">Hover or tap a year to inspect the projection · dashed line = historical mean reference.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-5 font-semibold text-ink">Market-Level Forecasts</h2>
          <div className="grid grid-cols-4 gap-2 pb-3 mono text-[10px] tracking-[0.12em] text-muted">
            <span>MARKET</span><span>1Y {colLabel}</span><span>3Y {colLabel}</span><span className="text-right">SIGNAL</span>
          </div>
          {FORECAST_MARKETS.map((m) => (
            <div key={m.city} className="grid grid-cols-4 items-center gap-2 border-t border-[var(--line)] py-3 text-sm">
              <span className="flex items-center gap-2 text-ink"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: toneColor(m.tone) }} />{m.city}</span>
              <span className="mono" style={{ color: toneColor(m.tone) }}>{m.y1}</span>
              <span className="mono text-muted">{m.y3}</span>
              <span className="text-right"><span className="mono rounded px-2 py-1 text-[11px]" style={{ color: toneColor(m.tone), backgroundColor: `${toneColor(m.tone)}1a` }}>{m.conf}% conf</span></span>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <h2 className="mb-5 font-semibold text-ink">Key Forecast Drivers</h2>
          <div className="space-y-3">
            {FORECAST_DRIVERS.map((d) => (
              <div key={d.name} className="rounded-md border border-[var(--line)] p-4" style={{ borderLeft: `3px solid ${toneColor(d.tone)}` }}>
                <p className="flex items-center gap-2 font-semibold text-ink">{d.name}
                  <span className="mono rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-muted">{d.weight}</span>
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{d.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-8 flex items-start gap-3 p-5">
        <Info size={16} className="mt-0.5 shrink-0 text-muted" />
        <p className="text-[12px] leading-relaxed text-muted">
          Forecasts are generated using proprietary models incorporating supply pipeline data, demographic trends, capital markets conditions, and macroeconomic factors. All projections carry inherent uncertainty. Not investment advice. Consult a licensed advisor before making investment decisions based on this data.
        </p>
      </div>
    </div>
  );
}
