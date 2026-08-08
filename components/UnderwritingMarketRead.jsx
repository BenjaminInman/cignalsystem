"use client";
import { useState, useEffect } from "react";
import { hasTier } from "@/lib/tiers";

const pct = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");

// Dependency-free inline SVG: rent index, Cignal cycle path vs naive flat 3%.
function RentIndexSVG({ fa }) {
  if (!fa) return null;
  const g = [0, fa.rentGrowthY1, fa.rentGrowthY2, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent, fa.rentGrowthSubsequent];
  let c = 100, n = 100; const C = [100], N = [100];
  for (let y = 1; y <= 5; y++) { c *= 1 + g[y]; n *= 1.03; C.push(c); N.push(n); }
  const W = 320, H = 140, pad = 24;
  const all = [...C, ...N]; const lo = Math.min(...all), hi = Math.max(...all);
  const x = (i) => pad + (i * (W - 2 * pad)) / 5;
  const y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const path = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rent index: Cignal vs naive flat 3%">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#cbd5e1" />
      <path d={path(N)} fill="none" stroke="#B88A2A" strokeWidth="2" />
      <path d={path(C)} fill="none" stroke="#0B1F3A" strokeWidth="2.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <text key={i} x={x(i)} y={H - 8} fontSize="9" textAnchor="middle" fill="#64748b">{i}</text>
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

  if (loading) return <div className="umr umr--loading">Reading the market…</div>;
  if (err) return <div className="umr umr--error">Couldn’t load market read: {err}</div>;
  const fa = data?.forwardAssumptions;

  return (
    <div className="umr">
      <div className="umr__head">
        <div>
          <h3 className="umr__title">Cignal Market Read</h3>
          <p className="umr__market">{marketName || data?.cbsa}</p>
        </div>
        <div className="umr__scenario">
          {["bear", "base", "bull"].map((s) => (
            <button key={s} data-active={scenario === s} onClick={() => setScenario(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="umr__phase"><span>Cycle phase</span><strong>{data?.phase}</strong></div>

      <div className={`umr__grid ${gated ? "umr__grid--blurred" : ""}`}>
        <Metric label="Rent · Yr 1" v={pct(fa?.rentGrowthY1)} />
        <Metric label="Rent · Yr 2" v={pct(fa?.rentGrowthY2)} />
        <Metric label="Rent · after" v={pct(fa?.rentGrowthSubsequent)} />
        <Metric label="Vacancy" v={pct(fa?.stabilizedVacancy)} />
        <Metric label="Exit cap" v={pct(fa?.exitCapRate, 2)} />
      </div>

      {gated ? (
        <div className="umr__upsell">Upgrade to Pro to see this market’s forward assumptions.</div>
      ) : (
        <>
          <div className="umr__chart">
            <p className="umr__chartTitle">Rent index — cycle-adjusted vs. naive flat 3%</p>
            <RentIndexSVG fa={fa} />
          </div>
          {data?.coverage && (
            <div className="umr__coverage">
              {Object.entries(data.coverage).map(([k, v]) => (
                <span key={k} className={`umr__badge umr__badge--${v}`}>{k}: {v}</span>
              ))}
            </div>
          )}
        </>
      )}
      <p className="umr__vintage">Engine {data?.engineMethodVersion} · live from the Cignal warehouse</p>
    </div>
  );
}

function Metric({ label, v }) {
  return (
    <div className="umr__metric"><span>{label}</span><strong>{v}</strong></div>
  );
}
