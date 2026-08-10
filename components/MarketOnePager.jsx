"use client";
import { runMarketRead } from "@/lib/underwriting/engine";

const pct = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");
const s2 = (x) => (x == null ? "—" : (x >= 0 ? "+" : "") + x.toFixed(2));

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
      <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

function RentSVG({ fa }) {
  if (!fa) return null;
  const g = [0, fa.rentGrowthY1, fa.rentGrowthY2, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent];
  let c = 100, n = 100; const C = [100], N = [100];
  for (let y = 1; y <= 5; y++) { c *= 1 + g[y]; n *= 1.03; C.push(c); N.push(n); }
  const W = 340, H = 150, pad = 26; const all = [...C, ...N]; const lo = Math.min(...all), hi = Math.max(...all);
  const x = (i) => pad + (i * (W - 2 * pad)) / 5;
  const y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const path = (a) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rent index">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#e2e8f0" />
      <path d={path(N)} fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={path(C)} fill="none" stroke="#B8860B" strokeWidth="2.5" />
      {[0,1,2,3,4,5].map((i)=>(<text key={i} x={x(i)} y={H-8} fontSize="9" textAnchor="middle" fill="#94a3b8">{i}</text>))}
    </svg>
  );
}

function Bar({ k, v, pressure }) {
  const val = v == null ? 0 : Math.max(-1, Math.min(1, v));
  const left = 50 + (val < 0 ? val * 50 : 0);
  const width = Math.abs(val) * 50;
  const color = pressure ? "#B8860B" : val >= 0 ? "#1E7B34" : "#C0392B";
  return (
    <div style={{ margin: "5px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#64748b", marginBottom: 2 }}>
        <span>{k}</span><b style={{ color: "#1B1B1B" }}>{s2(v)}</b>
      </div>
      <div style={{ position: "relative", height: 5, background: "#eef2f7", borderRadius: 3 }}>
        <div style={{ position: "absolute", left: "50%", top: -1, bottom: -1, width: 1, background: "#cbd5e1" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 3, left: `${left}%`, width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

export default function MarketOnePager({ mr, marketName, scenario = "base", goingInCap = 0.06 }) {
  const read = mr?.inputs ? runMarketRead({ ...mr.inputs, goingInCap }, scenario) : null;
  const fa = read?.forwardAssumptions || mr?.forwardAssumptions;
  const sig = read?.signals; const inp = mr?.inputs; const raw = mr?.raw;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="op">
      {/* branded header */}
      <div className="op__head">
        <div className="op__brand"><Logo /><span className="op__wm">CIGNAL<i>·</i>SYSTEM</span></div>
        <span className="op__tag">Better Signals. Better Decisions. Better <b>Returns.</b></span>
      </div>
      <div className="op__rule" />

      <div className="op__body">
        <div className="op__titlebar">
          <div>
            <div className="op__kick">MARKET CYCLE ONE-PAGER</div>
            <div className="op__mkt">{marketName || mr?.cbsa || "—"}</div>
          </div>
          <div className="op__date">{today}<span className="op__scn">{scenario} case</span></div>
        </div>

        <div className="op__phase"><span>CYCLE PHASE</span><strong>{mr?.phase || "—"}</strong></div>

        <div className="op__metrics">
          <M k="Rent · Yr 1" v={pct(fa?.rentGrowthY1)} />
          <M k="Rent · Yr 2" v={pct(fa?.rentGrowthY2)} />
          <M k="Rent · after" v={pct(fa?.rentGrowthSubsequent)} />
          <M k="Stabilized vacancy" v={pct(fa?.stabilizedVacancy)} />
          <M k="Exit cap" v={pct(fa?.exitCapRate, 2)} />
        </div>

        <div className="op__cols">
          <div className="op__sig">
            <div className="op__sh">THE SIGNALS BEHIND IT</div>
            {raw && (
              <div className="op__rent2">
                <div><span>Rent · YoY</span><b className={sgn(raw.rentYoY)}>{pct(raw.rentYoY)}</b></div>
                <div><span>Rent · QoQ ann</span><b className={sgn(raw.rentQoQann)}>{pct(raw.rentQoQann)}</b></div>
              </div>
            )}
            {inp && (<>
              <Bar k="Employment" v={inp.empSignal} />
              <Bar k="Rent momentum" v={inp.rentMomSignal} />
              <Bar k="Absorption" v={inp.absorptionSignal} />
              <Bar k="Supply pressure" v={inp.supplyNearTerm} pressure />
            </>)}
            {sig && (
              <div className="op__eng">
                <div><span>Demand index</span><b className={sgn(sig.demand)}>{s2(sig.demand)}</b></div>
                <div><span>Momentum · Yr 1</span><b className={sgn(sig.momY1)}>{s2(sig.momY1)}</b></div>
                <div><span>Momentum · Yr 2</span><b className={sgn(sig.momY2)}>{s2(sig.momY2)}</b></div>
              </div>
            )}
          </div>
          <div className="op__chart">
            <div className="op__sh">RENT INDEX · CYCLE vs. NAIVE FLAT 3%</div>
            <RentSVG fa={fa} />
            {mr?.coverage && (
              <div className="op__cov">
                {Object.entries(mr.coverage).map(([k, v]) => (<span key={k} className={`op__b is-${v}`}>{k}: {v}</span>))}
              </div>
            )}
          </div>
        </div>

        <div className="op__foot">
          <span>{mr?.engineMethodVersion || ""} · generated {today}</span>
          <span>Cignal System · market intelligence for multifamily · not investment advice</span>
        </div>
      </div>

      <style jsx>{`
        .op { width:760px; max-width:100%; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden;
              box-shadow:0 18px 50px rgba(0,0,0,.5); color:#1B1B1B; font-family:'IBM Plex Mono',ui-monospace,monospace;
              -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .op__head { background:#08090A; display:flex; justify-content:space-between; align-items:center; padding:14px 22px; }
        .op__brand { display:flex; align-items:center; gap:10px; }
        .op__wm { color:#fff; font-weight:700; letter-spacing:.14em; font-size:15px; }
        .op__wm i { color:#F5B544; font-style:normal; }
        .op__tag { color:#9aa0a6; font-size:10.5px; } .op__tag b { color:#F5B544; }
        .op__rule { height:3px; background:#F5B544; }
        .op__body { padding:22px 26px 18px; }
        .op__titlebar { display:flex; justify-content:space-between; align-items:flex-end; }
        .op__kick { font-size:10px; letter-spacing:.22em; color:#B8860B; }
        .op__mkt { font-family:Archivo,sans-serif; font-size:26px; font-weight:800; margin-top:2px; }
        .op__date { text-align:right; font-size:11px; color:#64748b; }
        .op__scn { display:block; text-transform:capitalize; color:#B8860B; margin-top:2px; }
        .op__phase { display:flex; align-items:center; gap:12px; margin:14px 0; padding:12px 16px; background:#faf6ec; border:1px solid #f0e2c0; border-radius:8px; }
        .op__phase span { font-size:10px; letter-spacing:.18em; color:#B8860B; }
        .op__phase strong { font-family:Archivo,sans-serif; font-size:18px; }
        .op__metrics { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
        .op__cols { display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:16px; }
        .op__sh { font-size:10px; letter-spacing:.16em; color:#94a3b8; margin-bottom:8px; }
        .op__rent2 { display:flex; gap:8px; margin-bottom:8px; }
        .op__rent2 > div { flex:1; background:#f8fafc; border:1px solid #eef2f7; border-radius:6px; padding:6px 9px; }
        .op__rent2 span { display:block; font-size:9.5px; color:#64748b; } .op__rent2 b { font-size:14px; }
        .op__eng { margin-top:8px; }
        .op__eng > div { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f1f5f9; font-size:11.5px; color:#64748b; }
        .op__eng b { color:#1B1B1B; }
        .op__cov { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
        .op__b { font-size:9px; text-transform:uppercase; letter-spacing:.08em; padding:2px 6px; border-radius:3px; background:#f1f5f9; color:#64748b; }
        .op__b.is-stale { background:#fef3c7; color:#92400e; }
        .op__foot { display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-top:18px; padding-top:10px; border-top:1px solid #eef2f7; font-size:9.5px; color:#94a3b8; }
        .up { color:#1E7B34; } .down { color:#C0392B; }
      `}</style>
    </div>
  );
}
function sgn(x) { return x == null ? "" : x >= 0 ? "up" : "down"; }
function M({ k, v }) {
  return (<div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "9px 8px", textAlign: "center" }}>
    <div style={{ fontSize: 9.5, color: "#64748b" }}>{k}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: "#1B1B1B", marginTop: 2 }}>{v}</div></div>);
}
