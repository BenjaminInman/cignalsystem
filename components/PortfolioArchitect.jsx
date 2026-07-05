"use client";

import { useMemo, useState } from "react";
import { Layers, RotateCcw, ChevronDown } from "lucide-react";

/* ============================================================
   Portfolio Architect — cycle-conditional diversification engine
   Skinned to live Cignal tokens (signal #F5B544, Archivo/IBM Plex Mono).
   Phase model calibrated to the 4-phase framework (see coaching module).
   ============================================================ */

const PHASE_COLOR = {
  recovery: "#5FB97C",     // up green — emerging
  expansion: "#F5B544",    // signal gold — peak strength
  hypersupply: "#E8934B",  // amber — overheating
  recession: "#E5634D",    // down red — contraction
};
const PHASE_LABEL = { recovery: "Recovery", expansion: "Expansion", hypersupply: "Hyper Supply", recession: "Recession" };

// Core / Value-add / Opportunistic — mid-phase base
const STRAT = {
  recovery: { core: 20, va: 45, opp: 35 }, expansion: { core: 40, va: 40, opp: 20 },
  hypersupply: { core: 65, va: 25, opp: 10 }, recession: { core: 55, va: 20, opp: 25 },
};
// intra-phase glide: early leans toward the phase behind; late leans toward the phase ahead
const INTRA = {
  recovery: { early: { core: -5, va: 0, opp: 5 }, late: { core: 8, va: 2, opp: -10 } },
  expansion: { early: { core: -8, va: 3, opp: 5 }, late: { core: 10, va: -2, opp: -8 } },
  hypersupply: { early: { core: -8, va: 5, opp: 3 }, late: { core: 8, va: -5, opp: -3 } },
  recession: { early: { core: 10, va: -3, opp: -7 }, late: { core: -12, va: 2, opp: 10 } },
};
const RISKD = { conservative: { core: 15, va: -5, opp: -10 }, balanced: { core: 0, va: 0, opp: 0 }, aggressive: { core: -15, va: 5, opp: 10 } };
const CLASSMIX = {
  recovery: { A: 20, B: 40, C: 40 }, expansion: { A: 35, B: 40, C: 25 },
  hypersupply: { A: 20, B: 45, C: 35 }, recession: { A: 15, B: 45, C: 40 },
};
const VINT = {
  recovery: { neu: 20, mid: 40, old: 40 }, expansion: { neu: 35, mid: 40, old: 25 },
  hypersupply: { neu: 45, mid: 35, old: 20 }, recession: { neu: 25, mid: 40, old: 35 },
};
const SIZE = {
  recovery: { sm: 35, md: 40, lg: 25 }, expansion: { sm: 30, md: 40, lg: 30 },
  hypersupply: { sm: 25, md: 40, lg: 35 }, recession: { sm: 30, md: 40, lg: 30 },
};
const POSTURE = {
  recovery: { ltv: "65–75%", ltvnote: "lock long fixed-rate", powder: { early: 3, mid: 5, late: 8 }, deploy: { early: "Front-load hard", mid: "Aggressive", late: "Aggressive, selective" } },
  expansion: { ltv: "60–65%", ltvnote: "hold neutral", powder: { early: 6, mid: 8, late: 12 }, deploy: { early: "Buy selectively", mid: "Moderate", late: "Slow — raise discipline" } },
  hypersupply: { ltv: "50–60%", ltvnote: "extend maturities now", powder: { early: 15, mid: 20, late: 25 }, deploy: { early: "Turn net seller", mid: "Minimal buys", late: "Net seller — sell strength" } },
  recession: { ltv: "45–55%", ltvnote: "keep liquidity high", powder: { early: 22, mid: 18, late: 10 }, deploy: { early: "Preserve capital", mid: "Selective distress", late: "Accelerate into distress" } },
};
const RATIONALE = {
  recovery: { lead: "Basis is low and distress is on the table. The Architect tilts you toward value-add and opportunistic plays in workforce B/C, weighted to older and mid-vintage assets you can reposition.", tail: "Lever up into long fixed-rate debt, spend accumulated dry powder, and stagger entries to start a fresh vintage ladder before consensus confirms the recovery." },
  expansion: { lead: "Business plans are converting to durable NOI. The blueprint balances toward stabilizing Core while still holding meaningful value-add, across a healthy quality spread.", tail: "Hold leverage neutral, begin rebuilding dry powder, and tighten underwriting — rising permits are already pre-loading the next oversupply." },
  hypersupply: { lead: "New supply is landing. The Architect shifts you defensive: heavier Core and workforce B/C, newer stabilized vintage, larger resilient assets — and trims opportunistic risk.", tail: "Sell stabilized Class A into the bid, de-lever, extend near-term maturities now, and stockpile dry powder as a call option on the coming trough." },
  recession: { lead: "Demand compresses to its floor. The blueprint anchors in workforce and affordable B/C for cash-flow resilience, keeps quality, and holds leverage low.", tail: "Preserve capital first, pre-position for forced-seller flow, then deploy powder into distress as it prices through — bridging you into the next Recovery." },
};

const SEG1 = "#F5B544", SEG2 = "#4F9E8C", SEG3 = "#CF7B4E";
const STRAT_LABEL = { core: "Core", va: "Value-add", opp: "Opportunistic" };
const STRAT_COLOR = { core: SEG2, va: SEG1, opp: SEG3 };
const YEAR = new Date().getFullYear();

// ---------- pure helpers ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function normalize(o) { const out = {}; let t = 0; for (const k in o) { o[k] = Math.max(0, o[k]); t += o[k]; } for (const k in o) out[k] = t ? Math.round(o[k] / t * 100) : 0; const keys = Object.keys(out); const sum = keys.reduce((a, k) => a + out[k], 0); if (sum !== 100 && keys.length) out[keys[0]] += 100 - sum; return out; }
function countsFromMix(mix, n) { const keys = Object.keys(mix); const raw = keys.map((k) => ({ k, f: mix[k] / 100 * n })); const out = {}; let used = 0; raw.forEach((x) => { out[x.k] = Math.floor(x.f); used += out[x.k]; }); let rem = n - used; raw.sort((a, b) => (b.f - Math.floor(b.f)) - (a.f - Math.floor(a.f))); for (let i = 0; i < rem; i++) out[raw[i % raw.length].k]++; return out; }
function pick(rng, weights) { const t = weights.reduce((a, x) => a + x[1], 0); let r = rng() * t; for (let i = 0; i < weights.length; i++) { r -= weights[i][1]; if (r <= 0) return weights[i][0]; } return weights[weights.length - 1][0]; }
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const CLASS_BY_STRAT = { core: [["A", 50], ["B", 40], ["C", 10]], va: [["A", 15], ["B", 50], ["C", 35]], opp: [["A", 10], ["B", 40], ["C", 50]] };
const VINT_BY_STRAT = { core: [["neu", 55], ["mid", 35], ["old", 10]], va: [["neu", 10], ["mid", 50], ["old", 40]], opp: [["neu", 5], ["mid", 35], ["old", 60]] };
function vintageYear(v, rng) { if (v === "neu") return YEAR - 2 - Math.floor(rng() * 10); if (v === "mid") return 1996 + Math.floor(rng() * 16); return 1965 + Math.floor(rng() * 27); }
function sizeUnits(sz, rng) { if (sz === "sm") return 20 + Math.floor(rng() * 30); if (sz === "md") return 60 + Math.floor(rng() * 80); return 160 + Math.floor(rng() * 200); }

function strategyMix(phase, position, risk) {
  const b = STRAT[phase], d = RISKD[risk]; let g = { core: 0, va: 0, opp: 0 };
  if (position === "early") g = INTRA[phase].early; else if (position === "late") g = INTRA[phase].late;
  return normalize({ core: b.core + g.core + d.core, va: b.va + g.va + d.va, opp: b.opp + g.opp + d.opp });
}

function buildModel(s) {
  const sMix = strategyMix(s.phase, s.position, s.risk);
  const cMix = normalize({ ...CLASSMIX[s.phase] });
  const vMix = normalize({ ...VINT[s.phase] });
  const zMix = normalize({ ...SIZE[s.phase] });

  // geography
  let geoLabel, subs;
  if (s.mode === "A") {
    geoLabel = (s.city || "Market").trim() + (s.stateAbbr ? ", " + s.stateAbbr.trim().toUpperCase() : "");
    subs = ["Core / Downtown", "North", "East", "South", "West Suburb"];
  } else {
    const names = (s.marketnames || "").split(",").map((x) => x.trim()).filter(Boolean);
    subs = []; for (let i = 0; i < s.nmarkets; i++) subs.push(names[i] || ("Market " + (i + 1)));
    geoLabel = subs.join(" · ");
  }

  const rng = mulberry32(hashStr([s.mode, s.phase, s.position, s.risk, s.units, s.holdings, s.city, s.stateAbbr, s.nmarkets, s.marketnames, s.seed].join("|")));
  const n = s.holdings, total = s.units;
  const stratCounts = countsFromMix(sMix, n);
  const ladderYears = Math.min(3, n);

  let seq = [];
  ["core", "va", "opp"].forEach((k) => { for (let i = 0; i < (stratCounts[k] || 0); i++) seq.push(k); });
  for (let i = seq.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = seq[i]; seq[i] = seq[j]; seq[j] = t; }

  let holdings = seq.map((stg, i) => {
    const cls = pick(rng, CLASS_BY_STRAT[stg]);
    const vk = pick(rng, VINT_BY_STRAT[stg]);
    const sz = pick(rng, [["sm", zMix.sm], ["md", zMix.md], ["lg", zMix.lg]]);
    return { stg, cls, vk, vyear: vintageYear(vk, rng), sz, rawUnits: sizeUnits(sz, rng), loc: subs[i % subs.length], year: (i % ladderYears) + 1 };
  });
  const rawSum = holdings.reduce((a, h) => a + h.rawUnits, 0) || 1;
  const f = total / rawSum; let running = 0;
  holdings.forEach((h, i) => { if (i === holdings.length - 1) h.units = Math.max(5, total - running); else { h.units = Math.max(5, Math.round(h.rawUnits * f / 5) * 5); running += h.units; } });
  const ord = { core: 0, va: 1, opp: 2 };
  holdings.sort((a, b) => a.year - b.year || ord[a.stg] - ord[b.stg]);

  // ladder
  const byYear = {}; for (let y = 1; y <= ladderYears; y++) byYear[y] = { c: 0, u: 0 };
  holdings.forEach((h) => { byYear[h.year].c++; byYear[h.year].u += h.units; });

  // posture
  const p = POSTURE[s.phase];
  const pnote = s.phase === "hypersupply" ? "building — call option on distress"
    : s.phase === "recession" ? (s.position === "late" ? "deploying into distress" : "holding for the trough")
    : (s.position === "late" ? "rebuilding" : "of capital held back");
  const posture = { ltv: p.ltv, ltvnote: p.ltvnote, powder: p.powder[s.position], powderNote: pnote, deploy: p.deploy[s.position] };

  return { sMix, cMix, vMix, zMix, holdings, geoLabel, byYear, ladderYears, posture, total, n };
}

// ---------- small view helpers ----------
function Bar({ mix, segs }) {
  return (
    <>
      <div className="pa-bar">
        {segs.map((s) => { const w = mix[s.key] || 0; return w > 0 ? (
          <span key={s.key} style={{ width: w + "%", background: s.color }}>{w >= 9 ? w + "%" : ""}</span>
        ) : null; })}
      </div>
      <div className="pa-legend">
        {segs.map((s) => (
          <span key={s.key} className="pa-lg"><i style={{ background: s.color }} />{s.label} · {mix[s.key] || 0}%</span>
        ))}
      </div>
    </>
  );
}
function BpRow({ title, note, children }) {
  return (
    <div className="pa-bprow">
      <div className="pa-bphead"><span className="pa-bpt">{title}</span><span className="pa-bpn">{note}</span></div>
      {children}
    </div>
  );
}
function Dial({ label, value, note }) {
  return (
    <div className="pa-dial">
      <div className="pa-dv">{value}</div>
      <div className="pa-dl">{label}</div>
      <div className="pa-dx">{note}</div>
    </div>
  );
}

// ---------- main component ----------
export default function PortfolioArchitect({ properties = [] }) {
  const [mode, setMode] = useState("A");
  const [phase, setPhase] = useState("expansion");
  const [position, setPosition] = useState("mid");
  const [risk, setRisk] = useState("balanced");
  const [units, setUnits] = useState(750);
  const [holdings, setHoldings] = useState(7);
  const [city, setCity] = useState("Nashville");
  const [stateAbbr, setStateAbbr] = useState("TN");
  const [nmarkets, setNmarkets] = useState(3);
  const [marketnames, setMarketnames] = useState("Nashville TN, Columbus OH, Raleigh NC");
  const [seed, setSeed] = useState(1);
  const [current, setCurrent] = useState([]);
  const [rxStrategy, setRxStrategy] = useState("core");
  const [rxClass, setRxClass] = useState("A");
  const [rxUnits, setRxUnits] = useState(100);

  // real tracked properties -> restructure input
  const trackable = useMemo(() => {
    const eligible = [], missing = [];
    (properties || []).forEach((p) => {
      const units = Number(p.unit_count) || 0;
      if (p.strategy && units > 0) eligible.push({ stg: p.strategy, cls: p.class || "—", units, market: [p.city, p.state].filter(Boolean).join(", ") || "—", name: p.name, real: true });
      else missing.push(p);
    });
    return { eligible, missing };
  }, [properties]);
  const loadPortfolio = () => { if (trackable.eligible.length) setCurrent(trackable.eligible); };

  const byMarket = useMemo(() => {
    const withMkt = current.filter((h) => h.market && h.market !== "—");
    if (!withMkt.length) return null;
    const groups = {};
    withMkt.forEach((h) => { const k = h.market; if (!groups[k]) groups[k] = { units: 0, core: 0, va: 0, opp: 0, n: 0 }; groups[k].units += h.units; groups[k][h.stg] += h.units; groups[k].n++; });
    return Object.entries(groups).map(([market, g]) => ({ market, units: g.units, n: g.n,
      mix: { core: Math.round(g.core / g.units * 100), va: Math.round(g.va / g.units * 100), opp: Math.round(g.opp / g.units * 100) } }))
      .sort((a, b) => b.units - a.units);
  }, [current]);

  const M = useMemo(() => buildModel({ mode, phase, position, risk, units, holdings, city, stateAbbr, nmarkets, marketnames, seed }),
    [mode, phase, position, risk, units, holdings, city, stateAbbr, nmarkets, marketnames, seed]);

  const pc = PHASE_COLOR[phase];
  const rat = RATIONALE[phase];
  const modeline = mode === "A"
    ? <>You&apos;re concentrating in <b>{M.geoLabel}</b>, so the Architect diversifies <i>within</i> it — spreading quality, vintage, size, and submarket so a single-vintage or single-class shock can&apos;t sink the book.</>
    : <>You&apos;re staying all-multifamily but spreading across <b>{M.geoLabel}</b> — diversifying the demand driver, vintage, and size so you don&apos;t own one bet several times.</>;
  const posHint = { early: "Just entered the phase — posture leans back toward the phase behind it.", mid: "Squarely in the phase — the baseline complexion.", late: "Approaching the turn — posture leans toward the phase ahead." }[position];

  // restructure gap
  const gap = useMemo(() => {
    if (!current.length) return null;
    const tot = current.reduce((a, h) => a + h.units, 0) || 1;
    const cur = { core: 0, va: 0, opp: 0 }; current.forEach((h) => { cur[h.stg] += h.units; });
    return [["core", "Core"], ["va", "Value-add"], ["opp", "Opportunistic"]].map(([k, label]) => {
      const c = Math.round(cur[k] / tot * 100), t = M.sMix[k] || 0, d = c - t;
      const kind = Math.abs(d) <= 4 ? "ok" : d > 0 ? "over" : "under";
      const word = Math.abs(d) <= 4 ? "On target" : d > 0 ? "Over-weight — trim / sell into strength" : "Under-weight — direct new capital here";
      const deltaU = Math.round(Math.abs(d) / 100 * tot);
      const note = Math.abs(d) <= 4 ? "" : d > 0 ? ` (~${deltaU} units heavy)` : ` (~${deltaU} units to add)`;
      return { label, c, t, kind, word, note };
    });
  }, [current, M.sMix]);

  const btn = (active) => "pa-opt" + (active ? " pa-opt-on" : "");

  return (
    <section className="pa-root">
      <div className="mb-6 flex items-center gap-2.5">
        <Layers size={15} className="text-signal" />
        <p className="kicker">Diversification Engine</p>
      </div>
      <h2 className="headline text-2xl text-ink md:text-3xl">Portfolio Architect</h2>
      <p className="mono mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
        Set your parameters and the Architect returns a diversification blueprint — how to spread holdings across quality, vintage, size, and geography — tilted by where we are in the market cycle. Structure a new book or re-balance an existing one.
      </p>

      <div className="pa-grid mt-7">
        {/* CONTROLS */}
        <aside className="pa-controls">
          <p className="kicker mb-1">Your Parameters</p>
          <p className="mono mb-5 text-[11px] italic text-muted">Everything updates live.</p>

          <div className="pa-field">
            <span className="pa-lbl">Strategy Mode</span>
            <div className="grid grid-cols-2 gap-2">
              <button className={"pa-mode" + (mode === "A" ? " pa-mode-on" : "")} onClick={() => setMode("A")}>
                <span className="pa-mt">Mode A</span><span className="pa-mn">Single-Market Depth</span>
              </button>
              <button className={"pa-mode" + (mode === "B" ? " pa-mode-on" : "")} onClick={() => setMode("B")}>
                <span className="pa-mt">Mode B</span><span className="pa-mn">Multifamily Spread</span>
              </button>
            </div>
            <p className="pa-hint">{mode === "A" ? "Locked to one market. Diversify across quality, age, size & submarket." : "All multifamily. Diversify across markets, age & size."}</p>
          </div>

          {mode === "A" ? (
            <div className="pa-field">
              <span className="pa-lbl">Target Market</span>
              <div className="grid grid-cols-2 gap-2.5">
                <input className="pa-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                <input className="pa-input" value={stateAbbr} maxLength={2} onChange={(e) => setStateAbbr(e.target.value)} placeholder="State" />
              </div>
            </div>
          ) : (
            <div className="pa-field">
              <span className="pa-lbl">Markets to spread across</span>
              <div className="flex items-center gap-3">
                <input type="range" min="2" max="5" value={nmarkets} onChange={(e) => setNmarkets(+e.target.value)} style={{ flex: 1, accentColor: "#F5B544" }} />
                <span className="pa-rv">{nmarkets}</span>
              </div>
              <input className="pa-input mt-2.5" value={marketnames} onChange={(e) => setMarketnames(e.target.value)} placeholder="Optional: name them, comma-separated" />
            </div>
          )}

          <div className="pa-field">
            <span className="pa-lbl">Market Phase</span>
            <div className="grid grid-cols-2 gap-1.5">
              {["recovery", "expansion", "hypersupply", "recession"].map((ph) => (
                <button key={ph} className={btn(phase === ph)} style={phase === ph ? { borderColor: PHASE_COLOR[ph], color: "#ECEDEF", background: PHASE_COLOR[ph] + "1f" } : {}} onClick={() => setPhase(ph)}>
                  <i className="pa-pdot" style={{ background: PHASE_COLOR[ph] }} />{PHASE_LABEL[ph]}
                </button>
              ))}
            </div>
            <p className="pa-hint">In production this reads live from your Signal Dashboard. Override it here to model any phase.</p>
          </div>

          <div className="pa-field">
            <span className="pa-lbl">Phase Position <span className="opacity-60">· where in the phase</span></span>
            <div className="grid grid-cols-3 gap-1.5">
              {["early", "mid", "late"].map((p) => (
                <button key={p} className={btn(position === p)} onClick={() => setPosition(p)}>{cap(p)}</button>
              ))}
            </div>
            <p className="pa-hint">{posHint}</p>
          </div>

          <div className="pa-field">
            <span className="pa-lbl">Risk Posture <span className="opacity-60">· your seat on the frontier</span></span>
            <div className="grid grid-cols-3 gap-1.5">
              {[["conservative", "Conserv."], ["balanced", "Balanced"], ["aggressive", "Aggressive"]].map(([r, l]) => (
                <button key={r} className={btn(risk === r)} onClick={() => setRisk(r)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="pa-field">
            <span className="pa-lbl">Target Total Units</span>
            <div className="flex items-center gap-3">
              <input type="range" min="100" max="3000" step="50" value={units} onChange={(e) => setUnits(+e.target.value)} style={{ flex: 1, accentColor: "#F5B544" }} />
              <span className="pa-rv">{units.toLocaleString()}</span>
            </div>
          </div>

          <div className="pa-field">
            <span className="pa-lbl">Number of Holdings</span>
            <div className="flex items-center gap-3">
              <input type="range" min="3" max="14" value={holdings} onChange={(e) => setHoldings(+e.target.value)} style={{ flex: 1, accentColor: "#F5B544" }} />
              <span className="pa-rv">{holdings}</span>
            </div>
          </div>

          <button className="pa-regen" onClick={() => setSeed((s) => s + 1)}>
            <RotateCcw size={13} /> Regenerate alternative
          </button>
        </aside>

        {/* RESULTS */}
        <div className="min-w-0">
          {/* summary */}
          <div className="pa-summary">
            <div className="pa-stat"><div className="pa-sv">{M.total.toLocaleString()}</div><div className="pa-sl">Total Units</div><div className="pa-sx">across {M.n} holdings</div></div>
            <div className="pa-stat"><div className="pa-sv">{M.n}</div><div className="pa-sl">Holdings</div><div className="pa-sx">~{Math.round(M.total / M.n)} units avg</div></div>
            <div className="pa-stat"><div className="pa-sv" style={{ color: pc }}>{PHASE_LABEL[phase]}</div><div className="pa-sl">Cycle Phase</div><div className="pa-sx">{cap(position)} · {cap(risk)}</div></div>
            <div className="pa-stat"><div className="pa-sv">{mode === "A" ? "1 metro" : nmarkets + " mkts"}</div><div className="pa-sl">Geography</div><div className="pa-sx">{mode === "A" ? "single-market depth" : "multifamily spread"}</div></div>
          </div>

          {/* rationale */}
          <div className="pa-card pa-rationale" style={{ "--pc": pc }}>
            <div className="pa-ptag" style={{ color: pc }}><i style={{ background: pc }} />{PHASE_LABEL[phase]} · {position} · {risk}</div>
            <p>{rat.lead}</p>
            <p className="pa-dim">{rat.tail}</p>
            {position !== "mid" && (
              <p className="pa-dim"><b>{position === "early" ? "Early in the phase." : "Late in the phase."}</b> {position === "early" ? "The full tilt hasn't arrived — the mix still carries momentum from the phase behind it." : "Position ahead of the turn — the mix is already leaning toward what the next phase will demand."}</p>
            )}
            <p className="pa-dim">{modeline}</p>
          </div>

          {/* blueprint */}
          <div className="pa-card">
            <h3 className="pa-h3">Target Blueprint</h3>
            <p className="pa-ch">Your recommended diversification across the four structural axes, tilted to the selected phase.</p>
            <BpRow title="Strategy" note="Core / Value-add / Opportunistic"><Bar mix={M.sMix} segs={[{ key: "core", label: "Core", color: SEG2 }, { key: "va", label: "Value-add", color: SEG1 }, { key: "opp", label: "Opportunistic", color: SEG3 }]} /></BpRow>
            <BpRow title="Asset Class" note="A / B / C (workforce)"><Bar mix={M.cMix} segs={[{ key: "A", label: "Class A", color: SEG1 }, { key: "B", label: "Class B", color: SEG2 }, { key: "C", label: "Class C", color: SEG3 }]} /></BpRow>
            <BpRow title="Vintage" note="Age of asset"><Bar mix={M.vMix} segs={[{ key: "neu", label: "New (0–12y)", color: SEG1 }, { key: "mid", label: "Mid (12–30y)", color: SEG2 }, { key: "old", label: "Older (30y+)", color: SEG3 }]} /></BpRow>
            <BpRow title="Property Size" note="Unit count per asset"><Bar mix={M.zMix} segs={[{ key: "sm", label: "Small (5–49)", color: SEG2 }, { key: "md", label: "Mid (50–149)", color: SEG1 }, { key: "lg", label: "Large (150+)", color: SEG3 }]} /></BpRow>
          </div>

          {/* posture */}
          <div className="pa-card">
            <h3 className="pa-h3">Capital Posture</h3>
            <p className="pa-ch">The three dials you turn without touching a building — leverage, liquidity, and pace. These glide with phase position.</p>
            <div className="pa-posture">
              <Dial label="Target LTV" value={M.posture.ltv} note={M.posture.ltvnote} />
              <Dial label="Dry Powder" value={M.posture.powder + "%"} note={M.posture.powderNote} />
              <Dial label="Deployment" value={M.posture.deploy} note={cap(position) + "-phase pace"} />
            </div>
          </div>

          {/* holdings */}
          <div className="pa-card">
            <h3 className="pa-h3">Suggested Holdings</h3>
            <p className="pa-ch">One concrete structure that satisfies the blueprint. Regenerate for alternatives.</p>
            <div className="pa-tscroll">
              <table className="pa-table">
                <thead><tr><th>#</th><th>Strategy</th><th>Class</th><th>Vintage</th><th>Units</th><th>{mode === "A" ? "Submarket" : "Market"}</th><th>Acquire</th></tr></thead>
                <tbody>
                  {M.holdings.map((h, i) => {
                    const vlabel = h.vk === "neu" ? "New" : h.vk === "mid" ? "Mid" : "Older";
                    return (
                      <tr key={i}>
                        <td className="pa-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ color: STRAT_COLOR[h.stg], fontWeight: 600, fontSize: 11, letterSpacing: ".04em" }}>{STRAT_LABEL[h.stg]}</td>
                        <td><span className="pa-chip">Class {h.cls}</span></td>
                        <td className="pa-dimc">{h.vyear} <span style={{ color: "#5a6068" }}>· {vlabel}</span></td>
                        <td style={{ color: "#ECEDEF" }}>{h.units.toLocaleString()}</td>
                        <td className="pa-dimc">{h.loc}</td>
                        <td style={{ color: "#F5B544" }}>Yr {h.year}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ladder */}
          <div className="pa-card">
            <h3 className="pa-h3">Acquisition Ladder</h3>
            <p className="pa-ch">Stagger entries across cycle years so you don&apos;t buy the whole book at one point — your version of dollar-cost averaging.</p>
            <div className="pa-ladder">
              {Object.keys(M.byYear).map((y) => {
                const b = M.byYear[y];
                const maxU = Math.max(...Object.keys(M.byYear).map((k) => M.byYear[k].u), 1);
                return (
                  <div key={y} className="pa-lyr">
                    <div className="pa-ly">Year {y}</div>
                    <div className="pa-lc">{b.c}</div>
                    <div className="pa-lu">{b.u.toLocaleString()} units</div>
                    <div className="pa-lbar" style={{ width: (b.u / maxU * 100) + "%" }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* restructure */}
          <details className="pa-card pa-rx">
            <summary>
              <div>
                <div className="pa-h3" style={{ margin: 0 }}>Re-structure an existing book</div>
                <div className="pa-ch" style={{ margin: "2px 0 0" }}>Pull in your tracked properties (or add holdings manually) to see where you&apos;re over- or under-weight versus the cycle-optimal target — overall and by market.</div>
              </div>
              <ChevronDown size={18} className="pa-caret text-muted" />
            </summary>
            <div className="pa-rxbody">
              {properties && properties.length > 0 && (
                <div className="pa-load">
                  <button className="pa-loadbtn" onClick={loadPortfolio} disabled={!trackable.eligible.length}>
                    ↓ Load my tracked portfolio ({trackable.eligible.length})
                  </button>
                  {trackable.missing.length > 0 && (
                    <p className="pa-warn">{trackable.missing.length} propert{trackable.missing.length === 1 ? "y" : "ies"} missing a strategy tag — set Core / Value-add / Opportunistic on the property above to include {trackable.missing.length === 1 ? "it" : "them"}.</p>
                  )}
                </div>
              )}

              <div className="pa-rxadd">
                <label><span className="pa-lbl">Strategy</span>
                  <select className="pa-input" value={rxStrategy} onChange={(e) => setRxStrategy(e.target.value)}>
                    <option value="core">Core</option><option value="va">Value-add</option><option value="opp">Opportunistic</option>
                  </select>
                </label>
                <label><span className="pa-lbl">Class</span>
                  <select className="pa-input" value={rxClass} onChange={(e) => setRxClass(e.target.value)}>
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                  </select>
                </label>
                <label><span className="pa-lbl">Units</span>
                  <input type="number" className="pa-input" min="1" value={rxUnits} onChange={(e) => setRxUnits(e.target.value)} />
                </label>
                <button className="pa-add" onClick={() => { const u = parseInt(rxUnits, 10); if (u > 0) setCurrent((c) => [...c, { stg: rxStrategy, cls: rxClass, units: u }]); }}>+ Add</button>
              </div>

              {current.length > 0 && (
                <>
                  <ul className="pa-rxlist">
                    {current.map((h, i) => (
                      <li key={i}>
                        <span>
                          {h.name ? <b style={{ color: "#ECEDEF" }}>{h.name} · </b> : null}
                          {STRAT_LABEL[h.stg]} · Class {h.cls} · <b style={{ color: "#ECEDEF" }}>{h.units.toLocaleString()}</b> units
                          {h.market && h.market !== "—" ? <span style={{ color: "#5a6068" }}> · {h.market}</span> : null}
                        </span>
                        <button className="pa-del" onClick={() => setCurrent((c) => c.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                      </li>
                    ))}
                  </ul>
                  <button className="pa-clear" onClick={() => setCurrent([])}>Clear all</button>
                </>
              )}

              {!gap ? (
                <p className="mono text-[12px] italic text-muted">Add your current holdings above to see over/under-weights versus this target.</p>
              ) : (
                <div>
                  {gap.map((g, i) => (
                    <div key={i} className="pa-gaprow">
                      <span className="pa-gl">{g.label}</span>
                      <span className="pa-mini">now {g.c}% <span style={{ color: "#5a6068" }}>→</span> target {g.t}%</span>
                      <span className="pa-act" style={{ color: g.kind === "over" ? "#E5634D" : g.kind === "under" ? "#5FB97C" : "#797E85" }}><b>{g.word}</b>{g.note}</span>
                    </div>
                  ))}
                </div>
              )}

              {byMarket && (
                <div className="pa-mkt">
                  <p className="pa-lbl" style={{ marginTop: 18, marginBottom: 10 }}>By market</p>
                  {byMarket.map((m, i) => (
                    <div key={i} className="pa-mktrow">
                      <div className="pa-mkthead">
                        <span className="pa-mktname">{m.market}</span>
                        <span className="pa-mktu">{m.units.toLocaleString()} units · {m.n} {m.n === 1 ? "asset" : "assets"}</span>
                      </div>
                      <div className="pa-bar" style={{ height: 18 }}>
                        {m.mix.core > 0 && <span style={{ width: m.mix.core + "%", background: SEG2 }}>{m.mix.core >= 14 ? m.mix.core + "%" : ""}</span>}
                        {m.mix.va > 0 && <span style={{ width: m.mix.va + "%", background: SEG1 }}>{m.mix.va >= 14 ? m.mix.va + "%" : ""}</span>}
                        {m.mix.opp > 0 && <span style={{ width: m.mix.opp + "%", background: SEG3 }}>{m.mix.opp >= 14 ? m.mix.opp + "%" : ""}</span>}
                      </div>
                    </div>
                  ))}
                  <p className="pa-mkthint">Core, Value-add, Opportunistic by market. Compare each against the blueprint above to spot geographic concentration.</p>
                </div>
              )}
            </div>
          </details>

          <p className="mono mt-4 text-[10px] leading-relaxed text-muted">
            Educational tool. Blueprints, holdings, and vintages are illustrative structuring recommendations generated from your parameters and the selected cycle phase — not investment, legal, tax, or financial advice, and not a recommendation for any specific property, market, or investor. Cycle timing informs probability, not certainty. Conduct your own underwriting and consult qualified professionals before acting.
          </p>
        </div>
      </div>

      <style jsx>{`
        .pa-root { --pc: #F5B544; }
        .pa-grid { display: grid; grid-template-columns: 320px 1fr; gap: 22px; align-items: start; }
        @media (max-width: 900px) { .pa-grid { grid-template-columns: 1fr; } }

        .pa-controls { position: sticky; top: 84px; background: #0e0f11; border: 1px solid var(--line); border-radius: 10px; padding: 18px; }
        @media (max-width: 900px) { .pa-controls { position: static; } }
        .pa-field { margin-bottom: 16px; }
        .pa-lbl { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #797E85; margin-bottom: 7px; }
        .pa-hint { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; line-height: 1.45; color: #5a6068; margin-top: 7px; font-style: italic; }
        .pa-input { width: 100%; background: #08090A; border: 1px solid var(--line-strong, rgba(255,255,255,.12)); border-radius: 4px; padding: .5rem .65rem; font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #ECEDEF; outline: none; }
        .pa-input:focus { border-color: #F5B544; }

        .pa-mode { border: 1px solid var(--line-strong, rgba(255,255,255,.12)); background: #08090A; border-radius: 7px; padding: 10px; cursor: pointer; text-align: left; transition: .15s; }
        .pa-mode:hover { border-color: rgba(245,181,68,.5); }
        .pa-mode-on { border-color: #F5B544; background: rgba(245,181,68,.1); }
        .pa-mt { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #797E85; }
        .pa-mode-on .pa-mt { color: #F5B544; }
        .pa-mn { display: block; font-size: 12.5px; color: #ECEDEF; margin-top: 2px; line-height: 1.2; }

        .pa-opt { border: 1px solid var(--line-strong, rgba(255,255,255,.12)); background: #08090A; border-radius: 6px; padding: 8px 6px; cursor: pointer; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: .04em; color: #A7ADB4; transition: .15s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .pa-opt:hover { border-color: rgba(245,181,68,.4); }
        .pa-opt-on { border-color: #F5B544; color: #ECEDEF; background: rgba(245,181,68,.1); }
        .pa-pdot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
        .pa-rv { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #F5B544; min-width: 48px; text-align: right; }

        .pa-regen { width: 100%; margin-top: 4px; background: transparent; color: #A7ADB4; border: 1px solid var(--line-strong, rgba(255,255,255,.12)); border-radius: 6px; padding: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: .15s; }
        .pa-regen:hover { border-color: rgba(245,181,68,.5); color: #ECEDEF; }

        .pa-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
        @media (max-width: 640px) { .pa-summary { grid-template-columns: repeat(2, 1fr); } }
        .pa-stat { background: #0e0f11; border: 1px solid var(--line); border-radius: 9px; padding: 13px 15px; }
        .pa-sv { font-family: 'Archivo', sans-serif; font-weight: 800; letter-spacing: -.02em; font-size: 22px; color: #F5B544; line-height: 1; }
        .pa-sl { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: #5a6068; margin-top: 7px; }
        .pa-sx { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #797E85; margin-top: 3px; }

        .pa-card { background: #0e0f11; border: 1px solid var(--line); border-radius: 10px; padding: 20px; margin-bottom: 18px; }
        .pa-h3 { font-family: 'Archivo', sans-serif; font-weight: 800; letter-spacing: -.02em; font-size: 18px; color: #ECEDEF; margin: 0 0 4px; }
        .pa-ch { font-family: 'IBM Plex Mono', monospace; font-size: 12px; line-height: 1.5; color: #797E85; margin: 0 0 16px; }

        .pa-rationale { border-left: 3px solid var(--pc); }
        .pa-ptag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .pa-ptag i { width: 8px; height: 8px; border-radius: 50%; }
        .pa-rationale p { margin: 0 0 9px; font-size: 14px; line-height: 1.55; color: #ECEDEF; }
        .pa-rationale p:last-child { margin: 0; }
        .pa-dim { color: #A7ADB4 !important; font-size: 13.5px !important; }

        .pa-bprow { margin-bottom: 16px; }
        .pa-bprow:last-child { margin-bottom: 0; }
        .pa-bphead { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
        .pa-bpt { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #ECEDEF; }
        .pa-bpn { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #5a6068; }
        .pa-bar { display: flex; height: 24px; border-radius: 6px; overflow: hidden; border: 1px solid var(--line); }
        .pa-bar span { display: flex; align-items: center; justify-content: center; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #0A0B0A; font-weight: 600; min-width: 0; }
        .pa-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 7px; }
        .pa-lg { display: flex; align-items: center; gap: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #A7ADB4; }
        .pa-lg i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }

        .pa-posture { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 560px) { .pa-posture { grid-template-columns: 1fr; } }
        .pa-dial { background: #08090A; border: 1px solid var(--line); border-radius: 9px; padding: 14px 15px; }
        .pa-dv { font-family: 'IBM Plex Mono', monospace; font-size: 17px; color: #F5B544; font-weight: 600; line-height: 1.15; }
        .pa-dl { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: #5a6068; margin-top: 8px; }
        .pa-dx { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #A7ADB4; margin-top: 3px; }

        .pa-tscroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 9px; }
        .pa-table { border-collapse: collapse; width: 100%; min-width: 620px; font-size: 13px; }
        .pa-table th, .pa-table td { padding: 11px 13px; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; font-family: 'IBM Plex Mono', monospace; }
        .pa-table thead th { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #5a6068; font-weight: 500; background: #08090A; }
        .pa-table tbody tr:last-child td { border-bottom: none; }
        .pa-idx { color: #5a6068; }
        .pa-dimc { color: #A7ADB4; }
        .pa-chip { font-size: 10px; letter-spacing: .04em; padding: 2px 8px; border-radius: 20px; border: 1px solid var(--line-strong, rgba(255,255,255,.12)); color: #A7ADB4; }

        .pa-ladder { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 560px) { .pa-ladder { grid-template-columns: 1fr; } }
        .pa-lyr { background: #08090A; border: 1px solid var(--line); border-radius: 9px; padding: 15px; text-align: center; position: relative; overflow: hidden; }
        .pa-ly { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: #5a6068; }
        .pa-lc { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 26px; color: #F5B544; margin-top: 6px; line-height: 1; }
        .pa-lu { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: #A7ADB4; margin-top: 6px; }
        .pa-lbar { position: absolute; bottom: 0; left: 0; height: 3px; background: #F5B544; opacity: .5; }

        .pa-rx { padding: 0; }
        .pa-rx > summary { list-style: none; cursor: pointer; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .pa-rx > summary::-webkit-details-marker { display: none; }
        .pa-caret { transition: transform .2s; }
        .pa-rx[open] .pa-caret { transform: rotate(180deg); }
        .pa-rxbody { padding: 0 20px 20px; }
        .pa-rxadd { display: grid; grid-template-columns: 1.3fr 1fr .9fr auto; gap: 10px; align-items: end; margin-bottom: 14px; }
        @media (max-width: 560px) { .pa-rxadd { grid-template-columns: 1fr 1fr; } }
        .pa-rxadd .pa-lbl { margin-bottom: 6px; }
        .pa-add { background: #08090A; border: 1px solid rgba(245,181,68,.5); color: #F5B544; border-radius: 6px; padding: 9px 15px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; white-space: nowrap; height: fit-content; }
        .pa-add:hover { background: rgba(245,181,68,.1); }
        .pa-rxlist { list-style: none; margin: 0 0 14px; padding: 0; }
        .pa-rxlist li { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border: 1px solid var(--line); border-radius: 7px; margin-bottom: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; background: #08090A; color: #A7ADB4; }
        .pa-del { cursor: pointer; color: #5a6068; border: none; background: none; font-size: 17px; line-height: 1; }
        .pa-del:hover { color: #E5634D; }
        .pa-gaprow { display: grid; grid-template-columns: 120px 1fr 1.3fr; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
        @media (max-width: 560px) { .pa-gaprow { grid-template-columns: 1fr; gap: 4px; } }
        .pa-gaprow:last-child { border-bottom: none; }
        .pa-gl { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #ECEDEF; }
        .pa-mini { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #A7ADB4; }
        .pa-act { font-size: 13px; }
        .pa-load { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
        .pa-loadbtn { background: rgba(245,181,68,.1); border: 1px solid rgba(245,181,68,.5); color: #F5B544; border-radius: 6px; padding: 9px 16px; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: .15s; }
        .pa-loadbtn:hover:not(:disabled) { background: rgba(245,181,68,.18); }
        .pa-loadbtn:disabled { opacity: .4; cursor: not-allowed; }
        .pa-warn { font-family: 'IBM Plex Mono', monospace; font-size: 11px; line-height: 1.5; color: #E8934B; margin: 10px 0 0; }
        .pa-clear { background: none; border: none; color: #797E85; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; padding: 0; margin: 0 0 4px; }
        .pa-clear:hover { color: #E5634D; }
        .pa-mkt { margin-top: 6px; }
        .pa-mktrow { margin-bottom: 12px; }
        .pa-mkthead { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
        .pa-mktname { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #ECEDEF; letter-spacing: .02em; }
        .pa-mktu { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #797E85; }
        .pa-mkthint { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; line-height: 1.5; color: #5a6068; font-style: italic; margin: 10px 0 0; }
      `}</style>
    </section>
  );
}
