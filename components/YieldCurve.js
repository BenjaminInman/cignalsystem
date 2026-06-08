"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";

const SAMPLE = {
  date: "sample",
  points: [
    { label: "1M", y: 4.30 }, { label: "3M", y: 4.25 }, { label: "6M", y: 4.10 },
    { label: "1Y", y: 3.95 }, { label: "2Y", y: 3.80 }, { label: "3Y", y: 3.80 },
    { label: "5Y", y: 3.90 }, { label: "7Y", y: 4.05 }, { label: "10Y", y: 4.20 },
    { label: "20Y", y: 4.55 }, { label: "30Y", y: 4.45 },
  ],
  spread2s10s: 0.40,
  spread3m10y: -0.05,
};

function Curve({ points }) {
  const W = 640, H = 240, padL = 44, padR = 14, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const span = hi - lo || 1;
  const pad = span * 0.2;
  const yLo = lo - pad, yHi = hi + pad;
  const xAt = (i) => padL + (i / (points.length - 1)) * innerW;
  const yAt = (v) => padT + (1 - (v - yLo) / (yHi - yLo)) * innerH;
  const line = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join(" ");
  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => yLo + ((yHi - yLo) * i) / ticks);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
          <text x={padL - 9} y={yAt(v) + 3} textAnchor="end" fontSize="11" fill="#AEB4BB" fontFamily="monospace">{v.toFixed(1)}%</text>
        </g>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1" />
      <polyline points={line} fill="none" stroke="#F5B544" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={xAt(i)} cy={yAt(p.y)} r="3" fill="#F5B544" />
          <text x={xAt(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#AEB4BB" fontFamily="monospace">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Spread({ label, value }) {
  if (value == null) return null;
  const inverted = value < 0;
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--line)] bg-bg/40 px-4 py-3">
      <span className="mono text-[11px] tracking-[0.1em] text-muted">{label}</span>
      <span className="mono text-base" style={{ color: inverted ? "#E5634D" : "#5FB97C" }}>
        {value > 0 ? "+" : ""}{value.toFixed(2)}% · {inverted ? "INV" : "NORM"}
      </span>
    </div>
  );
}

export default function YieldCurve() {
  const [data, setData] = useState(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetch("/api/yieldcurve")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.points?.length) { setData(d.data); setLive(true); }
        else setData(SAMPLE);
      })
      .catch(() => setData(SAMPLE));
  }, []);

  const d = data || SAMPLE;
  const inverted = (d.spread2s10s != null && d.spread2s10s < 0) || (d.spread3m10y != null && d.spread3m10y < 0);

  return (
    <section className="relative mt-14 overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-bg2/70 via-bg2/30 to-bg/10 px-6 py-8 md:px-10">
      {/* ambient market-signal backdrop */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 360" aria-hidden="true">
        <defs>
          <radialGradient id="yieldGlow" cx="80%" cy="6%" r="75%">
            <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="360" fill="url(#yieldGlow)" />
        <path d="M0,210 C120,150 200,250 320,200 C440,150 520,250 640,195 C760,140 840,240 960,185 C1080,135 1150,210 1200,175" fill="none" stroke="#F5B544" strokeOpacity="0.10" strokeWidth="2" />
        <g fill="#F5B544" fillOpacity="0.3">
          <circle cx="320" cy="200" r="3" />
          <circle cx="640" cy="195" r="3" />
          <circle cx="960" cy="185" r="3" />
        </g>
      </svg>

      <div className="relative">
        <p className="kicker mb-3 flex items-center gap-2"><Activity size={12} className="text-signal" /> Macro · Rates</p>
        <h2 className="headline text-3xl text-ink md:text-4xl">The Yield Curve</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Treasury yields across maturities. The shape — and whether short rates sit above long rates — is one of the
          most-watched leading signals in the cycle.
        </p>

        <div className="mt-7 grid items-center gap-8 lg:grid-cols-[1.7fr_1fr]">
          {/* chart */}
          <div className="rounded-lg border border-[var(--line)] bg-bg/30 p-4">
            <Curve points={d.points} />
          </div>

          {/* readout */}
          <div className="space-y-3">
            <Spread label="2s10s (10Y − 2Y)" value={d.spread2s10s} />
            <Spread label="3M · 10Y (10Y − 3M)" value={d.spread3m10y} />
            <p className="text-sm leading-relaxed text-muted">
              {inverted
                ? "Part of the curve is inverted — short rates above long rates. Historically a late-cycle warning that has preceded most recessions."
                : "The curve is upward-sloping — long rates above short rates, the shape associated with normal expansion."}
            </p>
            <p className="mono flex items-center gap-2 border-t border-[var(--line)] pt-3 text-[10px] tracking-[0.06em] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-flicker bg-signal" : "bg-muted"}`} />
              {data === null
                ? "Loading…"
                : live
                ? `U.S. Treasury par yields · as of ${d.date}`
                : "Sample values — live Treasury feed resumes when reachable"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
