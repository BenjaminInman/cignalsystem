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
  const W = 600, H = 188, padL = 32, padR = 12, padT = 12, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const span = hi - lo || 1;
  const pad = span * 0.2;
  const yLo = lo - pad, yHi = hi + pad;
  const xAt = (i) => padL + (i / (points.length - 1)) * innerW;
  const yAt = (v) => padT + (1 - (v - yLo) / (yHi - yLo)) * innerH;
  const line = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join(" ");
  const ticks = 3;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => yLo + ((yHi - yLo) * i) / ticks);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={padL - 5} y={yAt(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="monospace">{v.toFixed(1)}</text>
        </g>
      ))}
      <polyline points={line} fill="none" stroke="#F5B544" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={xAt(i)} cy={yAt(p.y)} r="2.5" fill="#F5B544" />
          <text x={xAt(i)} y={H - 9} textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="monospace">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Spread({ label, value }) {
  if (value == null) return null;
  const inverted = value < 0;
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2">
      <span className="mono text-[10px] tracking-[0.1em] text-muted">{label}</span>
      <span className="mono text-sm" style={{ color: inverted ? "#E5634D" : "#5FB97C" }}>
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
    <section className="mt-14 max-w-xl">
      <p className="kicker mb-2 flex items-center gap-2"><Activity size={12} className="text-signal" /> Macro · Rates</p>
      <h2 className="headline text-2xl text-ink">The Yield Curve</h2>
      <p className="mt-2 text-sm text-muted">Treasury yields across maturities — the shape, and any inversion, is a key leading signal.</p>

      <div className="card mt-4 p-5">
        {data === null ? (
          <div className="flex h-[160px] items-center justify-center">
            <p className="mono text-[11px] text-muted">Loading…</p>
          </div>
        ) : (
          <>
            <Curve points={d.points} />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Spread label="2s10s" value={d.spread2s10s} />
              <Spread label="3M·10Y" value={d.spread3m10y} />
            </div>
            <p className="mono mt-3 flex items-center gap-2 border-t border-[var(--line)] pt-3 text-[10px] tracking-[0.06em] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-flicker bg-signal" : "bg-muted"}`} />
              {live ? `${inverted ? "Inverted · " : "Upward-sloping · "}U.S. Treasury, as of ${d.date}` : "Sample values — live Treasury feed resumes when reachable"}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
