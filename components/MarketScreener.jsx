"use client";
import { useState, useEffect, useMemo } from "react";
import { Download, ArrowUpDown } from "lucide-react";

const pc = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");
const n2 = (x) => (x == null ? "—" : (x >= 0 ? "+" : "") + x.toFixed(2));
const cls = (x) => (x == null ? "" : x >= 0 ? "up" : "down");

const COLS = [
  { k: "name", label: "Market", align: "left" },
  { k: "phase", label: "Phase", align: "left" },
  { k: "momY1", label: "Momentum", fmt: n2, num: true },
  { k: "demand", label: "Demand", fmt: n2, num: true },
  { k: "rentYoY", label: "Rent YoY", fmt: (x) => pc(x), num: true },
  { k: "rentQoQann", label: "Rent QoQ", fmt: (x) => pc(x), num: true },
  { k: "empSignal", label: "Emp", fmt: n2, num: true },
  { k: "supplyNearTerm", label: "Supply", fmt: n2, num: true },
  { k: "vacancy", label: "Vac", fmt: (x) => pc(x), num: true },
];

function phaseClass(p = "") {
  const s = p.toLowerCase();
  if (s.includes("recovery") || s.includes("turning")) return "ph-rec";
  if (s.includes("expansion")) return "ph-exp";
  if (s.includes("hypersupply") || s.includes("soft")) return "ph-hyp";
  if (s.includes("contraction")) return "ph-con";
  return "";
}

export default function MarketScreener() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState("All");
  const [sortKey, setSortKey] = useState("momY1");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    fetch("/api/underwriting/screener").then((r) => r.json()).then((d) => setRows(d.metros || [])).catch(() => setRows([]));
  }, []);

  const phases = useMemo(() => (rows ? ["All", ...Array.from(new Set(rows.map((r) => r.phase)))] : ["All"]), [rows]);

  const view = useMemo(() => {
    if (!rows) return [];
    let v = rows.filter((r) => (phase === "All" || r.phase === phase) && (!q || r.name?.toLowerCase().includes(q.toLowerCase())));
    v = [...v].sort((a, b) => {
      const x = a[sortKey], y = b[sortKey];
      if (typeof x === "string") return sortDir === "asc" ? x.localeCompare(y) : y.localeCompare(x);
      const xn = x ?? -Infinity, yn = y ?? -Infinity;
      return sortDir === "asc" ? xn - yn : yn - xn;
    });
    return v;
  }, [rows, q, phase, sortKey, sortDir]);

  function sortBy(k) {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "name" || k === "phase" ? "asc" : "desc"); }
  }

  function downloadCSV() {
    const head = ["Market", "CBSA", "Phase", "MomentumY1", "MomentumY2", "Demand", "RentYoY", "RentQoQann", "EmpYoY", "EmpSignal", "SupplySignal", "AbsorptionSignal", "Vacancy", "SupplyStale"];
    const line = (r) => [r.name, r.cbsa, r.phase, r.momY1, r.momY2, r.demand, r.rentYoY, r.rentQoQann, r.empYoY, r.empSignal, r.supplyNearTerm, r.absorptionSignal, r.vacancy, r.supplyStale]
      .map((x) => (x == null ? "" : `"${String(x).replace(/"/g, '""')}"`)).join(",");
    const csv = [head.join(","), ...view.map(line)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `cignal_market_screen_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="sc">
      <div className="sc__bar">
        <input className="sc__search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter markets…" />
        <select className="sc__phase" value={phase} onChange={(e) => setPhase(e.target.value)}>
          {phases.map((p) => (<option key={p} value={p}>{p === "All" ? "All phases" : p}</option>))}
        </select>
        <span className="sc__count">{rows ? `${view.length} of ${rows.length} markets` : "loading…"}</span>
        <button className="sc__csv" onClick={downloadCSV} disabled={!rows}><Download size={14} strokeWidth={2} /> Download CSV</button>
      </div>

      <div className="sc__wrap">
        <table className="sc__tbl">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.k} onClick={() => sortBy(c.k)} className={c.align === "left" ? "l" : ""} data-active={sortKey === c.k}>
                  <span>{c.label}<ArrowUpDown size={11} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows && <tr><td colSpan={COLS.length} className="sc__msg">Loading 465 markets…</td></tr>}
            {rows && view.length === 0 && <tr><td colSpan={COLS.length} className="sc__msg">No markets match.</td></tr>}
            {view.map((r) => (
              <tr key={r.cbsa}>
                <td className="l sc__mkt">{r.name}{r.supplyStale && <i title="permits stale">·</i>}</td>
                <td className="l"><span className={`sc__ph ${phaseClass(r.phase)}`}>{r.phase}</span></td>
                <td className={cls(r.momY1)}>{n2(r.momY1)}</td>
                <td className={cls(r.demand)}>{n2(r.demand)}</td>
                <td className={cls(r.rentYoY)}>{pc(r.rentYoY)}</td>
                <td className={cls(r.rentQoQann)}>{pc(r.rentQoQann)}</td>
                <td className={cls(r.empSignal)}>{n2(r.empSignal)}</td>
                <td className={cls(-r.supplyNearTerm)}>{n2(r.supplyNearTerm)}</td>
                <td>{pc(r.vacancy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .sc { font-family:'IBM Plex Mono',ui-monospace,monospace; color:#ECEDEF; }
        .sc__bar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
        .sc__search, .sc__phase { padding:9px 12px; border:1px solid #2a2c2f; border-radius:9px; background:#0E0F11; color:#ECEDEF; color-scheme:dark; font-size:13px; font-family:'IBM Plex Mono',monospace; }
        .sc__search { width:220px; max-width:100%; }
        .sc__count { font-size:12px; color:#797E85; }
        .sc__csv { display:inline-flex; align-items:center; gap:6px; margin-left:auto; padding:9px 15px; border:0; border-radius:999px; background:#F5B544; color:#08090A; font-weight:700; font-size:12.5px; cursor:pointer; }
        .sc__csv:disabled { opacity:.5; }
        .sc__wrap { border:1px solid #1e2126; border-radius:12px; overflow:auto; max-height:70vh; }
        .sc__tbl { width:100%; border-collapse:collapse; font-size:12.5px; }
        .sc__tbl thead th { position:sticky; top:0; background:#0E0F11; color:#797E85; text-align:right; padding:10px 12px; cursor:pointer; white-space:nowrap; border-bottom:1px solid #1e2126; font-weight:600; }
        .sc__tbl thead th.l { text-align:left; }
        .sc__tbl thead th span { display:inline-flex; align-items:center; gap:4px; }
        .sc__tbl thead th :global(svg) { opacity:.35; }
        .sc__tbl thead th[data-active="true"] { color:#F5B544; }
        .sc__tbl tbody td { text-align:right; padding:9px 12px; border-bottom:1px solid #141619; color:#c9ccd1; white-space:nowrap; }
        .sc__tbl tbody td.l { text-align:left; }
        .sc__tbl tbody tr:hover td { background:rgba(255,255,255,.02); }
        .sc__mkt { color:#ECEDEF; font-weight:600; } .sc__mkt i { color:#7a5f1e; font-style:normal; margin-left:3px; }
        .sc__ph { font-size:10.5px; padding:2px 7px; border-radius:999px; border:1px solid #26292e; color:#9aa0a6; }
        .sc__ph.ph-rec { color:#5FB97C; border-color:#1E5631; } .sc__ph.ph-exp { color:#5FB97C; border-color:#2a4a2f; }
        .sc__ph.ph-hyp { color:#E8B04B; border-color:#4a3a12; } .sc__ph.ph-con { color:#E5634D; border-color:#5E1E1E; }
        .sc__msg { text-align:center; color:#797E85; padding:26px; }
        .up { color:#5FB97C; } .down { color:#E5634D; }
      `}</style>
    </div>
  );
}
