"use client";
import { useState, useEffect, useMemo } from "react";
import { hasTier } from "@/lib/tiers";
import { runMarketRead } from "@/lib/underwriting/engine";
import { buildProForma, exitStrategy } from "@/lib/underwriting/proforma";

const $ = (n) => (n == null ? "—" : "$" + Math.round(n).toLocaleString());
const pc = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");

const DEFAULT_DEAL = {
  units: 80, avgRent: 1150, otherIncomePerUnit: 45, expenseRatio: 0.45,
  goingInCap: 0.0674, ltv: 0.70, rate: 0.0625, ioMonths: 36, amortYears: 30,
  closingPct: 0.02, expenseGrowth: 0.025, holdYear: 5,
  refiYear: 3, refiLTV: 0.70, refiRate: 0.055, refiCost: 0.01, sellYear: 7,
  saleCost: 0.02,
};

export default function Underwriter({ cbsa, marketName, userTier = "free" }) {
  const gated = !hasTier(userTier, "pro");
  const [scenario, setScenario] = useState("base");
  const [mr, setMr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState(DEFAULT_DEAL);
  const [ov, setOv] = useState({}); // manual overrides of the auto-filled assumptions

  useEffect(() => {
    if (!cbsa) return;
    setLoading(true);
    fetch(`/api/underwriting/market-read?cbsa=${cbsa}&scenario=${scenario}`)
      .then((r) => r.json()).then((d) => setMr(d.error ? null : d))
      .finally(() => setLoading(false));
    setOv({}); // clear overrides when market/scenario changes
  }, [cbsa, scenario]);

  // Forward assumptions: from the market read (recomputed with the deal's going-in cap), overridable.
  const fa = useMemo(() => {
    if (!mr?.inputs) return null;
    const base = runMarketRead({ ...mr.inputs, goingInCap: deal.goingInCap }, scenario).forwardAssumptions;
    return {
      rentGrowthY1: ov.rentGrowthY1 ?? base.rentGrowthY1,
      rentGrowthY2: ov.rentGrowthY2 ?? base.rentGrowthY2,
      rentGrowthSubsequent: ov.rentGrowthSubsequent ?? base.rentGrowthSubsequent,
      stabilizedVacancy: ov.stabilizedVacancy ?? base.stabilizedVacancy,
      exitCapRate: ov.exitCapRate ?? base.exitCapRate,
    };
  }, [mr, deal.goingInCap, scenario, ov]);

  const out = useMemo(() => {
    if (!fa || !mr?.signals) return null;
    const p = buildProForma(deal, fa);
    const dd = { ...deal, exitCapB: ov.exitCapB ?? fa.exitCapRate, refiCap: deal.goingInCap };
    const es = exitStrategy(p, dd, fa, mr.signals);
    return { p, es };
  }, [deal, fa, mr, ov]);

  if (loading) return <div className="uw__msg">Loading market…</div>;
  if (!mr) return <div className="uw__msg uw__msg--err">Couldn’t load market data for this metro.</div>;

  const set = (k) => (e) => setDeal({ ...deal, [k]: num(e.target.value) });
  const setOvr = (k) => (e) => setOv({ ...ov, [k]: e.target.value === "" ? undefined : num(e.target.value) });

  return (
    <div className="uw">
      <div className="uw__bar">
        <div><span className="uw__eyebrow">CIGNAL · UNDERWRITER</span><div className="uw__market">{marketName || cbsa}</div></div>
        <div className="uw__scn">{["bear", "base", "bull"].map((s) => (
          <button key={s} data-active={scenario === s} onClick={() => setScenario(s)}>{s}</button>))}</div>
      </div>

      <div className="uw__cols">
        {/* LEFT — inputs */}
        <div className="uw__panel">
          <h4>Deal</h4>
          <Row label="Units" v={deal.units} on={set("units")} />
          <Row label="Avg in-place rent ($/mo)" v={deal.avgRent} on={set("avgRent")} />
          <Row label="Other income ($/unit/mo)" v={deal.otherIncomePerUnit} on={set("otherIncomePerUnit")} />
          <Row label="Expense ratio" v={deal.expenseRatio} on={set("expenseRatio")} step="0.01" hint="of EGI" />
          <Row label="Going-in cap" v={deal.goingInCap} on={set("goingInCap")} step="0.0005" pct />
          <h4>Financing</h4>
          <Row label="LTV" v={deal.ltv} on={set("ltv")} step="0.01" pct />
          <Row label="Rate" v={deal.rate} on={set("rate")} step="0.0005" pct />
          <Row label="IO period (months)" v={deal.ioMonths} on={set("ioMonths")} />
          <Row label="Amortization (years)" v={deal.amortYears} on={set("amortYears")} />
          <Row label="Closing/cap-ex" v={deal.closingPct} on={set("closingPct")} step="0.005" pct hint="of price" />
          <h4>Market Read <span className="uw__auto">auto-filled · editable</span></h4>
          <Row label="Rent growth · Yr 1" v={fa?.rentGrowthY1} on={setOvr("rentGrowthY1")} step="0.005" pct auto />
          <Row label="Rent growth · Yr 2" v={fa?.rentGrowthY2} on={setOvr("rentGrowthY2")} step="0.005" pct auto />
          <Row label="Rent growth · after" v={fa?.rentGrowthSubsequent} on={setOvr("rentGrowthSubsequent")} step="0.005" pct auto />
          <Row label="Stabilized vacancy" v={fa?.stabilizedVacancy} on={setOvr("stabilizedVacancy")} step="0.005" pct auto />
          <Row label="Exit cap rate" v={fa?.exitCapRate} on={setOvr("exitCapRate")} step="0.0005" pct auto />
          <Row label="Expense growth" v={deal.expenseGrowth} on={set("expenseGrowth")} step="0.005" pct />
          <h4>Hold & exit</h4>
          <Row label="Hold — sell year (Path A)" v={deal.holdYear} on={set("holdYear")} />
          <Row label="Refi year (Path B)" v={deal.refiYear} on={set("refiYear")} />
          <Row label="Sell year (Path B)" v={deal.sellYear} on={set("sellYear")} />
          <Row label="Refi LTV" v={deal.refiLTV} on={set("refiLTV")} step="0.01" pct />
          <Row label="Refi rate (IO)" v={deal.refiRate} on={set("refiRate")} step="0.0005" pct />
        </div>

        {/* RIGHT — results */}
        <div className="uw__results">
          <div className="uw__phase"><span>Cycle phase</span><strong>{mr.phase}</strong></div>
          <div className={`uw__deal ${gated ? "is-blurred" : ""}`}>
            <Stat k="Purchase price" v={$(out?.p.price)} />
            <Stat k="Loan" v={$(out?.p.loan)} />
            <Stat k="Equity" v={$(out?.p.equity)} />
            <Stat k="Yr-1 NOI" v={$(out?.p.noi[1])} />
          </div>

          <div className="uw__paths">
            <Path title="Path A · Sell at hold" r={out?.es.pathA} gated={gated} />
            <Path title="Path B · Refi & hold" r={out?.es.pathB} gated={gated} extra={`Cash-out ${$(out?.es.pathB.cashOut)}`} />
          </div>

          <div className="uw__rec">
            <div className="uw__recHead">Cignal recommendation</div>
            <div className="uw__recBig">{out?.es.rec}</div>
            <p className="uw__recWhy">{out?.es.why}</p>
            <div className="uw__recRow">
              <span>Math favors: <b>{out?.es.mathFavors}</b></span>
              <span className={out?.es.aligned ? "uw__ok" : "uw__warn"}>{out?.es.aligned ? "Aligned" : "Divergent — weigh conviction vs. certainty"}</span>
            </div>
          </div>
          {gated && <div className="uw__upsell">Upgrade to Pro to run live underwriting.</div>}
          <div className="uw__foot">Engine {mr.engineMethodVersion} · assumptions live from the Cignal warehouse · a decision tool, not investment advice</div>
        </div>
      </div>

      <style jsx>{`
        .uw { border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; background:#fff; }
        .uw__bar { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:#0B1F3A; color:#fff; }
        .uw__eyebrow { font-size:10px; letter-spacing:.14em; color:#B88A2A; font-weight:700; }
        .uw__market { font-size:17px; font-weight:700; }
        .uw__scn { display:flex; gap:4px; background:rgba(255,255,255,.08); padding:3px; border-radius:8px; }
        .uw__scn button { text-transform:capitalize; font-size:12px; padding:5px 11px; border:0; border-radius:6px; background:transparent; color:#cbd5e1; cursor:pointer; }
        .uw__scn button[data-active="true"] { background:#B88A2A; color:#1b1b1b; font-weight:700; }
        .uw__cols { display:grid; grid-template-columns:1fr 1fr; gap:0; }
        @media (max-width:720px){ .uw__cols { grid-template-columns:1fr; } }
        .uw__panel { padding:16px 18px; border-right:1px solid #eef2f7; }
        .uw__panel h4 { margin:16px 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:#0B1F3A; }
        .uw__panel h4:first-child { margin-top:0; }
        .uw__auto { text-transform:none; letter-spacing:0; font-weight:400; color:#B88A2A; font-size:11px; margin-left:6px; }
        .uw__results { padding:16px 18px; background:#f8fafc; }
        .uw__phase { display:flex; justify-content:space-between; padding:10px 12px; background:#fff; border:1px solid #eef2f7; border-radius:8px; }
        .uw__phase span { font-size:12px; color:#64748b; } .uw__phase strong { font-size:13px; color:#1E5631; }
        .uw__deal { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0; }
        .uw__deal.is-blurred { filter:blur(5px); }
        .uw__paths { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        @media (max-width:480px){ .uw__paths, .uw__deal { grid-template-columns:1fr; } }
        .uw__rec { margin-top:12px; padding:14px; background:#0B1F3A; color:#fff; border-radius:10px; }
        .uw__recHead { font-size:10px; letter-spacing:.12em; color:#B88A2A; font-weight:700; }
        .uw__recBig { font-size:20px; font-weight:800; margin:4px 0; }
        .uw__recWhy { font-size:12px; color:#cbd5e1; margin:0 0 8px; }
        .uw__recRow { display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; font-size:12px; border-top:1px solid rgba(255,255,255,.12); padding-top:8px; }
        .uw__ok { color:#86efac; } .uw__warn { color:#fca5a5; }
        .uw__upsell { margin-top:10px; padding:12px; background:#fffbeb; color:#92400e; font-size:13px; text-align:center; border-radius:8px; }
        .uw__foot { margin-top:12px; font-size:11px; color:#94a3b8; }
        .uw__msg { padding:24px; color:#64748b; } .uw__msg--err { color:#b45309; }
      `}</style>
    </div>
  );
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function Row({ label, v, on, step = "1", pct, auto, hint }) {
  const display = pct && typeof v === "number" ? +(v * 100).toFixed(3) : v;
  const onChange = (e) => on(pct ? { target: { value: e.target.value === "" ? "" : String(parseFloat(e.target.value) / 100) } } : e);
  return (
    <label className="row">
      <span>{label}{hint ? <em> · {hint}</em> : null}</span>
      <input type="number" step={pct ? 0.1 : step} value={display} onChange={onChange} data-auto={auto ? "1" : undefined} />
      <style jsx>{`
        .row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:5px 0; font-size:12.5px; color:#334155; }
        .row em { color:#94a3b8; font-style:normal; }
        .row input { width:96px; padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; text-align:right; }
        .row input[data-auto="1"] { border-color:#B88A2A; background:#fffdf6; }
      `}</style>
    </label>
  );
}
function Stat({ k, v }) {
  return (<div style={{ background:"#fff", border:"1px solid #eef2f7", borderRadius:8, padding:"9px 11px" }}>
    <div style={{ fontSize:11, color:"#64748b" }}>{k}</div>
    <div style={{ fontSize:15, fontWeight:700, color:"#0B1F3A" }}>{v}</div></div>);
}
function Path({ title, r, gated, extra }) {
  return (<div style={{ background:"#fff", border:"1px solid #eef2f7", borderRadius:10, padding:"12px 13px" }}>
    <div style={{ fontSize:12, fontWeight:700, color:"#0B1F3A", marginBottom:6 }}>{title}</div>
    <div className={gated ? "is-blurred" : ""} style={{ filter: gated ? "blur(5px)" : "none" }}>
      <BigStat k="IRR" v={r ? (r.irr == null ? "—" : (r.irr * 100).toFixed(1) + "%") : "—"} />
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#475569", marginTop:4 }}>
        <span>EM {r ? r.em.toFixed(2) + "x" : "—"}</span>
        <span>Profit {r ? "$" + Math.round(r.profit).toLocaleString() : "—"}</span>
      </div>
      {extra && <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>{extra}</div>}
    </div></div>);
}
function BigStat({ k, v }) {
  return (<div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
    <span style={{ fontSize:11, color:"#64748b" }}>{k}</span>
    <span style={{ fontSize:22, fontWeight:800, color:"#0B1F3A" }}>{v}</span></div>);
}
