"use client";

import { useState, useEffect, useMemo } from "react";

// Clock geometry: 0deg = top, clockwise. Phase layout per spec:
// Recovery bottom-left, Expansion top-left, Hypersupply top-right, Contraction bottom-right.
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
function arcPath(a0, a1, r) {
  const [x0, y0] = polar(a0, r), [x1, y1] = polar(a1, r);
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M${CX},${CY} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
}

export default function CycleClock() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());

  useEffect(() => {
    let live = true;
    fetch("/api/cycle-clock")
      .then((r) => r.json())
      .then((d) => { if (!live) return; if (d?.indicators?.length) setData(d); else setErr(true); })
      .catch(() => live && setErr(true));
    return () => { live = false; };
  }, []);

  const indicators = data?.indicators || [];
  const shown = indicators.filter((i) => !hidden.has(i.slug));
  const sel = selected ? indicators.find((i) => i.slug === selected) : null;

  const toggle = (slug) =>
    setHidden((prev) => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  const leanPhase = data?.lean ? phaseByKey(data.lean) : null;
  const leanText = useMemo(() => {
    if (!data?.tally) return "";
    const t = data.tally;
    const lead = indicators.filter((i) => i.cls === "leading");
    const laggard = indicators.filter((i) => i.cls === "trailing");
    const leadPhases = new Set(lead.map((i) => i.phase));
    const lagPhases = new Set(laggard.map((i) => i.phase));
    const divergent = [...leadPhases].some((p) => !lagPhases.has(p));
    return divergent
      ? "Leading and trailing signals are reading different phases — the leading edge is turning before the lagging data confirms it. That gap is the signal."
      : "Leading and trailing signals are broadly aligned on the current phase.";
  }, [data, indicators]);

  if (err) return <p className="text-sm text-muted">Cycle clock is temporarily unavailable.</p>;
  if (!data) return <p className="text-sm text-muted">Reading the cycle…</p>;

  return (
    <div>
      {leanPhase && (
        <div className="mb-5 rounded-lg border border-[var(--line)] bg-bg2/40 px-5 py-4">
          <p className="kicker mb-1">The weight of signals leans</p>
          <p className="headline text-2xl" style={{ color: leanPhase.txt }}>{leanPhase.label}</p>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">{leanText}</p>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* wheel */}
        <svg width="440" height="440" viewBox="0 0 440 440" className="mx-auto flex-none">
          {PHASES.map((p) => (
            <path key={p.key} d={arcPath(p.a0, p.a1, R_OUT)} fill={p.tone} fillOpacity={0.16} stroke="#000" strokeOpacity={0.2} />
          ))}
          {Object.values(RINGS).map((r) => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#fff" strokeOpacity={0.06} />
          ))}
          <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke="#fff" strokeOpacity={0.1} />
          {[0, 90, 180, 270].map((a) => { const [x, y] = polar(a, R_OUT); return <line key={a} x1={CX} y1={CY} x2={x} y2={y} stroke="#fff" strokeOpacity={0.08} />; })}
          {PHASES.map((p) => { const [x, y] = polar((p.a0 + p.a1) / 2, R_OUT + 16); return (
            <text key={p.key} x={x} y={y} fill="#cfd2c8" fontSize={11} letterSpacing="1.5" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono, monospace)">{p.label.toUpperCase()}</text>
          ); })}
          <text x={CX} y={CY - 5} fill="#6f746a" fontSize={9} letterSpacing="2" textAnchor="middle" fontFamily="var(--font-mono, monospace)">CYCLE</text>
          <text x={CX} y={CY + 8} fill="#6f746a" fontSize={9} letterSpacing="2" textAnchor="middle" fontFamily="var(--font-mono, monospace)">CLOCK</text>

          {/* trail for selected */}
          {sel && sel.trail && sel.trail.map((pt, i) => {
            const ring = RINGS[sel.cls];
            const [x, y] = polar(posToAngle(pt.phase, pt.pos), ring);
            let line = null;
            if (i > 0) {
              const prev = sel.trail[i - 1];
              const [px, py] = polar(posToAngle(prev.phase, prev.pos), ring);
              line = <line x1={px} y1={py} x2={x} y2={y} stroke="#F5B544" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="2 3" />;
            }
            return <g key={i}>{line}<circle cx={x} cy={y} r={3} fill="#F5B544" fillOpacity={0.15 + i * 0.18} /></g>;
          })}

          {/* dots */}
          {shown.map((ind) => {
            const ring = RINGS[ind.cls];
            const [x, y] = polar(posToAngle(ind.phase, ind.pos), ring);
            const col = CLS_COLOR[ind.cls];
            const isSel = selected === ind.slug;
            return (
              <g key={ind.slug} style={{ cursor: "pointer" }} onClick={() => setSelected(ind.slug)}>
                {isSel && <circle cx={x} cy={y} r={11} fill="none" stroke={col} strokeOpacity={0.5} />}
                <circle cx={x} cy={y} r={isSel ? 7 : 5.5} fill={col} stroke="#0A0B0A" strokeWidth={1.5} />
              </g>
            );
          })}
        </svg>

        {/* controls + detail */}
        <div className="flex-1 min-w-[240px]">
          {sel ? (
            <div className="mb-5 rounded-lg border border-[var(--line)] bg-bg/40 p-4">
              <p className="headline text-lg">{sel.label}</p>
              <p className="text-2xl font-semibold">{sel.value}<span className="ml-1 text-[13px] text-muted">{sel.unit}</span></p>
              <p className="mono mt-1 text-[11.5px] text-muted">
                {CLS_LABEL[sel.cls]} · currently in{" "}
                <b style={{ color: phaseByKey(sel.phase).txt }}>{phaseByKey(sel.phase).label}</b> · {sel.trajectory}
              </p>
              {sel.trail && sel.trail.length > 1 && (
                <div className="mt-3 border-t border-[var(--line)]/60 pt-3">
                  <p className="mono mb-1.5 text-[10px] tracking-[0.16em] text-muted">PATH THROUGH THE CYCLE</p>
                  <p className="mono text-[11.5px] leading-relaxed text-muted">
                    {sel.trail.map((t, i) => (
                      <span key={i}>{i > 0 && "  →  "}<span className="text-muted/70">{t.label}</span> {phaseByKey(t.phase).label}</span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mb-5 text-[12.5px] italic text-muted">Click any dot to see its reading and how it has moved through the cycle over the last few quarters.</p>
          )}

          <p className="mono mb-2 text-[10px] tracking-[0.18em] text-muted">INDICATORS ({shown.length}/{indicators.length})</p>
          <div className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
            {indicators.map((ind) => (
              <label key={ind.slug} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-white/5">
                <input type="checkbox" checked={!hidden.has(ind.slug)} onChange={() => toggle(ind.slug)} style={{ accentColor: "#F5B544" }} className="h-3.5 w-3.5" />
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: CLS_COLOR[ind.cls] }} />
                <span className="truncate">{ind.label}</span>
                <span className="ml-auto mono text-[8.5px] tracking-[0.1em] text-muted">{ind.cls.slice(0, 4).toUpperCase()}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#F5B544" }} /> Leading (outer)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#5AA9E6" }} /> Coincident (mid)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#8A8F84" }} /> Trailing (inner)</span>
          </div>
        </div>
      </div>

      <p className="mono mt-5 border-t border-[var(--line)] pt-3 text-[10.5px] leading-relaxed text-muted/80">
        National, live. Each dot is placed from first-print data: its level versus its long-run norm sets the phase, its
        quarter-over-quarter direction sets the trajectory. Leading indicators (outer ring) turn first; trailing indicators
        (inner) confirm. {data.asOf ? `Latest data through ${String(data.asOf).slice(0, 10)}.` : ""}
      </p>
    </div>
  );
}
