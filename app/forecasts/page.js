"use client";

import { useState, useEffect } from "react";
import { Info, Building2, Gauge, Newspaper } from "lucide-react";
import { toneColor } from "@/components/ui";
import { useContent, useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import AskCanary from "@/components/AskCanary";

const SCENARIOS = ["Base Case", "Bull Case", "Bear Case"];
const SCEN_KEY = { "Base Case": "base", "Bull Case": "bull", "Bear Case": "bear" };
const FALLBACK_METRICS = ["Rent Growth", "Vacancy"];

// Four-phase cycle (When-first framework) with behavioral archetypes.
const PHASES = [
  { key: "Recovery", arch: "Irrational Desperation", color: "#5FB97C" },
  { key: "Expansion", arch: "Exuberance", color: "#F5B544" },
  { key: "Hypersupply / Peak", arch: "Denial", color: "#E0843B" },
  { key: "Contraction / Recession", arch: "Fear", color: "#E5634D" },
];

function fmtMonth(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00Z").toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
function fmtYr(d) {
  if (!d) return "";
  return String(new Date(d + "T00:00:00Z").getUTCFullYear());
}

// Anchored scenario cone — real measured history (solid) up to Now, then a modeled
// bull/base/bear fan (rebased to the last real value). History is real data; the
// forward cone is an illustrative model. The two are visually separated by the Now line.
function ConeChart({ history = [], cone, years = [], unit, metric, scenario }) {
  const [hi, setHi] = useState(null); // { seg: "h" | "c", i }
  const w = 1100, h = 340, padL = 48, padR = 20, padT = 22, padB = 34;
  const sel = SCEN_KEY[scenario] || "base";
  const base = cone?.base || [], bull = cone?.bull || [], bear = cone?.bear || [];
  const nH = history.length, nC = base.length;
  if (!nH || !nC) return <p className="mono py-10 text-center text-[12px] text-muted">Loading projection…</p>;

  const midFrac = 0.56;
  const xMid = padL + (w - padL - padR) * midFrac;
  const xH = (i) => padL + (nH === 1 ? 0 : (xMid - padL) * (i / (nH - 1)));
  const xC = (i) => xMid + (nC === 1 ? 0 : (w - padR - xMid) * (i / (nC - 1)));

  const all = [...history.map((p) => p.v), ...base, ...bull, ...bear];
  let lo = Math.min(...all), hiV = Math.max(...all);
  const padY = (hiV - lo) * 0.12 || 1;
  lo -= padY; hiV += padY;
  const y = (v) => padT + ((hiV - v) / (hiV - lo)) * (h - padT - padB);

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, k) => lo + ((hiV - lo) * k) / ticks);
  const histPts = history.map((p, i) => `${xH(i)},${y(p.v)}`).join(" ");
  const linePts = (arr) => arr.map((v, i) => `${xC(i)},${y(v)}`).join(" ");
  const fan = `${bull.map((v, i) => `${xC(i)},${y(v)}`).join(" ")} ${bear.map((v, i) => `${xC(i)},${y(v)}`).reverse().join(" ")}`;
  const selArr = sel === "bull" ? bull : sel === "bear" ? bear : base;
  const selColor = sel === "bull" ? "#5FB97C" : sel === "bear" ? "#E5634D" : "#F5B544";

  let hv = null, hx = null, hy = null, hlab = null, htag = null;
  if (hi) {
    if (hi.seg === "h") { const p = history[hi.i]; hv = p.v; hx = xH(hi.i); hy = y(p.v); hlab = fmtMonth(p.t); htag = "MEASURED"; }
    else { hv = selArr[hi.i]; hx = xC(hi.i); hy = y(hv); hlab = years[hi.i] || `+${hi.i}`; htag = hi.i === 0 ? "NOW" : "MODELED"; }
  }
  const tipW = 188, tipH = 82;
  const tipX = hx == null ? 0 : Math.min(Math.max(hx - tipW / 2, 6), w - tipW - 6);
  const tipY = hy == null ? 0 : Math.max(hy - tipH - 14, 6);
  const slotH = (xMid - padL) / Math.max(nH - 1, 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" onMouseLeave={() => setHi(null)}>
      {gridVals.map((g, k) => (
        <g key={k}>
          <line x1={padL} y1={y(g)} x2={w - padR} y2={y(g)} stroke="rgba(255,255,255,0.05)" />
          <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#797e85" fontFamily="IBM Plex Mono">{g.toFixed(1)}{unit}</text>
        </g>
      ))}

      <line x1={xMid} y1={padT} x2={xMid} y2={h - padB} stroke="#F5B544" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 4" />
      <text x={xMid} y={padT - 7} textAnchor="middle" fontSize="10" fill="#F5B544" fillOpacity="0.85" fontFamily="IBM Plex Mono">NOW</text>

      <polygon points={fan} fill="#F5B544" opacity="0.09" />
      <polyline points={linePts(bull)} fill="none" stroke="#5FB97C" strokeOpacity={sel === "bull" ? 0.95 : 0.4} strokeWidth={sel === "bull" ? 2.4 : 1.4} strokeDasharray="5 4" />
      <polyline points={linePts(bear)} fill="none" stroke="#E5634D" strokeOpacity={sel === "bear" ? 0.95 : 0.4} strokeWidth={sel === "bear" ? 2.4 : 1.4} strokeDasharray="5 4" />
      <polyline points={linePts(base)} fill="none" stroke="#F5B544" strokeOpacity={sel === "base" ? 0.95 : 0.5} strokeWidth={sel === "base" ? 2.4 : 1.6} strokeDasharray="5 4" />

      <polyline points={histPts} fill="none" stroke="#F5B544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      {history.map((p, i) => (
        <rect key={"h" + i} x={xH(i) - slotH / 2} y={padT} width={slotH} height={h - padT - padB} fill="transparent"
          onMouseEnter={() => setHi({ seg: "h", i })} onClick={() => setHi({ seg: "h", i })} style={{ cursor: "pointer" }} />
      ))}
      {selArr.map((v, i) => (
        <g key={"c" + i} onMouseEnter={() => setHi({ seg: "c", i })} onClick={() => setHi({ seg: "c", i })} style={{ cursor: "pointer" }}>
          <circle cx={xC(i)} cy={y(v)} r="14" fill="transparent" />
          <circle cx={xC(i)} cy={y(v)} r={hi && hi.seg === "c" && hi.i === i ? 5 : 3} fill={selColor} />
        </g>
      ))}

      {years.map((yr, i) => (
        <text key={yr + i} x={xC(i)} y={h - padB + 20} textAnchor="middle" fontSize="10" fill={hi && hi.seg === "c" && hi.i === i ? "#F5B544" : "#797e85"} fontFamily="IBM Plex Mono">{yr}</text>
      ))}
      {nH > 0 && <text x={padL} y={h - padB + 20} textAnchor="start" fontSize="10" fill="#797e85" fontFamily="IBM Plex Mono">{fmtYr(history[0].t)}</text>}

      {hi && hv != null && (
        <g style={{ pointerEvents: "none" }}>
          <line x1={hx} y1={padT} x2={hx} y2={h - padB} stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
          <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" fill="#12141a" stroke="rgba(245,181,68,0.35)" />
          <text x={tipX + 14} y={tipY + 22} fontSize="12" fontWeight="700" fill="#e9eaec" fontFamily="Archivo">{hlab}</text>
          <text x={tipX + tipW - 14} y={tipY + 22} textAnchor="end" fontSize="9" fill={htag === "MEASURED" ? "#5FB97C" : htag === "NOW" ? "#F5B544" : "#9aa0a6"} fontFamily="IBM Plex Mono">{htag}</text>
          <text x={tipX + 14} y={tipY + 50} fontSize="22" fontWeight="700" fill="#F5B544" fontFamily="Archivo">{hv.toFixed(1)}{unit}</text>
          <text x={tipX + 14} y={tipY + 70} fontSize="10" fill="#9aa0a6" fontFamily="IBM Plex Mono">{metric}{htag === "MODELED" ? ` · ${scenario.replace(" Case", "")}` : ""}</text>
        </g>
      )}
    </svg>
  );
}

function CycleGauge({ cycle }) {
  const activeIdx = PHASES.findIndex((p) => p.key === cycle.phase);
  return (
    <div className="card mt-8 p-6 md:p-8">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="kicker mb-2 flex items-center gap-2"><Gauge size={12} className="text-signal" /> Cycle Position · When &gt; How</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">{cycle.phase}</h2>
          <p className="mt-1 text-sm text-muted">Dominant behavior: <span className="text-ink">{cycle.archetype}</span></p>
        </div>
        <span className="mono shrink-0 text-[10px] tracking-[0.08em] text-muted">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-up align-middle" />LIVE{cycle.asOf ? ` · ${fmtMonth(cycle.asOf)}` : ""}
        </span>
      </div>

      {/* four-phase track */}
      <div className="relative">
        <div className="flex h-3 overflow-hidden rounded-full">
          {PHASES.map((p, i) => (
            <div key={p.key} style={{ width: "25%", backgroundColor: p.color, opacity: i === activeIdx ? 1 : 0.28 }} />
          ))}
        </div>
        <div className="absolute -top-1.5 flex -translate-x-1/2 flex-col items-center" style={{ left: `${cycle.position}%` }}>
          <div className="h-6 w-0.5 bg-ink" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 mono text-[9px] tracking-[0.06em] text-muted">
        {PHASES.map((p, i) => (
          <span key={p.key} className={`${i === activeIdx ? "text-ink" : ""} ${i === 0 ? "text-left" : i === 3 ? "text-right" : "text-center"}`}>{p.key.split(" ")[0]}</span>
        ))}
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">{cycle.summary}</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {(cycle.pillars || []).map((p) => (
          <div key={p.label} className={`rounded-md border border-[var(--line)] p-3 ${p.live === false ? "opacity-60" : ""}`} style={{ borderLeft: `3px solid ${toneColor(p.tone)}` }}>
            <p className="mono text-[10px] tracking-[0.06em] text-muted">{p.label.toUpperCase()}{p.live === false ? " · PENDING FEED" : ""}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: p.live === false ? "#797e85" : toneColor(p.tone) }}>{p.read}</p>
          </div>
        ))}
      </div>

      {cycle.basis && (
        <p className="mono mt-4 border-t border-[var(--line)] pt-3 text-[10px] leading-relaxed tracking-[0.03em] text-muted">{cycle.basis} Concessions data is not yet wired (RealPage/CoStar/Yardi); phase currently reads from occupancy and rent direction.</p>
      )}
    </div>
  );
}

function driverValue(d) {
  const v = d.value;
  if (d.unit === "$") return `$${Math.round(v).toLocaleString()}`;
  if (d.unit === "%") return `${v.toFixed(1)}%`;
  if (d.unit === "pp") return `${v.toFixed(2)}pp`;
  if (d.unit === "K SAAR") return `${Math.round(v)}K`;
  if (d.unit === "K") return `${(v / 1000).toFixed(1)}M`;
  return v.toFixed(1);
}
function driverChange(d) {
  if (d.yoyPct != null) return `${d.yoyPct >= 0 ? "+" : ""}${d.yoyPct.toFixed(1)}% YoY`;
  if (d.yoy == null) return "";
  if (d.unit === "K") return `${d.yoy >= 0 ? "+" : ""}${Math.round(d.yoy)}K YoY`;
  return `${d.yoy >= 0 ? "+" : ""}${d.yoy.toFixed(2)} YoY`;
}

export default function ForecastsPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "forecasts")) return <ComingSoonInline vertical={vertical} title="Market Forecasts" />;
  return <ForecastsInner />;
}

const REL_META = {
  diverge: { label: "DIVERGE", color: "#F5B544" },
  converge: { label: "CONVERGE", color: "#797e85" },
  partial: { label: "MIXED", color: "#797e85" },
};

// The Brief — the named forecaster's forward call set against the live rent signal.
// v1 source: Marcus & Millichap NMI. Expert lean and live momentum are kept separate, never averaged.
function TheBrief({ brief }) {
  if (!brief || !brief.source) {
    return (
      <div className="card mt-8 p-6">
        <p className="kicker mb-2 flex items-center gap-2"><Newspaper size={12} className="text-signal" /> The Brief</p>
        <p className="mono py-6 text-center text-[12px] text-muted">Loading expert vs. live signal…</p>
      </div>
    );
  }
  const { source, rows = [], counts = {}, signalAsOf } = brief;
  const first = (source.name || "EXPERT").split(" ")[0];

  return (
    <div className="card mt-8 p-6 md:p-8">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <p className="kicker mb-2 flex items-center gap-2"><Newspaper size={12} className="text-signal" /> The Brief · Expert Call vs Live Signal</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">The Brief</h2>
        </div>
        <span className="mono shrink-0 text-[10px] tracking-[0.08em] text-muted">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-up align-middle" />SIGNAL LIVE{signalAsOf ? ` · ${fmtMonth(signalAsOf)}` : ""}
        </span>
      </div>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        How {source.name} ranks each market in its {source.report}, set against what the live rent signal is doing right now.
        Where the two <span className="text-signal">diverge</span>, the institutional forecast and the measured momentum disagree — that gap is the tell.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 mono text-[10px] tracking-[0.06em]">
        {["diverge", "converge", "partial"].map((k) => counts[k] ? (
          <span key={k} className="rounded px-2 py-1" style={{ color: REL_META[k].color, backgroundColor: `${REL_META[k].color}1a` }}>
            {counts[k]} {REL_META[k].label}
          </span>
        ) : null)}
      </div>

      <div className="mt-5 grid grid-cols-[1.5fr_1.1fr_0.9fr_1.1fr] gap-2 pb-2 mono text-[10px] tracking-[0.1em] text-muted">
        <span>MARKET</span>
        <span>{first.toUpperCase()} CALL</span>
        <span className="text-center">READ</span>
        <span className="text-right">LIVE SIGNAL</span>
      </div>

      {rows.map((r) => (
        <div key={r.market} title={`${r.expertSide}; ${r.signalSide}.`} className="grid grid-cols-[1.5fr_1.1fr_0.9fr_1.1fr] items-center gap-2 border-t border-[var(--line)] py-3 text-sm">
          <div>
            <p className="text-ink">{r.market}</p>
            <p className="mono text-[10px] text-muted">NMI #{r.rank}/{r.total}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: toneColor(r.expertLean || "neutral") }} />
            <span className="mono text-[12px]" style={{ color: toneColor(r.expertLean || "neutral") }}>{(r.expertLean || "—").toUpperCase()}</span>
          </div>
          <div className="text-center">
            <span className="mono rounded px-2 py-1 text-[10px] tracking-[0.06em]" style={{ color: REL_META[r.relation].color, backgroundColor: `${REL_META[r.relation].color}1a` }}>
              {REL_META[r.relation].label}
            </span>
          </div>
          <div className="text-right">
            <span className="mono text-[12px]" style={{ color: r.rentYoY == null ? "#797e85" : toneColor(r.signal) }}>
              {r.rentYoY == null ? "—" : `${r.rentYoY >= 0 ? "+" : ""}${r.rentYoY}%`}
            </span>
            <p className="mono text-[10px] text-muted">{r.trend || "—"}</p>
          </div>
        </div>
      ))}

      <p className="mono mt-4 border-t border-[var(--line)] pt-3 text-[10px] leading-relaxed tracking-[0.03em] text-muted">
        {source.name} · {source.mechanism}. Expert call = the source&apos;s forward ranking tier; live signal = current ZORI rent momentum from the Cignal data layer.
        The two are kept separate by design — never averaged. {source.caveats}
      </p>
    </div>
  );
}

function ForecastsInner() {
  const { COPY = {} } = useContent();
  const colLabel = COPY.fcColLabel || "RENT";
  const [sc, setSc] = useState("Base Case");
  const [metric, setMetric] = useState("Rent Growth");
  const [fc, setFc] = useState(null);
  const [brief, setBrief] = useState(null);

  const proj = fc?.projections;
  const projMetrics = proj?.metrics || [];
  const metricList = projMetrics.length ? projMetrics.map((m) => m.key) : FALLBACK_METRICS;
  const activeMetric = metricList.includes(metric) ? metric : metricList[0];
  const pm = projMetrics.find((m) => m.key === activeMetric);

  useEffect(() => {
    let alive = true;
    fetch("/api/forecast").then((r) => r.json()).then((j) => { if (alive && j?.ok) setFc(j); }).catch(() => {});
    // The Brief held for now — fetch disabled. Re-enable with the render to restore.
    // fetch("/api/brief").then((r) => r.json()).then((j) => { if (alive && j?.ok) setBrief(j); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const leading = (fc?.drivers || []).filter((d) => d.kind === "leading");
  const trailing = (fc?.drivers || []).filter((d) => d.kind === "trailing");

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Market Forecasts</h1>
      <p className="mt-3 max-w-2xl text-muted">{COPY.fcSubtitle || "5-year forward projections across leading indicators."}</p>

      {/* Cycle gauge (live centerpiece) */}
      {/* Cycle Position gauge temporarily removed — reconnect once concessions + correct
          indicators are live. To restore: {fc?.cycle && <CycleGauge cycle={fc.cycle} />} */}

      {/* Scenario projection chart */}
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
            {metricList.map((m) => (
              <button key={m} onClick={() => setMetric(m)} className={`mono rounded px-3 py-1.5 text-[12px] ${activeMetric === m ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-ink">{activeMetric} — measured history &amp; 5-year outlook</h2>
            <p className="mono text-[12px] text-muted">Real data through {proj?.asOf ? fmtMonth(proj.asOf) : "—"} · {sc.replace(" Case", "")} scenario highlighted in the forward cone</p>
          </div>
          <span className="mono rounded-sm border border-signal/30 bg-signal/10 px-2.5 py-1 text-[11px] text-signal">MODELED FORECAST</span>
        </div>
        {pm ? (
          <ConeChart history={pm.history} cone={pm.cone} years={pm.years} unit={pm.unit} metric={activeMetric} scenario={sc} />
        ) : (
          <p className="mono py-10 text-center text-[12px] text-muted">Loading live projection…</p>
        )}
        <p className="mono mt-2 text-center text-[11px] text-muted">Solid line = measured history from the Cignal data layer · dashed fan = illustrative model, rebased to the current value · hover to inspect.</p>
      </div>

      {/* Supply pipeline forecast (live) */}
      {fc?.supply?.starts && (
        <div className="card mt-8 p-6">
          <p className="kicker mb-3 flex items-center gap-2"><Building2 size={12} className="text-signal" /> Supply Pipeline · {fc.supply.leadMonths} mo lead</p>
          <div className="grid gap-6 md:grid-cols-[300px_1fr] md:items-center">
            <div className="grid grid-cols-2 gap-3">
              {[["Permits 5+", fc.supply.permits], ["MF Starts", fc.supply.starts]].map(([lbl, m]) => m && (
                <div key={lbl} className="rounded-md border border-[var(--line)] p-3">
                  <p className="mono text-[10px] tracking-[0.06em] text-muted">{lbl.toUpperCase()}</p>
                  <p className="headline mt-1 text-2xl text-ink">{Math.round(m.value)}K</p>
                  <p className="mono text-[11px]" style={{ color: toneColor(m.yoyPct < 0 ? "bull" : "bear") }}>
                    {m.yoyPct >= 0 ? "+" : ""}{m.yoyPct?.toFixed(0)}% YoY{m.z != null ? ` · ${m.z >= 0 ? "+" : ""}${m.z.toFixed(1)}σ` : ""}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-muted">{fc.supply.read}</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Market forward-signal table (live) */}
        <div className="card p-6">
          <h2 className="mb-1 font-semibold text-ink">Market Forward Signal</h2>
          <p className="mono mb-4 text-[10px] tracking-[0.06em] text-muted">LIVE ZORI MOMENTUM · MIGRATION · TIER</p>
          <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.7fr] gap-2 pb-2 mono text-[10px] tracking-[0.1em] text-muted">
            <span>MARKET</span><span>{colLabel} YoY</span><span>TREND</span><span className="text-right">SIGNAL</span>
          </div>
          {(fc?.markets || []).map((m) => (
            <div key={m.city} className="grid grid-cols-[1.4fr_0.8fr_1fr_0.7fr] items-center gap-2 border-t border-[var(--line)] py-2.5 text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: toneColor(m.signal) }} />
                {m.city}{m.migration && <span title="On migration in-flow lists" className="text-up">↑</span>}
                {m.cbsa && <AskCanary variant="icon" question={`How does ${m.city} look right now?`} metro={m.metro || m.city} cbsa={m.cbsa} />}
              </span>
              <span className="mono" style={{ color: m.rentYoY == null ? "#797e85" : toneColor(m.rentYoY >= 0 ? "bull" : "bear") }}>
                {m.rentYoY == null ? "—" : `${m.rentYoY >= 0 ? "+" : ""}${m.rentYoY}%`}
              </span>
              <span className="mono text-[12px] text-muted">{m.trend}</span>
              <span className="text-right"><span className="mono rounded px-2 py-1 text-[11px]" style={{ color: toneColor(m.signal), backgroundColor: `${toneColor(m.signal)}1a` }}>{m.conf}%</span></span>
            </div>
          ))}
          {!fc && <p className="mono py-6 text-center text-[12px] text-muted">Loading live market data…</p>}
        </div>

        {/* Live driver board */}
        <div className="card p-6">
          <h2 className="mb-1 font-semibold text-ink">Key Forecast Drivers</h2>
          <p className="mono mb-4 text-[10px] tracking-[0.06em] text-muted">LIVE · VALUE · YoY · STRETCH (σ)</p>
          {[["LEADING", leading], ["TRAILING / CONFIRMING", trailing]].map(([grp, list]) => list.length > 0 && (
            <div key={grp} className="mb-4">
              <p className="kicker mb-2">{grp}</p>
              <div className="space-y-2">
                {list.map((d) => (
                  <div key={d.slug} className="flex items-center justify-between rounded-md border border-[var(--line)] p-3" style={{ borderLeft: `3px solid ${toneColor(d.tone)}` }}>
                    <div>
                      <p className="text-sm font-semibold text-ink">{d.label}</p>
                      <p className="mono text-[11px] text-muted">{driverChange(d)}{d.z != null ? ` · ${d.z >= 0 ? "+" : ""}${d.z.toFixed(1)}σ` : ""}</p>
                    </div>
                    <p className="mono text-sm" style={{ color: toneColor(d.tone) }}>{driverValue(d)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!fc && <p className="mono py-6 text-center text-[12px] text-muted">Loading live drivers…</p>}
        </div>
      </div>

      {/* The Brief — held for now (M&M-only is too thin a comparison). Component, /api/brief route, and
          expert_sources/expert_picks data are all intact. To restore, uncomment the line below. */}
      {/* <TheBrief brief={brief} /> */}

      <div className="card mt-8 flex items-start gap-3 p-5">
        <Info size={16} className="mt-0.5 shrink-0 text-muted" />
        <p className="text-[12px] leading-relaxed text-muted">
          Cycle position, supply pipeline, and drivers are computed live from the Cignal data layer (FRED + Zillow ZORI, first-print history). The 5-year scenario curves are illustrative model projections. Confidence figures on the scenario chart and market table are provisional. All projections carry inherent uncertainty. Not investment advice. Consult a licensed advisor before making investment decisions based on this data.
        </p>
      </div>
    </div>
  );
}
