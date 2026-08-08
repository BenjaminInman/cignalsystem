"use client";
import { useState, useEffect, useMemo } from "react";
import { hasTier } from "@/lib/tiers";
import { createClient } from "@/lib/supabase/client";
import { runMarketRead } from "@/lib/underwriting/engine";
import { buildProForma, exitStrategy } from "@/lib/underwriting/proforma";

const $ = (n) => (n == null || isNaN(n) ? "—" : "$" + Math.round(n).toLocaleString());
const pc = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

const DEFAULT_DEAL = {
  units: 80, avgRent: 1150, otherIncomePerUnit: 45, expenseRatio: 0.45,
  goingInCap: 0.0674, ltv: 0.70, rate: 0.0625, ioMonths: 36, amortYears: 30,
  closingPct: 0.02, expenseGrowth: 0.025, holdYear: 5,
  refiYear: 3, refiLTV: 0.70, refiRate: 0.055, refiCost: 0.01, sellYear: 7, saleCost: 0.02,
  lpEquityShare: 0.90, prefRate: 0.08, hurdle2: 0.10, hurdle3: 0.12,
  lpShare1: 0.90, lpShare2: 0.75, lpShare3: 0.70, lpShare4: 0.65,
};

export default function Underwriter({ mr, scenario = "base", marketName, userTier = "free", injected, loadKey, onSaved }) {
  const gated = !hasTier(userTier, "pro");
  const [deal, setDeal] = useState(DEFAULT_DEAL);
  const [ov, setOv] = useState({});
  const [dealName, setDealName] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    if (injected?.deal) { setDeal({ ...DEFAULT_DEAL, ...injected.deal }); setOv(injected.ov || {}); setDealName(injected.name || ""); }
  }, [loadKey]); // eslint-disable-line

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
    const tiers = [
      { rate: deal.prefRate, lpShare: deal.lpShare1 }, { rate: deal.hurdle2, lpShare: deal.lpShare2 },
      { rate: deal.hurdle3, lpShare: deal.lpShare3 }, { rate: Infinity, lpShare: deal.lpShare4 },
    ];
    const dd = { ...deal, exitCapB: ov.exitCapB ?? fa.exitCapRate, refiCap: deal.goingInCap, tiers, lpEquityShare: deal.lpEquityShare };
    return { p, es: exitStrategy(p, dd, fa, mr.signals) };
  }, [deal, fa, mr, ov]);

  async function saveDeal() {
    if (!out) return;
    setSaveStatus("saving");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setSaveStatus("login"); return; }
      const [city, st] = (marketName || "").split(",").map((x) => x.trim());
      const snapshot = {
        cbsa: mr?.cbsa, marketName, scenario, deal, ov, phase: mr?.phase,
        pathA: { irr: out.es.pathA.irr, em: out.es.pathA.em, profit: out.es.pathA.profit },
        pathB: { irr: out.es.pathB.irr, em: out.es.pathB.em, profit: out.es.pathB.profit },
        rec: out.es.rec, price: out.p.price, equity: out.p.equity,
        savedAt: new Date().toISOString(), engineMethodVersion: mr?.engineMethodVersion,
      };
      const { error } = await sb.from("portfolio_properties").insert({
        user_id: user.id, name: dealName || `${marketName} deal`,
        city: city || null, state: st || null, unit_count: Math.round(deal.units) || null,
        underwriting: snapshot,
      });
      if (error) { console.error("save error", error); setSaveStatus("error"); return; }
      setSaveStatus("saved"); onSaved && onSaved();
      setTimeout(() => setSaveStatus(""), 2500);
    } catch (e) { console.error(e); setSaveStatus("error"); }
  }

  if (!mr) return <div className="uw uw--msg">Select a market to begin.</div>;
  const set = (k) => (e) => setDeal({ ...deal, [k]: num(e.target.value) });
  const setOvr = (k) => (e) => setOv({ ...ov, [k]: e.target.value === "" ? undefined : num(e.target.value) });

  return (
    <div className="uw">
      <div className="uw__cols">
        <div className="uw__panel">
          <H>Deal</H>
          <R label="Units" v={deal.units} on={set("units")} />
          <R label="Avg in-place rent ($/mo)" v={deal.avgRent} on={set("avgRent")} />
          <R label="Other income ($/unit/mo)" v={deal.otherIncomePerUnit} on={set("otherIncomePerUnit")} />
          <R label="Expense ratio" v={deal.expenseRatio} on={set("expenseRatio")} pct />
          <R label="Going-in cap" v={deal.goingInCap} on={set("goingInCap")} pct />
          <H>Financing</H>
          <R label="LTV" v={deal.ltv} on={set("ltv")} pct />
          <R label="Rate" v={deal.rate} on={set("rate")} pct />
          <R label="IO period (months)" v={deal.ioMonths} on={set("ioMonths")} />
          <R label="Amortization (years)" v={deal.amortYears} on={set("amortYears")} />
          <R label="Closing / cap-ex" v={deal.closingPct} on={set("closingPct")} pct />
          <H accent>Market Read <em>· auto-filled, editable</em></H>
          <R label="Rent growth · Yr 1" v={fa?.rentGrowthY1} on={setOvr("rentGrowthY1")} pct auto />
          <R label="Rent growth · Yr 2" v={fa?.rentGrowthY2} on={setOvr("rentGrowthY2")} pct auto />
          <R label="Rent growth · after" v={fa?.rentGrowthSubsequent} on={setOvr("rentGrowthSubsequent")} pct auto />
          <R label="Stabilized vacancy" v={fa?.stabilizedVacancy} on={setOvr("stabilizedVacancy")} pct auto />
          <R label="Exit cap rate" v={fa?.exitCapRate} on={setOvr("exitCapRate")} pct auto />
          <R label="Expense growth" v={deal.expenseGrowth} on={set("expenseGrowth")} pct />
          <H>Hold & exit</H>
          <R label="Hold — sell year (A)" v={deal.holdYear} on={set("holdYear")} />
          <R label="Refi year (B)" v={deal.refiYear} on={set("refiYear")} />
          <R label="Sell year (B)" v={deal.sellYear} on={set("sellYear")} />
          <R label="Refi LTV" v={deal.refiLTV} on={set("refiLTV")} pct />
          <R label="Refi rate (IO)" v={deal.refiRate} on={set("refiRate")} pct />
          <H>Promote (LP / GP)</H>
          <R label="LP equity share" v={deal.lpEquityShare} on={set("lpEquityShare")} pct />
          <R label="Preferred return" v={deal.prefRate} on={set("prefRate")} pct />
          <R label="Above-H3 LP share" v={deal.lpShare4} on={set("lpShare4")} pct />
        </div>

        <div className="uw__res">
          <div className={`uw__deal ${gated ? "blur" : ""}`}>
            <S k="Purchase price" v={$(out?.p.price)} />
            <S k="Loan" v={$(out?.p.loan)} />
            <S k="Equity" v={$(out?.p.equity)} />
            <S k="Yr-1 NOI" v={$(out?.p.noi[1])} />
          </div>
          <div className="uw__paths">
            <P title="Path A · Sell at hold" r={out?.es.pathA} gated={gated} />
            <P title="Path B · Refi & hold" r={out?.es.pathB} gated={gated} extra={`Cash-out ${$(out?.es.pathB?.cashOut)}`} />
          </div>
          <div className="uw__rec">
            <span className="uw__recK">CIGNAL RECOMMENDATION</span>
            <div className="uw__recBig">{out?.es.rec}</div>
            <p className="uw__recWhy">{out?.es.why}</p>
            <div className="uw__recRow">
              <span>Math favors: <b>{out?.es.mathFavors}</b></span>
              <span className={out?.es.aligned ? "up" : "down"}>{out?.es.aligned ? "Aligned" : "Divergent"}</span>
            </div>
          </div>
          {!gated ? (
            <div className="uw__save">
              <input placeholder="Deal name" value={dealName} onChange={(e) => setDealName(e.target.value)} />
              <button onClick={saveDeal} disabled={saveStatus === "saving"}>
                {saveStatus === "saved" ? "Saved \u2713" : saveStatus === "saving" ? "Saving\u2026" : "Save to Portfolio"}
              </button>
              {saveStatus === "error" && <span className="down">Couldn’t save.</span>}
              {saveStatus === "login" && <span className="down">Log in to save.</span>}
            </div>
          ) : <div className="uw__upsell">Upgrade to Pro to run live underwriting.</div>}
          <div className="uw__foot">Engine {mr?.engineMethodVersion} · a decision tool, not investment advice</div>
        </div>
      </div>

      <style jsx>{`
        .uw { color:#ECEDEF; font-family:'IBM Plex Mono',ui-monospace,monospace; }
        .uw--msg { padding:22px; color:#797E85; background:#0E0F11; border:1px solid #1e2126; border-radius:12px; }
        .uw__cols { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media (max-width:820px){ .uw__cols { grid-template-columns:1fr; } }
        .uw__panel, .uw__res { background:#0E0F11; border:1px solid #1e2126; border-radius:12px; padding:16px 18px; }
        .uw__deal { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
        .uw__deal.blur { filter:blur(5px); }
        .uw__paths { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:10px; }
        @media (max-width:480px){ .uw__paths,.uw__deal { grid-template-columns:1fr; } }
        .uw__rec { margin-top:12px; padding:14px; background:#08090A; border:1px solid #2a2410; border-radius:10px; }
        .uw__recK { font-size:10px; letter-spacing:.22em; color:#F5B544; }
        .uw__recBig { font-family:Archivo,sans-serif; font-size:22px; font-weight:800; margin:4px 0; color:#ECEDEF; }
        .uw__recWhy { font-size:12px; color:#797E85; margin:0 0 8px; }
        .uw__recRow { display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; font-size:12px; border-top:1px solid #1e2126; padding-top:8px; color:#ECEDEF; }
        .up { color:#5FB97C; } .down { color:#E5634D; }
        .uw__save { display:flex; gap:8px; align-items:center; margin-top:12px; }
        .uw__save input { flex:1; padding:9px 11px; border:1px solid #2a2c2f; border-radius:8px; font-size:13px; background:#08090A; color:#ECEDEF; color-scheme:dark; font-family:inherit; }
        .uw__save button { padding:9px 14px; border:0; border-radius:8px; background:#F5B544; color:#08090A; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
        .uw__save button:disabled { opacity:.6; }
        .uw__upsell { margin-top:10px; padding:12px; background:#08090A; border:1px solid #2a2410; color:#E8B04B; font-size:13px; text-align:center; border-radius:8px; }
        .uw__foot { margin-top:12px; font-size:10.5px; color:#5b5f66; }
      `}</style>
    </div>
  );
}

function H({ children, accent }) {
  return (<div style={{ margin: "16px 0 8px", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase",
    color: accent ? "#F5B544" : "#797E85" }}>{children}<style jsx>{`div em{ text-transform:none; letter-spacing:0; color:#5b5f66; font-style:normal; }`}</style></div>);
}
function R({ label, v, on, pct, auto }) {
  const display = pct && typeof v === "number" ? +(v * 100).toFixed(3) : v;
  const onChange = (e) => on(pct ? { target: { value: e.target.value === "" ? "" : String(parseFloat(e.target.value) / 100) } } : e);
  return (
    <label className="row">
      <span>{label}</span>
      <input type="number" step={pct ? 0.1 : 1} value={display} onChange={onChange} data-auto={auto ? "1" : undefined} />
      <style jsx>{`
        .row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:5px 0; font-size:12px; color:#9aa0a6; }
        .row input { width:92px; padding:5px 8px; border:1px solid #2a2c2f; border-radius:6px; font-size:12.5px; text-align:right;
                     background:#08090A; color:#ECEDEF; color-scheme:dark; font-family:'IBM Plex Mono',monospace; }
        .row input[data-auto="1"] { border-color:#7a5f1e; background:#14100a; }
      `}</style>
    </label>
  );
}
function S({ k, v }) {
  return (<div style={{ background: "#08090A", border: "1px solid #1e2126", borderRadius: 8, padding: "9px 11px" }}>
    <div style={{ fontSize: 10.5, color: "#797E85", letterSpacing: ".08em" }}>{k}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "#ECEDEF" }}>{v}</div></div>);
}
function P({ title, r, gated, extra }) {
  const irr = r ? (r.irr == null ? "—" : (r.irr * 100).toFixed(1) + "%") : "—";
  return (<div style={{ background: "#08090A", border: "1px solid #1e2126", borderRadius: 10, padding: "12px 13px" }}>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#F5B544", marginBottom: 6 }}>{title}</div>
    <div style={{ filter: gated ? "blur(5px)" : "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10.5, color: "#797E85" }}>IRR</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#ECEDEF" }}>{irr}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#9aa0a6", marginTop: 4 }}>
        <span>EM {r ? r.em.toFixed(2) + "x" : "—"}</span><span>{r ? "$" + Math.round(r.profit).toLocaleString() : "—"}</span></div>
      {extra && <div style={{ fontSize: 10.5, color: "#5b5f66", marginTop: 3 }}>{extra}</div>}
      {r?.split && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1e2126", fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#9aa0a6" }}><span>LP</span>
            <b style={{ color: "#ECEDEF" }}>{r.split.lp.irr == null ? "—" : (r.split.lp.irr * 100).toFixed(1) + "%"} · {r.split.lp.em.toFixed(2)}x</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#9aa0a6" }}><span>GP</span>
            <b style={{ color: "#ECEDEF" }}>{r.split.gp.irr == null ? "—" : (r.split.gp.irr * 100).toFixed(1) + "%"} · {r.split.gp.em.toFixed(2)}x</b></div>
        </div>)}
    </div></div>);
}
