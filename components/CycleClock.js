"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

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
const dotId = (i) => `${i.ring}:${i.slug}`;

export default function CycleClock() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const [zipInput, setZipInput] = useState("");
  const [zip, setZip] = useState(null);

  const load = useCallback((z) => {
    setLoading(true); setErr(false); setSelected(null);
    const qs = z ? `?zip=${encodeURIComponent(z)}` : "";
    fetch(`/api/cycle-clock${qs}`)
      .then((r) => r.json())
      .then((d) => { if (d?.indicators?.length) setData(d); else setErr(true); })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]);

  const submitZip = () => {
    const z = zipInput.trim();
    if (/^\d{5}$/.test(z)) { setZip(z); load(z); }
  };
  const clearZip = () => { setZip(null); setZipInput(""); load(null); };

  const indicators = data?.indicators || [];
  const shown = indicators.filter((i) => !hidden.has(dotId(i)));
  const sel = selected ? indicators.find((i) => dotId(i) === selected) : null;
  const toggle = (id) => setHidden((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const leanPhase = data?.lean ? phaseByKey(data.lean) : null;
  const marketName = data?.market?.metroName || (data?.zip ? `ZIP ${data.zip}` : null);

  const leanText = useMemo(() => {
    if (!indicators.length) return "";
    const leadPhases = new Set(indicators.filter((i) => i.cls === "leading").map((i) => i.phase));
    const lagPhases = new Set(indicators.filter((i) => i.cls === "trailing").map((i) => i.phase));
    const divergent = [...leadPhases].some((p) => !lagPhases.has(p));
    return divergent
      ? "Leading and trailing signals are reading different phases — the leading edge is turning before the lagging data confirms it. That gap is the signal."
      : "Leading and trailing signals are broadly aligned on the current phase.";
  }, [indicators]);

  const national = indicators.filter((i) => i.ring === "national");
  const local = indicators.filter((i) => i.ring === "local");

  // Per-phase counts, split by class, from the visible dots. "Where it is"
  // reads off coincident/trailing; "where it's headed" off leading.
  const phaseCounts = useMemo(() => {
    const c = {};
    for (const p of PHASES) c[p.key] = { leading: 0, coincident: 0, trailing: 0, total: 0 };
    for (const ind of shown) { c[ind.phase][ind.cls] += 1; c[ind.phase].total += 1; }
    return c;
  }, [shown]);

  return (
    <div>
      {/* ZIP control */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
            onKeyDown={(e) => e.key === "Enter" && submitZip()}
            placeholder="Overlay a ZIP"
            inputMode="numeric"
            className="w-36 rounded-lg border border-[var(--line)] bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-[var(--muted)]"
          />
          <button onClick={submitZip} className="rounded-lg border border-[var(--line)] bg-bg2 px-3 py-2 text-sm text-ink hover:border-[var(--muted)]">Overlay</button>
          {zip && <button onClick={clearZip} className="mono text-[11px] text-muted hover-line">clear</button>}
        </div>
        {marketName && (
          <p className="mono text-[11px] text-muted">
            Showing <span className="text-ink">{marketName}</span> local signals over the national clock.
            {data?.localCoverage === false && " No local coverage found for this ZIP."}
          </p>
        )}
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted">Reading the cycle…</p>
      ) : err && !data ? (
        <p className="text-sm text-muted">Cycle clock is temporarily unavailable.</p>
      ) : (
        <>
          {leanPhase && (
            <div className="mb-5 rounded-lg border border-[var(--line)] bg-bg2/40 px-5 py-4">
              <p className="kicker mb-1">The weight of signals leans</p>
              <p className="headline text-2xl" style={{ color: leanPhase.txt }}>{leanPhase.label}</p>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">{leanText}</p>
            </div>
          )}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <svg width="440" height="440" viewBox="0 0 440 440" className="mx-auto flex-none">
              {PHASES.map((p) => <path key={p.key} d={arcPath(p.a0, p.a1, R_OUT)} fill={p.tone} fillOpacity={0.16} stroke="#000" strokeOpacity={0.2} />)}
              {Object.values(RINGS).map((r) => <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#fff" strokeOpacity={0.06} />)}
              <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke="#fff" strokeOpacity={0.1} />
              {[0, 90, 180, 270].map((a) => { const [x, y] = polar(a, R_OUT); return <line key={a} x1={CX} y1={CY} x2={x} y2={y} stroke="#fff" strokeOpacity={0.08} />; })}
              {PHASES.map((p) => { const [x, y] = polar((p.a0 + p.a1) / 2, R_OUT + 16); return <text key={p.key} x={x} y={y} fill="#cfd2c8" fontSize={11} letterSpacing="1.5" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono, monospace)">{p.label.toUpperCase()}</text>; })}
              <text x={CX} y={CY + 3} fill="#6f746a" fontSize={13} textAnchor="middle" fontFamily="var(--font-mono, monospace)">◉</text>

              {sel && sel.trail && sel.trail.map((pt, i) => {
                const ring = RINGS[sel.cls];
                const [x, y] = polar(posToAngle(pt.phase, pt.pos), ring);
                let line = null;
                if (i > 0) { const prev = sel.trail[i - 1]; const [px, py] = polar(posToAngle(prev.phase, prev.pos), ring); line = <line x1={px} y1={py} x2={x} y2={y} stroke="#F5B544" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="2 3" />; }
                return <g key={i}>{line}<circle cx={x} cy={y} r={3} fill="#F5B544" fillOpacity={0.15 + i * 0.18} /></g>;
              })}

              {shown.map((ind) => {
                const ring = RINGS[ind.cls];
                const [x, y] = polar(posToAngle(ind.phase, ind.pos), ring);
                const col = CLS_COLOR[ind.cls];
                const id = dotId(ind);
                const isSel = selected === id;
                const isLocal = ind.ring === "local";
                return (
                  <g key={id} style={{ cursor: "pointer" }} onClick={() => setSelected(id)}>
                    {isSel && <circle cx={x} cy={y} r={12} fill="none" stroke={col} strokeOpacity={0.5} />}
                    {/* local dots carry a bright outer ring so "your market" pops */}
                    {isLocal && <circle cx={x} cy={y} r={isSel ? 8 : 7} fill="none" stroke="#fff" strokeOpacity={0.9} strokeWidth={1.5} />}
                    <circle cx={x} cy={y} r={isSel ? 7 : 5.5} fill={col} stroke="#0A0B0A" strokeWidth={1.5} />
                  </g>
                );
              })}
            </svg>

            <div className="flex-1 min-w-[240px]">
              {sel ? (
                <div className="mb-5 rounded-lg border border-[var(--line)] bg-bg/40 p-4">
                  <p className="headline text-lg">{sel.label} {sel.ring === "local" && <span className="mono ml-1 text-[10px] tracking-[0.1em] text-signal">LOCAL · {sel.grain}</span>}</p>
                  <p className="text-2xl font-semibold">{sel.value}<span className="ml-1 text-[13px] text-muted">{sel.unit}</span></p>
                  <p className="mono mt-1 text-[11.5px] text-muted">{CLS_LABEL[sel.cls]} · in <b style={{ color: phaseByKey(sel.phase).txt }}>{phaseByKey(sel.phase).label}</b> · {sel.trajectory} · norm {sel.norm}{sel.unit === "%" || sel.unit.includes("%") ? "" : ""}</p>
                  {sel.trail && sel.trail.length > 1 && (
                    <div className="mt-3 border-t border-[var(--line)]/60 pt-3">
                      <p className="mono mb-1.5 text-[10px] tracking-[0.16em] text-muted">PATH THROUGH THE CYCLE</p>
                      <p className="mono text-[11.5px] leading-relaxed text-muted">
                        {sel.trail.map((t, i) => <span key={i}>{i > 0 && "  →  "}<span className="text-muted/70">{t.label}</span> {phaseByKey(t.phase).label}</span>)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mb-5 text-[12.5px] italic text-muted">Click any dot to see its reading and how it has moved through the cycle. Enter a ZIP above to overlay your market.</p>
              )}

              {[["National", national], ["Local", local]].map(([title, list]) => list.length > 0 && (
                <div key={title} className="mb-3">
                  <p className="mono mb-2 text-[10px] tracking-[0.18em] text-muted">{title.toUpperCase()}</p>
                  <div className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
                    {list.map((ind) => { const id = dotId(ind); return (
                      <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-white/5">
                        <input type="checkbox" checked={!hidden.has(id)} onChange={() => toggle(id)} style={{ accentColor: "#F5B544" }} className="h-3.5 w-3.5" />
                        <span className="h-2 w-2 flex-none rounded-full" style={{ background: CLS_COLOR[ind.cls], boxShadow: ind.ring === "local" ? "0 0 0 1.5px #fff" : "none" }} />
                        <span className="truncate">{ind.label}</span>
                        <span className="ml-auto mono text-[8.5px] tracking-[0.1em] text-muted">{ind.cls.slice(0, 4).toUpperCase()}</span>
                      </label>
                    ); })}
                  </div>
                </div>
              ))}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#F5B544" }} /> Leading</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#5AA9E6" }} /> Coincident</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#8A8F84" }} /> Trailing</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full ring-2 ring-white" style={{ background: "#5AA9E6" }} /> Local (white ring)</span>
              </div>
            </div>
          </div>

          {/* phase scoreboard */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PHASES.map((p) => {
              const ct = phaseCounts[p.key];
              return (
                <div key={p.key} className="rounded-lg border border-[var(--line)] bg-bg2/30 px-3 py-2.5 text-center">
                  <p className="mono text-[9.5px] tracking-[0.14em]" style={{ color: p.txt }}>{p.label.toUpperCase()}</p>
                  <p className="headline text-2xl leading-tight" style={{ color: p.txt }}>{ct.total}</p>
                  <p className="mono text-[9.5px] text-muted">
                    <span style={{ color: "#F5B544" }}>{ct.leading}L</span> · <span style={{ color: "#5AA9E6" }}>{ct.coincident}C</span> · <span style={{ color: "#8A8F84" }}>{ct.trailing}T</span>
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mono mt-5 border-t border-[var(--line)] pt-3 text-[10.5px] leading-relaxed text-muted/80">
            National dots use long-run norms; local dots (white ring) are self-calibrated against each market's own history.
            Level vs. norm sets the phase, quarter-over-quarter direction sets the trajectory.
            {data?.asOf ? ` Latest data through ${String(data.asOf).slice(0, 10)}.` : ""}
          </p>
        </>
      )}
    </div>
  );
}
