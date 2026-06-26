"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";

const ACCEL = "#5FB97C"; // affluence differential rising YoY
const FADE = "#E5634D";  // falling YoY
const STEADY = "#F5B544"; // ~flat
const MUTED = "#797E85";

function momColor(mom) {
  return mom === "accelerating" ? ACCEL : mom === "fading" ? FADE : mom === "steady" ? STEADY : MUTED;
}

export default function MigrationDivergence() {
  const [data, setData] = useState(null);
  const [hi, setHi] = useState(null);

  useEffect(() => {
    fetch("/api/migration-divergence").then((r) => r.json()).then(setData).catch(() => setData({ items: [] }));
  }, []);

  if (!data) return null;
  const pts = (data.items || []).filter((d) => d.matched && d.diff != null);

  const W = 720, H = 440, padL = 58, padR = 138, padT = 26, padB = 48;
  const ys = pts.flatMap((p) => [p.diff, p.diffPrev]).filter((v) => v != null);
  const yMin = Math.min(0, ...ys) - 6000;
  const yMax = Math.max(0, ...ys) + 8000;
  const x = (renter) => padL + (renter / 100) * (W - padL - padR);
  const y = (d) => padT + (1 - (d - yMin) / (yMax - yMin)) * (H - padT - padB);
  const y0 = y(0);

  const fmtK = (v) => (v >= 0 ? "+" : "\u2212") + "$" + Math.abs(Math.round(v / 100) / 10) + "k";
  const name = (p) => p.market.replace(/, [A-Z]{2}$/, "");

  const movers = [...pts].filter((p) => p.delta != null).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const labelSet = new Set(movers.slice(0, 9).map((p) => p.market));
  ["Miami, FL", "Austin, TX", "Houston, TX", "Phoenix, AZ"].forEach((m) => labelSet.add(m));

  const counts = pts.reduce((a, p) => { if (p.momentum) a[p.momentum] = (a[p.momentum] || 0) + 1; return a; }, {});

  return (
    <section className="relative mt-10 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.07] via-bg2/40 to-bg/20 p-6 md:p-7">
      <p className="kicker mb-2 flex items-center gap-2"><Compass size={13} className="text-signal" /> Migration Divergence · Money-Flow Momentum</p>
      <h2 className="headline text-2xl text-ink md:text-3xl">Renters are moving in — is the money flow strengthening or fading?</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Every dot is a U-Haul Top-25 growth metro. Vertical position is the <span className="text-ink">level</span> — above the line the metro is gaining higher-income households (per IRS tax-return migration), below it the wealthier are leaving. The tail and color show the <span className="text-ink">year-over-year move</span>: an affluence advantage that&apos;s widening (accelerating) or narrowing (fading) — a metro can sit high yet be fading fast.
      </p>

      <div className="mt-5 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" style={{ maxWidth: 880 }}>
          <rect x={padL} y={padT} width={W - padL - padR} height={y0 - padT} fill={ACCEL} opacity="0.04" />
          <rect x={padL} y={y0} width={W - padL - padR} height={H - padB - y0} fill={FADE} opacity="0.04" />
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--line)" strokeWidth="1" />
          <line x1={padL} y1={y0} x2={W - padR} y2={y0} stroke="var(--line)" strokeWidth="1.4" strokeDasharray="3 3" />
          <text x={padL - 8} y={y(yMax) + 4} textAnchor="end" fontSize="9" fill="var(--muted)" className="mono">{fmtK(yMax)}</text>
          <text x={padL - 8} y={y0 + 3} textAnchor="end" fontSize="9" fill="var(--muted)" className="mono">$0</text>
          <text x={padL - 8} y={y(yMin) + 2} textAnchor="end" fontSize="9" fill="var(--muted)" className="mono">{fmtK(yMin)}</text>
          <text x={(padL + W - padR) / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--muted)" className="mono">U-HAUL RENTER / DIY INFLOW  {"\u2192"}</text>
          <text x={14} y={padT + 6} fontSize="9" fill="var(--muted)" className="mono">GAINING AFFLUENT</text>
          <text x={14} y={H - padB - 2} fontSize="9" fill="var(--muted)" className="mono">LOSING AFFLUENT</text>

          {pts.map((p) => {
            const cx = x(p.renter), cyNow = y(p.diff);
            const col = momColor(p.momentum);
            const r = 4 + Math.min(5, Math.abs(p.net || 0) / 9000);
            const active = hi === p.market;
            const show = labelSet.has(p.market) || active;
            const leftSide = cx > W - padR - 64;
            return (
              <g key={p.market} onMouseEnter={() => setHi(p.market)} onMouseLeave={() => setHi(null)} style={{ cursor: "default" }}>
                {p.diffPrev != null && (
                  <>
                    <line x1={cx} y1={y(p.diffPrev)} x2={cx} y2={cyNow} stroke={col} strokeWidth={active ? 2 : 1.4} opacity={active ? 0.8 : 0.5} />
                    <circle cx={cx} cy={y(p.diffPrev)} r="2" fill="none" stroke={col} strokeWidth="1" opacity="0.45" />
                  </>
                )}
                <circle cx={cx} cy={cyNow} r={active ? r + 2 : r} fill={col} fillOpacity={active ? 0.98 : 0.82} stroke={col} strokeWidth="1" />
                {show && (
                  <text x={leftSide ? cx - r - 5 : cx + r + 5} y={cyNow + 3} textAnchor={leftSide ? "end" : "start"} fontSize="9.5" fill={active ? "var(--ink)" : "var(--muted)"} className="mono">
                    {name(p)}{p.delta != null ? <tspan fill={col}> {fmtK(p.delta)}/yr</tspan> : null}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
        <span className="mono flex items-center gap-1.5 text-muted"><span className="inline-block h-2 w-2 rounded-full" style={{ background: ACCEL }} /> Accelerating {counts.accelerating ? `(${counts.accelerating})` : ""}</span>
        <span className="mono flex items-center gap-1.5 text-muted"><span className="inline-block h-2 w-2 rounded-full" style={{ background: FADE }} /> Fading {counts.fading ? `(${counts.fading})` : ""}</span>
        <span className="mono flex items-center gap-1.5 text-muted"><span className="inline-block h-2 w-2 rounded-full" style={{ background: STEADY }} /> Steady {counts.steady ? `(${counts.steady})` : ""}</span>
        <span className="mono text-muted">· tail = where it sat a year earlier · dot size = net households</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="mono rounded-md border border-up/20 bg-up/[0.06] px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="text-up">ACCELERATING</span> · the income gap between arrivers and leavers is widening year-over-year — higher-income inflow is strengthening.
        </p>
        <p className="mono rounded-md border border-down/20 bg-down/[0.06] px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="text-down">FADING</span> · the gap is narrowing — the wealth-migration tailwind is weakening, even in metros still sitting above the line.
        </p>
      </div>

      <p className="mono mt-3 text-[10px] tracking-[0.06em] text-muted">
        U-Haul Growth Index {data.year} · momentum = IRS AGI differential {data.latestYear ? `${data.latestYear - 1}\u2192${data.latestYear}` : ""} (domestic, ~2-yr lag) · {pts.length} metros matched
      </p>
    </section>
  );
}
