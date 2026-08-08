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
  const read = mr?.inputs ? runMarketRead({ ...mr.inputs, goingInCap }, scenario) : null;
  const fa = read?.forwardAssumptions || mr?.forwardAssumptions;
  const sig = read?.signals;
  const inp = mr?.inputs; const raw = mr?.raw;
  const sgn = (x) => (x == null ? "" : x >= 0 ? "up" : "down");
  const s2 = (x) => (x == null ? "—" : (x >= 0 ? "+" : "") + x.toFixed(2));
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

      {(raw || sig) && (
        <div className="mrc__sig">
          <div className="mrc__kick" style={{ marginBottom: 6 }}>SIGNALS · WHY THIS READ</div>
          {raw && (
            <div className="mrc__rent2">
              <div><span>Rent · YoY</span><b className={sgn(raw.rentYoY)}>{raw.rentYoY == null ? "—" : (raw.rentYoY * 100).toFixed(1) + "%"}</b></div>
              <div><span>Rent · QoQ ann</span><b className={sgn(raw.rentQoQann)}>{raw.rentQoQann == null ? "—" : (raw.rentQoQann * 100).toFixed(1) + "%"}</b></div>
            </div>
          )}
          {inp && (<>
            <Bar k="Employment" v={inp.empSignal} />
            <Bar k="Rent momentum" v={inp.rentMomSignal} />
            <Bar k="Absorption" v={inp.absorptionSignal} />
            <Bar k="Supply pressure" v={inp.supplyNearTerm} pressure />
          </>)}
          {sig && (
            <div className="mrc__eng">
              <div><span>Demand index</span><b className={sgn(sig.demand)}>{s2(sig.demand)}</b></div>
              <div><span>Momentum · Yr 1</span><b className={sgn(sig.momY1)}>{s2(sig.momY1)}</b></div>
              <div><span>Momentum · Yr 2</span><b className={sgn(sig.momY2)}>{s2(sig.momY2)}</b></div>
            </div>
          )}
        </div>
      )}

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
        .mrc__sig { margin-top:14px; padding-top:12px; border-top:1px solid #1e2126; }
        .mrc__rent2 { display:flex; gap:10px; margin-bottom:8px; }
        .mrc__rent2 > div { flex:1; background:#08090A; border:1px solid #1e2126; border-radius:6px; padding:6px 8px; }
        .mrc__rent2 span { display:block; font-size:9.5px; color:#797E85; letter-spacing:.06em; }
        .mrc__rent2 b { font-size:14px; }
        .mrc__eng { margin-top:6px; }
        .mrc__eng > div { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #16181b; font-size:11.5px; color:#797E85; }
        .mrc__eng b { color:#ECEDEF; }
        .up { color:#5FB97C; } .down { color:#E5634D; }
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

function Bar({ k, v, pressure }) {
  const val = v == null ? 0 : Math.max(-1, Math.min(1, v));
  const leftPct = 50 + (val / 2) * 100 * (val < 0 ? 1 : 0);
  const widthPct = Math.abs(val) * 50;
  const color = pressure ? "#E8B04B" : val >= 0 ? "#5FB97C" : "#E5634D";
  return (
    <div className="bar">
      <div className="bar__row">
        <span className="bar__k">{k}</span>
        <span className="bar__v">{v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2)}</span>
      </div>
      <div className="bar__track">
        <div className="bar__mid" />
        <div className="bar__fill" style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }} />
      </div>
      <style jsx>{`
        .bar { margin:6px 0; }
        .bar__row { display:flex; justify-content:space-between; font-size:11px; color:#797E85; margin-bottom:3px; }
        .bar__v { color:#ECEDEF; font-weight:600; }
        .bar__track { position:relative; height:5px; background:#16181b; border-radius:3px; }
        .bar__mid { position:absolute; left:50%; top:-1px; bottom:-1px; width:1px; background:#3a3d42; }
        .bar__fill { position:absolute; top:0; bottom:0; border-radius:3px; }
      `}</style>
    </div>
  );
}
