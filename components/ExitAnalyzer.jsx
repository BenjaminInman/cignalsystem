"use client";
import { useState, useMemo } from "react";
import { runMarketRead } from "@/lib/underwriting/engine";
import { analyzeExit } from "@/lib/underwriting/exit-analyzer";

const $ = (n) => (n == null || isNaN(n) ? "—" : "$" + Math.round(n).toLocaleString());
const pc = (x, dp = 1) => (x == null ? "—" : (x * 100).toFixed(dp) + "%");
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

const DEF = {
  currentNOI: 600000, noiGrowth: 0.03, currentCap: 0.05, loanBalance: 6000000,
  refiLTV: 0.65, refiRate: 0.06, refiCost: 0.01, saleCost: 0.02, holdYears: 5, reinvestHurdle: 0.08,
};

export default function ExitAnalyzer({ mr, scenario = "base", marketName }) {
  const [d, setD] = useState(DEF);
  const [exitCapOv, setExitCapOv] = useState(null);
  const fa = mr?.inputs ? runMarketRead({ ...mr.inputs, goingInCap: d.currentCap }, scenario).forwardAssumptions : null;
  const exitCap = exitCapOv ?? fa?.exitCapRate ?? 0.06;
  const out = useMemo(() => (mr?.signals ? analyzeExit({ ...d, exitCap }, mr.signals) : null), [d, exitCap, mr]);

  const set = (k) => (e) => setD({ ...d, [k]: num(e.target.value) });
  const setPct = (k) => (e) => setD({ ...d, [k]: e.target.value === "" ? 0 : num(e.target.value) / 100 });

  if (!mr) return <div className="ea ea--msg">Select a market to begin.</div>;

  return (
    <div className="ea">
      <div className="ea__cols">
        <div className="ea__panel">
          <H>The asset (as you hold it today)</H>
          <R label="Current NOI (annual)" v={d.currentNOI} on={set("currentNOI")} />
          <R label="NOI growth (per yr)" v={d.noiGrowth} on={setPct("noiGrowth")} pct />
          <R label="Current cap (sell today at)" v={d.currentCap} on={setPct("currentCap")} pct />
          <div className="ea__hint">Implied value today ≈ {$(out?.currentValue)}</div>
          <R label="Current loan balance" v={d.loanBalance} on={set("loanBalance")} />
          <H>Refinance & hold</H>
          <R label="Refi LTV" v={d.refiLTV} on={setPct("refiLTV")} pct />
          <R label="Refi rate (IO)" v={d.refiRate} on={setPct("refiRate")} pct />
          <R label="Hold length (years)" v={d.holdYears} on={set("holdYears")} />
          <R label="Exit cap (year of sale)" v={exitCap} on={(e) => setExitCapOv(e.target.value === "" ? null : num(e.target.value) / 100)} pct auto />
          <H accent>Decision inputs</H>
          <R label="Reinvestment hurdle" v={d.reinvestHurdle} on={setPct("reinvestHurdle")} pct />
          <div className="ea__note">What you’d earn redeploying the sale proceeds elsewhere. Hold only wins if it beats this.</div>
        </div>

        <div className="ea__res">
          <div className="ea__two">
            <div className="ea__path">
              <div className="ea__pk">SELL NOW</div>
              <div className="ea__big">{$(out?.netSaleNow)}</div>
              <div className="ea__sub">net proceeds in hand</div>
              <div className="ea__line"><span>at {pc(d.currentCap, 1)} cap</span></div>
            </div>
            <div className="ea__path ea__path--gold">
              <div className="ea__pk">REFINANCE & HOLD</div>
              <div className="ea__big">{out?.holdIRR == null ? "—" : pc(out.holdIRR)}</div>
              <div className="ea__sub">IRR on equity kept in · {out ? out.holdEM?.toFixed(2) + "x" : "—"}</div>
              <div className="ea__line"><span>Cash-out now</span><b>{$(out?.cashOut)}</b></div>
              <div className="ea__line"><span>Capital left in</span><b>{$(out?.capitalLeftIn)}</b></div>
              <div className="ea__line"><span>Net sale · yr {d.holdYears}</span><b>{$(out?.netSaleS)}</b></div>
            </div>
          </div>

          <div className="ea__phase"><span>Cycle phase</span><strong>{mr.phase}</strong></div>

          <div className="ea__rec">
            <span className="ea__rk">CIGNAL RECOMMENDATION</span>
            <div className="ea__rbig">{out?.rec}</div>
            <p className="ea__rwhy">{out?.why}</p>
            <div className="ea__rrow">
              <span>Math favors: <b>{out?.mathFavors}</b> {out ? `(hold ${pc(out.holdIRR)} vs ${pc(d.reinvestHurdle)} hurdle)` : ""}</span>
              <span className={out?.aligned ? "up" : "down"}>{out?.aligned ? "Aligned" : "Divergent"}</span>
            </div>
          </div>
          <div className="ea__foot">Engine {mr.engineMethodVersion} · a decision tool, not investment advice</div>
        </div>
      </div>

      <style jsx>{`
        .ea { color:#ECEDEF; font-family:'IBM Plex Mono',ui-monospace,monospace; }
        .ea--msg { padding:22px; color:#797E85; background:#0E0F11; border:1px solid #1e2126; border-radius:12px; }
        .ea__cols { display:grid; grid-template-columns:1fr 1.1fr; gap:14px; }
        @media (max-width:800px){ .ea__cols { grid-template-columns:1fr; } }
        .ea__panel, .ea__res { background:#0E0F11; border:1px solid #1e2126; border-radius:12px; padding:16px 18px; }
        .ea__hint, .ea__note { font-size:10.5px; color:#5b5f66; margin:-2px 0 6px; }
        .ea__note { margin-top:6px; line-height:1.5; }
        .ea__two { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        @media (max-width:520px){ .ea__two { grid-template-columns:1fr; } }
        .ea__path { background:#08090A; border:1px solid #1e2126; border-radius:10px; padding:13px; }
        .ea__path--gold { border-color:#2a2410; }
        .ea__pk { font-size:10px; letter-spacing:.16em; color:#797E85; }
        .ea__path--gold .ea__pk { color:#F5B544; }
        .ea__big { font-family:Archivo,sans-serif; font-size:26px; font-weight:800; margin:3px 0 1px; }
        .ea__sub { font-size:10.5px; color:#797E85; margin-bottom:8px; }
        .ea__line { display:flex; justify-content:space-between; font-size:11.5px; color:#9aa0a6; padding:3px 0; border-top:1px solid #16181b; }
        .ea__line b { color:#ECEDEF; }
        .ea__phase { display:flex; justify-content:space-between; margin:12px 0; padding:10px 12px; background:#08090A; border:1px solid #1e2126; border-radius:8px; }
        .ea__phase span { font-size:11px; color:#797E85; } .ea__phase strong { font-size:13px; color:#F5B544; }
        .ea__rec { padding:14px; background:#08090A; border:1px solid #2a2410; border-radius:10px; }
        .ea__rk { font-size:10px; letter-spacing:.22em; color:#F5B544; }
        .ea__rbig { font-family:Archivo,sans-serif; font-size:20px; font-weight:800; margin:4px 0; }
        .ea__rwhy { font-size:12px; color:#797E85; margin:0 0 8px; }
        .ea__rrow { display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; font-size:11.5px; border-top:1px solid #1e2126; padding-top:8px; }
        .up { color:#5FB97C; } .down { color:#E5634D; }
        .ea__foot { margin-top:12px; font-size:10.5px; color:#5b5f66; }
      `}</style>
    </div>
  );
}

function H({ children, accent }) {
  return (<div style={{ margin: "16px 0 8px", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: accent ? "#F5B544" : "#797E85" }}>{children}
    {typeof children === "string" && children.length > 24 ? null : null}</div>);
}
function R({ label, v, on, pct, auto }) {
  const display = pct && typeof v === "number" ? +(v * 100).toFixed(2) : v;
  return (
    <label className="row">
      <span>{label}</span>
      <input type="number" step={pct ? 0.1 : 1} value={display} onChange={on} data-auto={auto ? "1" : undefined} />
      <style jsx>{`
        .row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:5px 0; font-size:12px; color:#9aa0a6; }
        .row input { width:120px; padding:6px 9px; border:1px solid #2a2c2f; border-radius:6px; font-size:13px; text-align:right;
                     background:#08090A; color:#ECEDEF; color-scheme:dark; font-family:'IBM Plex Mono',monospace; }
        .row input[data-auto="1"] { border-color:#7a5f1e; background:#14100a; }
      `}</style>
    </label>
  );
}
