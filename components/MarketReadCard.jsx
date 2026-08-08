"use client";
import { runMarketRead } from "@/lib/underwriting/engine";

const pct = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");

function RentIndexSVG({ fa }) {
  if (!fa) return null;
  const g = [0, fa.rentGrowthY1, fa.rentGrowthY2, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent];
  let c = 100, n = 100; const C = [100], N = [100];
  for (let y = 1; y <= 5; y++) { c *= 1 + g[y]; n *= 1.03; C.push(c); N.push(n); }
  const W = 300, H = 118, pad = 22;
  const all = [...C, ...N]; const lo = Math.min(...all), hi = Math.max(...all);
  const x = (i) => pad + (i * (W - 2 * pad)) / 5;
  const y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const path = (a) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rent index">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#26292e" />
      <path d={path(N)} fill="none" stroke="#797E85" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={path(C)} fill="none" stroke="#F5B544" strokeWidth="2.25" />
      {[0, 1, 2, 3, 4, 5].map((i) => (<text key={i} x={x(i)} y={H - 7} fontSize="8" textAnchor="middle" fill="#5b5f66">{i}</text>))}
    </svg>
  );
}

export default function MarketReadCard({ mr, scenario, setScenario, marketName, goingInCap = 0.06 }) {
  const fa = mr?.inputs ? runMarketRead({ ...mr.inputs, goingInCap }, scenario).forwardAssumptions : mr?.forwardAssumptions;
  return (
    <aside className="mrc">
      <div className="mrc__top">
        <span className="mrc__kick">MARKET READ</span>
        <div className="mrc__scn">{["bear", "base", "bull"].map((s) => (
          <button key={s} data-active={scenario === s} onClick={() => setScenario(s)}>{s}</button>))}</div>
      </div>
      <div className="mrc__mkt">{marketName || mr?.cbsa || "—"}</div>
      <div className="mrc__phase">{mr?.phase || "—"}</div>

      <div className="mrc__rows">
        <Row k="Rent · Yr 1" v={pct(fa?.rentGrowthY1)} />
        <Row k="Rent · Yr 2" v={pct(fa?.rentGrowthY2)} />
        <Row k="Rent · after" v={pct(fa?.rentGrowthSubsequent)} />
        <Row k="Stabilized vacancy" v={pct(fa?.stabilizedVacancy)} />
        <Row k="Exit cap" v={pct(fa?.exitCapRate, 2)} />
      </div>

      <div className="mrc__chartTitle">Rent index · cycle vs. flat 3%</div>
      <RentIndexSVG fa={fa} />

      {mr?.coverage && (
        <div className="mrc__cov">
          {Object.entries(mr.coverage).map(([k, v]) => (<span key={k} className={`mrc__b is-${v}`}>{k}</span>))}
        </div>
      )}
      <div className="mrc__foot">{mr?.engineMethodVersion || ""} · live warehouse</div>

      <style jsx>{`
        .mrc { background:#0E0F11; border:1px solid #1e2126; border-radius:12px; padding:16px; color:#ECEDEF;
               font-family:'IBM Plex Mono',ui-monospace,monospace; position:sticky; top:20px; }
        .mrc__top { display:flex; justify-content:space-between; align-items:center; }
        .mrc__kick { font-size:10px; letter-spacing:.28em; color:#797E85; }
        .mrc__scn { display:flex; gap:2px; }
        .mrc__scn button { text-transform:capitalize; font-size:11px; padding:3px 8px; border:1px solid #26292e; border-radius:5px; background:transparent; color:#797E85; cursor:pointer; font-family:inherit; }
        .mrc__scn button[data-active="true"] { background:#F5B544; color:#08090A; border-color:#F5B544; font-weight:700; }
        .mrc__mkt { font-family:Archivo,sans-serif; font-size:18px; font-weight:700; margin-top:10px; }
        .mrc__phase { font-size:12px; color:#F5B544; margin:2px 0 12px; }
        .mrc__rows { border-top:1px solid #1e2126; }
        .mrc__chartTitle { font-size:10px; letter-spacing:.14em; color:#797E85; margin:14px 0 4px; text-transform:uppercase; }
        .mrc__cov { display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
        .mrc__b { font-size:9px; letter-spacing:.1em; text-transform:uppercase; padding:2px 6px; border-radius:3px; background:#16181b; color:#797E85; border:1px solid #1e2126; }
        .mrc__b.is-stale { color:#E8B04B; border-color:#3a3020; }
        .mrc__b.is-missing { color:#E5634D; border-color:#3a2020; }
        .mrc__foot { font-size:10px; color:#5b5f66; margin-top:12px; }
      `}</style>
    </aside>
  );
}

function Row({ k, v }) {
  return (
    <div className="r">
      <span>{k}</span><b>{v}</b>
      <style jsx>{`
        .r { display:flex; justify-content:space-between; align-items:baseline; padding:7px 0; border-bottom:1px solid #16181b; font-size:12.5px; }
        .r span { color:#797E85; } .r b { color:#ECEDEF; font-weight:600; }
      `}</style>
    </div>
  );
}
