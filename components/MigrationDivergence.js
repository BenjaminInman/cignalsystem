"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";

const UP = "#5FB97C";
const DOWN = "#E5634D";

export default function MigrationDivergence() {
  const [data, setData] = useState(null);
  const [hi, setHi] = useState(null);

  useEffect(() => {
    fetch("/api/migration-divergence")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ items: [] }));
  }, []);

  const pts = (data?.items || []).filter((d) => d.matched && d.diff != null);
  if (!data) return null;

  // scales
  const W = 720, H = 430, padL = 58, padR = 132, padT = 22, padB = 46;
  const diffs = pts.map((p) => p.diff);
  const yMin = Math.min(0, ...diffs) - 6000;
  const yMax = Math.max(0, ...diffs) + 8000;
  const x = (renter) => padL + (renter / 100) * (W - padL - padR);
  const y = (d) => padT + (1 - (d - yMin) / (yMax - yMin)) * (H - padT - padB);
  const y0 = y(0);

  const fmtK = (v) => (v >= 0 ? "+" : "\u2212") + "$" + Math.abs(Math.round(v / 100) / 10) + "k";
  const labelFor = (p) => p.market.replace(/, [A-Z]{2}$/, "");

  // label which points (avoid clutter): extremes by |diff| + a few anchors
  const sorted = [...pts].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const labelSet = new Set(sorted.slice(0, 10).map((p) => p.market));
  ["Austin, TX", "Houston, TX", "Atlanta, GA", "Phoenix, AZ"].forEach((m) => labelSet.add(m));

  return (
    <section className="relative mt-10 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.07] via-bg2/40 to-bg/20 p-6 md:p-7">
      <p className="kicker mb-2 flex items-center gap-2"><Compass size={13} className="text-signal" /> Migration Divergence</p>
      <h2 className="headline text-2xl text-ink md:text-3xl">Renters are moving in — but is the money?</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Every dot is a U-Haul Top-25 growth metro, so DIY/renter movers are pouring into all of them. Height shows what IRS tax-return migration reveals about <span className="text-ink">who</span>: above the line a metro is also gaining higher-income households; below it, renters arrive while wealthier households leave — a workforce / value-add signal headcount alone hides.
      </p>

      <div className="mt-5 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" style={{ maxWidth: 880 }}>
          {/* quadrant washes */}
          <rect x={padL} y={padT} width={W - padL - padR} height={y0 - padT} fill={UP} opacity="0.05" />
          <rect x={padL} y={y0} width={W - padL - padR} height={H - padB - y0} fill={DOWN} opacity="0.05" />
          {/* axes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--line)" strokeWidth="1" />
          <line x1={padL} y1={y0} x2={W - padR} y2={y0} stroke="var(--line)" strokeWidth="1.4" strokeDasharray="3 3" />
          {/* y labels */}
          <text x={padL - 8} y={y(yMax) + 4} textAnchor="end" fontSize="9" fill={UP} className="mono">{fmtK(yMax)}</text>
          <text x={padL - 8} y={y0 + 3} textAnchor="end" fontSize="9" fill="var(--muted)" className="mono">$0</text>
          <text x={padL - 8} y={y(yMin) + 2} textAnchor="end" fontSize="9" fill={DOWN} className="mono">{fmtK(yMin)}</text>
          {/* axis captions */}
          <text x={(padL + W - padR) / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--muted)" className="mono">U-HAUL RENTER / DIY INFLOW  →</text>
          <text x={14} y={padT + 6} fontSize="9" fill={UP} className="mono">GAINING</text>
          <text x={14} y={H - padB - 2} fontSize="9" fill={DOWN} className="mono">LOSING</text>
          <text x={14} y={(padT + H - padB) / 2} fontSize="9" fill="var(--muted)" className="mono" transform={`rotate(-90 14 ${(padT + H - padB) / 2})`} textAnchor="middle">AFFLUENT HOUSEHOLDS (IRS AGI in − out)</text>

          {/* points */}
          {pts.map((p) => {
            const cx = x(p.renter), cy = y(p.diff);
            const col = p.diff >= 0 ? UP : DOWN;
            const r = 4 + Math.min(5, Math.abs(p.net || 0) / 9000);
            const show = labelSet.has(p.market) || hi === p.market;
            const leftSide = cx > W - padR - 70;
            return (
              <g key={p.market} onMouseEnter={() => setHi(p.market)} onMouseLeave={() => setHi(null)} style={{ cursor: "default" }}>
                <circle cx={cx} cy={cy} r={hi === p.market ? r + 2 : r} fill={col} fillOpacity={hi === p.market ? 0.95 : 0.7} stroke={col} strokeWidth="1" />
                {show && (
                  <text x={leftSide ? cx - r - 5 : cx + r + 5} y={cy + 3} textAnchor={leftSide ? "end" : "start"} fontSize="9.5" fill={hi === p.market ? "var(--ink)" : "var(--muted)"} className="mono">
                    {labelFor(p)} <tspan fill={col}>{fmtK(p.diff)}</tspan>
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* reads */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="mono rounded-md border border-up/20 bg-up/[0.06] px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="text-up">ABOVE LINE</span> · renters + higher-income households both arriving — broad demand that also supports Class A.
        </p>
        <p className="mono rounded-md border border-down/20 bg-down/[0.06] px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="text-down">BELOW LINE</span> · renters flood in while wealthier households exit — a workforce / value-add (Class B–C) thesis.
        </p>
      </div>

      <p className="mono mt-3 text-[10px] tracking-[0.06em] text-muted">
        U-Haul Growth Index {data.year} · IRS SOI county-to-county migration {data.irsPeriod} (domestic, ~2-yr lag) · {pts.length} metros matched
      </p>
    </section>
  );
}
