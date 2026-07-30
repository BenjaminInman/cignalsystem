"use client";

// Non-live PREVIEW of the Cycle Clock, shown to free members on the upgrade
// screen. All dots are frozen illustrative data — no /api/cycle-clock, no ZIP
// resolution — so the live Pro read never leaks. It exists to sell the feature:
// the four-phase wheel, the class rings, the per-phase counters, and the
// leading-vs-trailing divergence.

import { useState, useMemo } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

const CX = 220, CY = 220, R_OUT = 200;
const RINGS = { leading: 168, coincident: 132, trailing: 96 };
const PHASES = [
  { key: "recovery",    label: "Recovery",    a0: 180, a1: 270, tone: "#3f6b52", txt: "#5FB97C" },
  { key: "expansion",   label: "Expansion",   a0: 270, a1: 360, tone: "#5a7a3f", txt: "#5FB97C" },
  { key: "hypersupply", label: "Hypersupply", a0: 0,   a1: 90,  tone: "#7a6a2f", txt: "#F5B544" },
  { key: "contraction", label: "Contraction", a0: 90,  a1: 180, tone: "#7a4238", txt: "#E5634D" },
];
const CLS_COLOR = { leading: "#F5B544", coincident: "#5AA9E6", trailing: "#8A8F84" };
const CLS_LABEL = { leading: "Leading", coincident: "Coincident", trailing: "Trailing" };
const phaseByKey = (k) => PHASES.find((p) => p.key === k) || PHASES[0];
function polar(deg, r) { const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }
function posToAngle(key, pos) { const p = phaseByKey(key); const t = Math.max(0.06, Math.min(0.94, pos)); return p.a0 + t * (p.a1 - p.a0); }
function arcPath(a0, a1, r) { const [x0, y0] = polar(a0, r), [x1, y1] = polar(a1, r); const large = (a1 - a0) > 180 ? 1 : 0; return `M${CX},${CY} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`; }

// Illustrative sample — a late-cycle read where leading capital/inflation signals
// have turned to Contraction while coincident fundamentals sit in Recovery.
const SAMPLE = [
  { slug: "t10", label: "10-Year Treasury", cls: "leading", unit: "%", value: 4.42, phase: "contraction", pos: 0.5, trail: [["expansion", .6], ["hypersupply", .4], ["contraction", .3], ["contraction", .5]] },
  { slug: "sent", label: "Consumer Sentiment", cls: "leading", unit: "idx", value: 47.3, phase: "contraction", pos: 0.7, trail: [["hypersupply", .5], ["contraction", .3], ["contraction", .5], ["contraction", .7]] },
  { slug: "perm", label: "MF Permits", cls: "leading", unit: "K", value: 470, phase: "recovery", pos: 0.4, trail: [["contraction", .6], ["contraction", .8], ["recovery", .2], ["recovery", .4]] },
  { slug: "start", label: "MF Starts", cls: "leading", unit: "K", value: 428, phase: "recovery", pos: 0.55 },
  { slug: "dom", label: "Days on Market", cls: "leading", unit: "days", value: 52, phase: "expansion", pos: 0.4 },
  { slug: "gdp", label: "GDP", cls: "coincident", unit: "%", value: 1.6, phase: "recovery", pos: 0.6, trail: [["contraction", .5], ["contraction", .7], ["recovery", .3], ["recovery", .6]] },
  { slug: "pce", label: "Real PCE", cls: "coincident", unit: "% YoY", value: 2.11, phase: "contraction", pos: 0.4 },
  { slug: "jobs", label: "Job Growth", cls: "coincident", unit: "% YoY", value: 0.28, phase: "recovery", pos: 0.35 },
  { slug: "rent", label: "Rent Growth", cls: "coincident", unit: "% YoY", value: 2.04, phase: "recovery", pos: 0.75, trail: [["contraction", .4], ["recovery", .2], ["recovery", .5], ["recovery", .75]] },
  { slug: "abs", label: "Absorption", cls: "coincident", unit: "", value: 49, phase: "recovery", pos: 0.5 },
  { slug: "unemp", label: "Unemployment", cls: "trailing", unit: "%", value: 4.27, phase: "expansion", pos: 0.5 },
  { slug: "cpi", label: "CPI Inflation", cls: "trailing", unit: "% YoY", value: 3.8, phase: "contraction", pos: 0.6 },
  { slug: "vac", label: "Vacancy", cls: "trailing", unit: "%", value: 7.3, phase: "expansion", pos: 0.35 },
  { slug: "delq", label: "Delinquencies", cls: "trailing", unit: "%", value: 0.61, phase: "expansion", pos: 0.65 },
];
const QLABELS = ["Q3 '25", "Q4 '25", "Q1 '26", "Q2 '26"];

export default function CycleClockDemo() {
  const [selected, setSelected] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const shown = SAMPLE.filter((i) => !hidden.has(i.slug));
  const sel = selected ? SAMPLE.find((i) => i.slug === selected) : null;
  const toggle = (s) => setHidden((p) => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const counts = useMemo(() => {
    const c = {}; for (const p of PHASES) c[p.key] = { leading: 0, coincident: 0, trailing: 0, total: 0 };
    for (const i of shown) { c[i.phase][i.cls] += 1; c[i.phase].total += 1; }
    return c;
  }, [shown]);

  const national = SAMPLE; // all national in the sample

  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-center gap-3">
        <p className="kicker text-signal">Live preview</p>
        <span className="mono rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] tracking-[0.1em] text-muted">SAMPLE DATA · NOT LIVE</span>
      </div>
      <h2 className="headline mt-3 text-2xl text-ink md:text-3xl">Read the cycle at a glance</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
        Every indicator placed around the four phases by its own level and trajectory. The counts show where the
        market <em>is</em> (coincident and trailing) and where it's <em>headed</em> (leading). Click a dot to trace
        its path. Pro unlocks the live wheel, all indicators, and a ZIP overlay for your own markets.
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <svg width="440" height="440" viewBox="0 0 440 440" className="mx-auto flex-none">
          {PHASES.map((p) => <path key={p.key} d={arcPath(p.a0, p.a1, R_OUT)} fill={p.tone} fillOpacity={0.16} stroke="#000" strokeOpacity={0.2} />)}
          {Object.values(RINGS).map((r) => <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#fff" strokeOpacity={0.06} />)}
          <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke="#fff" strokeOpacity={0.1} />
          {[0, 90, 180, 270].map((a) => { const [x, y] = polar(a, R_OUT); return <line key={a} x1={CX} y1={CY} x2={x} y2={y} stroke="#fff" strokeOpacity={0.08} />; })}
          {PHASES.map((p) => { const [x, y] = polar((p.a0 + p.a1) / 2, R_OUT + 16); return <text key={p.key} x={x} y={y} fill="#cfd2c8" fontSize={11} letterSpacing="1.5" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono, monospace)">{p.label.toUpperCase()}</text>; })}
          {PHASES.map((p) => { const ct = counts[p.key]; if (!ct.total) return null; const [x, y] = polar((p.a0 + p.a1) / 2, 64); return (
            <g key={"ct" + p.key}>
              <text x={x} y={y - 1} fill={p.txt} fontSize={19} fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono, monospace)">{ct.total}</text>
              <text x={x} y={y + 12} fontSize={8.5} textAnchor="middle" fontFamily="var(--font-mono, monospace)">
                <tspan fill="#F5B544">{ct.leading}L</tspan><tspan fill="#6f746a"> · </tspan><tspan fill="#5AA9E6">{ct.coincident}C</tspan><tspan fill="#6f746a"> · </tspan><tspan fill="#8A8F84">{ct.trailing}T</tspan>
              </text>
            </g>
          ); })}
          {sel && sel.trail && sel.trail.map((pt, i) => { const ring = RINGS[sel.cls]; const [x, y] = polar(posToAngle(pt[0], pt[1]), ring); let line = null; if (i > 0) { const pv = sel.trail[i - 1]; const [px, py] = polar(posToAngle(pv[0], pv[1]), ring); line = <line x1={px} y1={py} x2={x} y2={y} stroke="#F5B544" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="2 3" />; } return <g key={i}>{line}<circle cx={x} cy={y} r={3} fill="#F5B544" fillOpacity={0.15 + i * 0.18} /></g>; })}
          {shown.map((ind) => { const ring = RINGS[ind.cls]; const [x, y] = polar(posToAngle(ind.phase, ind.pos), ring); const col = CLS_COLOR[ind.cls]; const isSel = selected === ind.slug; return (
            <g key={ind.slug} style={{ cursor: "pointer" }} onClick={() => setSelected(ind.slug)}>
              {isSel && <circle cx={x} cy={y} r={12} fill="none" stroke={col} strokeOpacity={0.5} />}
              <circle cx={x} cy={y} r={isSel ? 7 : 5.5} fill={col} stroke="#0A0B0A" strokeWidth={1.5} />
            </g>
          ); })}
        </svg>

        <div className="flex-1 min-w-[240px]">
          {sel ? (
            <div className="mb-5 rounded-lg border border-[var(--line)] bg-bg/40 p-4">
              <p className="headline text-lg">{sel.label}</p>
              <p className="text-2xl font-semibold">{sel.value}<span className="ml-1 text-[13px] text-muted">{sel.unit}</span></p>
              <p className="mono mt-1 text-[11.5px] text-muted">{CLS_LABEL[sel.cls]} · in <b style={{ color: phaseByKey(sel.phase).txt }}>{phaseByKey(sel.phase).label}</b></p>
              {sel.trail && (
                <div className="mt-3 border-t border-[var(--line)]/60 pt-3">
                  <p className="mono mb-1.5 text-[10px] tracking-[0.16em] text-muted">PATH THROUGH THE CYCLE</p>
                  <p className="mono text-[11.5px] leading-relaxed text-muted">{sel.trail.map((t, i) => <span key={i}>{i > 0 && "  →  "}<span className="text-muted/70">{QLABELS[i]}</span> {phaseByKey(t[0]).label}</span>)}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mb-5 text-[12.5px] italic text-muted">Click any dot to see its reading and how it has moved through the cycle.</p>
          )}

          <p className="mono mb-2 text-[10px] tracking-[0.18em] text-muted">INDICATORS ({shown.length}/{national.length})</p>
          <div className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
            {national.map((ind) => (
              <label key={ind.slug} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-white/5">
                <input type="checkbox" checked={!hidden.has(ind.slug)} onChange={() => toggle(ind.slug)} style={{ accentColor: "#F5B544" }} className="h-3.5 w-3.5" />
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: CLS_COLOR[ind.cls] }} />
                <span className="truncate">{ind.label}</span>
                <span className="ml-auto mono text-[8.5px] tracking-[0.1em] text-muted">{ind.cls.slice(0, 4).toUpperCase()}</span>
              </label>
            ))}
          </div>

          {/* locked ZIP teaser */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-[var(--line)] px-3 py-2.5">
            <Lock size={13} className="text-signal" />
            <p className="mono text-[11px] text-muted">Overlay <span className="text-ink">your market</span> by ZIP with Pro — local rent, vacancy, and jobs on the same wheel.</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#F5B544" }} /> Leading</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#5AA9E6" }} /> Coincident</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#8A8F84" }} /> Trailing</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-bg/40 px-4 py-3">
        <Lock size={13} className="text-signal" />
        <p className="mono text-[11px] text-muted">
          Live values, the full indicator set, and the per-market ZIP overlay are Pro.
          <Link href="/dashboard" className="ml-2 text-signal hover-line">Upgrade to unlock →</Link>
        </p>
      </div>
    </div>
  );
}
