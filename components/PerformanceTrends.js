"use client";

import { useState, useRef, useEffect } from "react";

// Sample fallback (shown until live national data loads / when no FRED key).
const SAMPLE = {
  live: false,
  months: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
  rent: [4.9, 4.8, 4.7, 4.6, 4.5, 4.4, 4.3, 4.2, 4.1, 4.05, 4.0, 3.95],
  shelter: [5.2, 5.1, 5.0, 4.9, 4.8, 4.7, 4.6, 4.5, 4.45, 4.4, 4.35, 4.3],
  vac: [6.6, 6.6, 6.6, 6.8, 6.8, 6.8, 7.0, 7.0, 7.0, 6.9, 6.9, 6.9],
};

const SERIES_DEF = [
  { key: "rent", label: "Rent growth %", color: "#38BDF8", dash: false },
  { key: "shelter", label: "Shelter CPI %", color: "#5FB97C", dash: false },
  { key: "vac", label: "Vacancy %", color: "#E5634D", dash: true },
];

const W = 720, H = 300, padL = 42, padR = 14, padT = 18, padB = 32;
const innerW = W - padL - padR, innerH = H - padT - padB;
const Y_MIN = 0, Y_MAX = 8;

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);

function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function Swatch({ color, dash }) {
  return (
    <svg width="22" height="8" aria-hidden="true">
      <line x1="0" y1="4" x2="22" y2="4" stroke={color} strokeWidth="2.5" strokeDasharray={dash ? "4 3" : ""} strokeLinecap="round" />
    </svg>
  );
}

export default function PerformanceTrends() {
  const [trends, setTrends] = useState(SAMPLE);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const gridVals = [0, 2, 4, 6, 8];

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then((d) => { if (d && d.live && d.months && d.rent) setTrends(d); })
      .catch(() => {});
  }, []);

  const months = trends.months;
  const series = SERIES_DEF
    .filter((s) => Array.isArray(trends[s.key]) && trends[s.key].length === months.length)
    .map((s) => ({ ...s, data: trends[s.key] }));

  const xAt = (i) => padL + (i / (months.length - 1)) * innerW;
  const yAt = (v) => padT + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;

  const onMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const svgX = fx * W;
    let idx = Math.round(((svgX - padL) / innerW) * (months.length - 1));
    idx = Math.max(0, Math.min(months.length - 1, idx));
    setHover(idx);
  };

  const leftPct = hover != null ? (xAt(hover) / W) * 100 : 0;
  const flip = hover != null && hover > (months.length - 1) * 0.62;

  return (
    <section>
      <div className="card h-full p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="headline text-2xl text-ink md:text-3xl">12-Month Performance Trends</h2>
            <p className="mt-1 text-sm text-muted">National · rent growth &amp; shelter inflation (YoY) and rental vacancy</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-2">
                <Swatch color={s.color} dash={s.dash} />
                <span className="mono text-[12px] tracking-[0.04em] text-muted">{s.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-6">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}
            onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            {gridVals.map((v) => (
              <g key={v}>
                <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
                <text x={padL - 10} y={yAt(v) + 4} textAnchor="end" fontSize="12" fill="#AEB4BB" fontFamily="monospace">{v}%</text>
              </g>
            ))}
            {months.map((m, i) => (
              <g key={m + i}>
                <line x1={xAt(i)} y1={padT} x2={xAt(i)} y2={H - padB} stroke="var(--line)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 4" />
                <text x={xAt(i)} y={H - 12} textAnchor="middle" fontSize="11" fill={hover === i ? "#ECEDEF" : "#AEB4BB"} fontFamily="monospace">{m.split(" ")[0]}</text>
              </g>
            ))}
            <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1" />
            <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1" />
            {series.map((s) => {
              const pts = s.data.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
              return (
                <path key={s.key} d={smooth(pts)} fill="none" stroke={s.color} strokeWidth="2.5"
                  strokeDasharray={s.dash ? "6 4" : ""} strokeLinejoin="round" strokeLinecap="round" />
              );
            })}
            {hover != null && (
              <g>
                <line x1={xAt(hover)} y1={padT} x2={xAt(hover)} y2={H - padB} stroke="#ECEDEF" strokeOpacity="0.45" strokeWidth="1" />
                {series.map((s) => (
                  <circle key={s.key} cx={xAt(hover)} cy={yAt(s.data[hover])} r="5" fill="#0E0F11" stroke={s.color} strokeWidth="3" />
                ))}
              </g>
            )}
            <rect x="0" y="0" width={W} height={H} fill="transparent" />
          </svg>

          {hover != null && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-[var(--line-strong)] bg-bg2/95 px-3 py-2 shadow-xl shadow-black/40"
              style={{ top: 8, left: `${leftPct}%`, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
            >
              <p className="mono text-[12px] text-muted">{months[hover]}</p>
              {series.map((s) => (
                <p key={s.key} className="mono text-[12px]" style={{ color: s.color }}>
                  {s.label.replace(" %", "").toLowerCase()} : {fmt(s.data[hover])}%
                </p>
              ))}
            </div>
          )}
        </div>

        <p className="mono mt-3 flex items-center gap-2 text-[10px] tracking-[0.06em] text-muted">
          {trends.live ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              Live · BLS CPI &amp; U.S. Census · updated monthly{trends.asOf ? ` · as of ${trends.asOf}` : ""}
            </>
          ) : (
            "Illustrative sample — live national data loads when available."
          )}
        </p>
      </div>
    </section>
  );
}
