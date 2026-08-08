"use client";
import { useState, useEffect } from "react";
import { hasTier } from "@/lib/tiers";

const pct = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");

function RentIndexSVG({ fa }) {
  if (!fa) return null;
  const g = [0, fa.rentGrowthY1, fa.rentGrowthY2, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent];
  let c = 100, n = 100; const C = [100], N = [100];
  for (let y = 1; y <= 5; y++) { c *= 1 + g[y]; n *= 1.03; C.push(c); N.push(n); }
  const W = 340, H = 150, pad = 26;
  const all = [...C, ...N]; const lo = Math.min(...all), hi = Math.max(...all);
  const x = (i) => pad + (i * (W - 2 * pad)) / 5;
  const y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const path = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rent index: Cignal vs naive flat 3%">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#e2e8f0" />
      <path d={path(N)} fill="none" stroke="#B88A2A" strokeWidth="2" />
      <path d={path(C)} fill="none" stroke="#0B1F3A" strokeWidth="2.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <text key={i} x={x(i)} y={H - 9} fontSize="9" textAnchor="middle" fill="#94a3b8">{i}</text>
      ))}
    </svg>
  );
}

export default function UnderwritingMarketRead({ cbsa, marketName, userTier = "free" }) {
  const [scenario, setScenario] = useState("base");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const gated = !hasTier(userTier, "pro");

  useEffect(() => {
    if (!cbsa) return;
    setLoading(true); setErr(null);
    fetch(`/api/underwriting/market-read?cbsa=${cbsa}&scenario=${scenario}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [cbsa, scenario]);

  const fa = data?.forwardAssumptions;

  return (
    <div className="umr">
      <div className="umr__head">
        <div>
          <div className="umr__eyebrow">CIGNAL · MARKET READ</div>
          <div className="umr__market">{marketName || data?.cbsa || "—"}</div>
        </div>
        <div className="umr__scenario">
          {["bear", "base", "bull"].map((s) => (
            <button key={s} data-active={scenario === s} onClick={() => setScenario(s)}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="umr__msg">Reading the market…</div>
      ) : err ? (
        <div className="umr__msg umr__msg--err">Couldn’t load this market ({err}).</div>
      ) : (
        <>
          <div className="umr__phase">
            <span>Cycle phase</span><strong>{data?.phase}</strong>
          </div>

          <div className={`umr__grid ${gated ? "is-blurred" : ""}`}>
            <M label="Rent · Yr 1" v={pct(fa?.rentGrowthY1)} />
            <M label="Rent · Yr 2" v={pct(fa?.rentGrowthY2)} />
            <M label="Rent · after" v={pct(fa?.rentGrowthSubsequent)} />
            <M label="Vacancy" v={pct(fa?.stabilizedVacancy)} />
            <M label="Exit cap" v={pct(fa?.exitCapRate, 2)} />
          </div>

          {gated ? (
            <div className="umr__upsell">Upgrade to Pro to see this market’s forward assumptions.</div>
          ) : (
            <>
              <div className="umr__chartTitle">Rent index — cycle-adjusted vs. naive flat 3%</div>
              <RentIndexSVG fa={fa} />
              {data?.coverage && (
                <div className="umr__cov">
                  {Object.entries(data.coverage).map(([k, v]) => (
                    <span key={k} className={`umr__badge is-${v}`}>{k}: {v}</span>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="umr__foot">Engine {data?.engineMethodVersion} · live from the Cignal warehouse</div>
        </>
      )}

      <style jsx>{`
        .umr { border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background: #fff; font-family: inherit; }
        .umr__head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 18px; background:#0B1F3A; color:#fff; }
        .umr__eyebrow { font-size:10px; letter-spacing:.14em; color:#B88A2A; font-weight:700; }
        .umr__market { font-size:18px; font-weight:700; margin-top:2px; }
        .umr__scenario { display:flex; gap:4px; background:rgba(255,255,255,.08); padding:3px; border-radius:8px; }
        .umr__scenario button { text-transform:capitalize; font-size:12px; padding:5px 11px; border:0; border-radius:6px; background:transparent; color:#cbd5e1; cursor:pointer; }
        .umr__scenario button[data-active="true"] { background:#B88A2A; color:#1b1b1b; font-weight:700; }
        .umr__msg { padding:22px 18px; color:#64748b; font-size:14px; }
        .umr__msg--err { color:#b45309; }
        .umr__phase { display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:#f8fafc; border-bottom:1px solid #eef2f7; }
        .umr__phase span { font-size:12px; color:#64748b; }
        .umr__phase strong { font-size:14px; color:#1E5631; }
        .umr__grid { display:grid; grid-template-columns:repeat(5,1fr); gap:1px; background:#eef2f7; }
        .umr__grid.is-blurred { filter:blur(5px); pointer-events:none; }
        .umr__foot, .umr__chartTitle, .umr__cov, .umr__upsell { padding-left:18px; padding-right:18px; }
        .umr__chartTitle { font-size:12px; color:#475569; margin:14px 0 2px; }
        .umr__cov { display:flex; flex-wrap:wrap; gap:6px; padding-top:8px; padding-bottom:4px; }
        .umr__badge { font-size:10px; padding:2px 7px; border-radius:999px; background:#f1f5f9; color:#475569; }
        .umr__badge.is-stale { background:#fef3c7; color:#92400e; }
        .umr__badge.is-missing { background:#fee2e2; color:#991b1b; }
        .umr__upsell { padding:16px 18px; background:#fffbeb; color:#92400e; font-size:13px; text-align:center; }
        .umr__foot { padding-top:12px; padding-bottom:14px; font-size:11px; color:#94a3b8; }
      `}</style>
    </div>
  );
}

function M({ label, v }) {
  return (
    <div style={{ background: "#fff", padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#0B1F3A", marginTop: 3 }}>{v}</div>
    </div>
  );
}
