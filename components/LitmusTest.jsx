"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import { litmus, DEFAULT_THRESHOLDS } from "@/lib/underwriting/litmus";

const $ = (n) => (n == null || isNaN(n) ? "—" : "$" + Math.round(n).toLocaleString());
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt = (v, kind) => (v == null ? "—" : kind === "pct" ? (v * 100).toFixed(1) + "%" : v.toFixed(2) + "×");

const DEFAULT = {
  units: 80, price: 8000000, avgRent: 1250, expenseRatio: 0.45, vacancy: 0.07, ltv: 0.65, rate: 0.065,
  valueAdd: false, rehabPerUnit: 15000, stabilizedRent: 1400,
};

export default function LitmusTest() {
  const [d, setD] = useState(DEFAULT);
  const [t, setT] = useState(DEFAULT_THRESHOLDS);
  const out = useMemo(() => litmus({ ...d, thresholds: t }), [d, t]);

  const set = (k) => (e) => setD({ ...d, [k]: num(e.target.value) });
  const setPct = (k) => (e) => setD({ ...d, [k]: e.target.value === "" ? 0 : num(e.target.value) / 100 });
  const setTh = (k) => (e) => setT({ ...t, [k]: e.target.value === "" ? 0 : num(e.target.value) / 100 });
  const pass = out.verdict === "PASS";

  return (
    <div className="lt">
      <div className="lt__cols">
        {/* inputs */}
        <div className="lt__panel">
          <div className="lt__vahead">
            <H>Deal</H>
            <label className="lt__toggle">
              <input type="checkbox" checked={d.valueAdd} onChange={(e) => setD({ ...d, valueAdd: e.target.checked })} />
              <span>Value-add</span>
            </label>
          </div>
          <R label="Units" v={d.units} on={set("units")} />
          <R label="Purchase price" v={d.price} on={set("price")} />
          <div className="lt__hint">≈ {$(out.perUnit)} / unit</div>
          <R label="Avg in-place rent ($/mo)" v={d.avgRent} on={set("avgRent")} />
          <R label="Expense ratio" v={d.expenseRatio} on={setPct("expenseRatio")} pct />
          <R label="Vacancy factor" v={d.vacancy} on={setPct("vacancy")} pct />
          <R label="LTV" v={d.ltv} on={setPct("ltv")} pct />
          <R label="Rate" v={d.rate} on={setPct("rate")} pct />
          {d.valueAdd && (<>
            <H>Value-add</H>
            <R label="Rehab ($/unit)" v={d.rehabPerUnit} on={set("rehabPerUnit")} />
            <R label="Stabilized rent ($/mo)" v={d.stabilizedRent} on={set("stabilizedRent")} />
          </>)}

          <H accent>Pass criteria <em>· your bar, editable</em></H>
          {d.valueAdd ? (<>
            <R label="Min development spread" v={t.spreadMin} on={setTh("spreadMin")} pct auto />
            <R label="Min yield-on-cost" v={t.yocMin} on={setTh("yocMin")} pct auto />
            <R label="Min DSCR" v={t.dscrMin} on={(e) => setT({ ...t, dscrMin: num(e.target.value) })} auto />
          </>) : (<>
            <R label="Min going-in cap" v={t.capMin} on={setTh("capMin")} pct auto />
            <R label="Min DSCR" v={t.dscrMin} on={(e) => setT({ ...t, dscrMin: num(e.target.value) })} auto />
            <R label="Min cash-on-cash" v={t.cocMin} on={setTh("cocMin")} pct auto />
          </>)}
        </div>

        {/* verdict */}
        <div className="lt__res">
          <div className="lt__metrics">
            <M k="$ / unit" v={$(out.perUnit)} />
            <M k="Going-in cap" v={fmt(out.goingInCap, "pct")} />
            {d.valueAdd ? (<>
              <M k="Yield-on-cost" v={fmt(out.va?.yoc, "pct")} />
              <M k="Dev. spread" v={fmt(out.va?.spread, "pct")} />
            </>) : (<>
              <M k="DSCR" v={fmt(out.dscr, "x")} />
              <M k="Cash-on-cash" v={fmt(out.coc, "pct")} />
            </>)}
          </div>

          <div className={`lt__verdict ${pass ? "is-pass" : "is-fail"}`}>
            <span className="lt__vk">{pass ? "PASS" : "FAIL"}</span>
            <span className="lt__vsub">{pass ? "Worth the full model." : "Doesn’t clear the bar."}</span>
          </div>

          <div className="lt__checks">
            {out.checks.map((c) => (
              <div key={c.key} className={`lt__chk ${c.pass ? "ok" : "no"}`}>
                {c.pass ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
                <span className="lt__ck">{c.key}</span>
                <span className="lt__cv">{fmt(c.v, c.fmt)} <em>vs {fmt(c.min, c.fmt)}</em></span>
              </div>
            ))}
          </div>

          {pass && (
            <Link href={`/underwrite?${new URLSearchParams({
              units: d.units, avgRent: d.avgRent, expenseRatio: d.expenseRatio,
              vacancy: d.vacancy, ltv: d.ltv, rate: d.rate, cap: out.goingInCap.toFixed(4),
            }).toString()}`} className="lt__run">Run the full model <ArrowUpRight size={15} strokeWidth={2} /></Link>
          )}
          <div className="lt__foot">Market-agnostic quick screen · a filter, not underwriting</div>
        </div>
      </div>

      <style jsx>{`
        .lt { color:#ECEDEF; font-family:'IBM Plex Mono',ui-monospace,monospace; }
        .lt__cols { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media (max-width:760px){ .lt__cols { grid-template-columns:1fr; } }
        .lt__panel, .lt__res { background:#0E0F11; border:1px solid #1e2126; border-radius:12px; padding:16px 18px; }
        .lt__vahead { display:flex; justify-content:space-between; align-items:center; }
        .lt__toggle { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#9aa0a6; cursor:pointer; }
        .lt__toggle input { accent-color:#F5B544; }
        .lt__hint { font-size:11px; color:#5b5f66; text-align:right; margin:-2px 0 4px; }
        .lt__metrics { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
        .lt__verdict { margin:14px 0; padding:16px; border-radius:10px; text-align:center; }
        .lt__verdict.is-pass { background:#0E1A12; border:1px solid #1E5631; }
        .lt__verdict.is-fail { background:#1A0E0E; border:1px solid #5E1E1E; }
        .lt__vk { display:block; font-family:Archivo,sans-serif; font-size:34px; font-weight:800; letter-spacing:.04em; }
        .is-pass .lt__vk { color:#5FB97C; } .is-fail .lt__vk { color:#E5634D; }
        .lt__vsub { font-size:12px; color:#797E85; }
        .lt__checks { display:flex; flex-direction:column; gap:6px; }
        .lt__chk { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:7px; background:#08090A; border:1px solid #1e2126; font-size:12px; }
        .lt__chk.ok { color:#5FB97C; } .lt__chk.no { color:#E5634D; }
        .lt__ck { flex:1; color:#ECEDEF; } .lt__chk.no .lt__ck { color:#E5634D; }
        .lt__cv { color:#9aa0a6; } .lt__cv em { color:#5b5f66; font-style:normal; }
        .lt__run { display:flex; align-items:center; justify-content:center; gap:6px; margin-top:14px; padding:11px; border-radius:9px;
                   background:#F5B544; color:#08090A; font-weight:700; font-size:13px; text-decoration:none; }
        .lt__foot { margin-top:12px; font-size:10.5px; color:#5b5f66; text-align:center; }
      `}</style>
    </div>
  );
}

function H({ children, accent }) {
  return (<div style={{ margin: "16px 0 8px", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: accent ? "#F5B544" : "#797E85" }}>
    {children}<style jsx>{`div em{ text-transform:none; letter-spacing:0; color:#5b5f66; font-style:normal; }`}</style></div>);
}
function M({ k, v }) {
  return (<div style={{ background: "#08090A", border: "1px solid #1e2126", borderRadius: 8, padding: "10px 11px" }}>
    <div style={{ fontSize: 10.5, color: "#797E85" }}>{k}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: "#ECEDEF" }}>{v}</div></div>);
}
function R({ label, v, on, pct, auto }) {
  const display = pct && typeof v === "number" ? +(v * 100).toFixed(2) : v;
  return (
    <label className="row">
      <span>{label}</span>
      <input type="number" step={pct ? 0.1 : 1} value={display} onChange={on} data-auto={auto ? "1" : undefined} />
      <style jsx>{`
        .row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:5px 0; font-size:12px; color:#9aa0a6; }
        .row input { width:110px; padding:6px 9px; border:1px solid #2a2c2f; border-radius:6px; font-size:13px; text-align:right;
                     background:#08090A; color:#ECEDEF; color-scheme:dark; font-family:'IBM Plex Mono',monospace; }
        .row input[data-auto="1"] { border-color:#7a5f1e; background:#14100a; }
      `}</style>
    </label>
  );
}
