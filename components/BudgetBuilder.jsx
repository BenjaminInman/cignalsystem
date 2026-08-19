"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { Upload, Loader2, ChevronDown, ChevronRight, AlertTriangle, Search, Info } from "lucide-react";
import { BUDGET_CATEGORIES, CAT_BY_KEY, SECTION_ORDER, SECTION_LABEL } from "@/lib/budget/taxonomy";

const $ = (n) => (n == null || isNaN(n) ? "—" : (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString());
const pct = (f) => (f == null || isNaN(f) ? "—" : (f * 100).toFixed(1) + "%");
const REMAP = BUDGET_CATEGORIES.map((c) => ({ key: c.key, label: c.label }));

export default function BudgetBuilder() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [meta, setMeta] = useState(null);
  const [lines, setLines] = useState(null);
  const [open, setOpen] = useState({});
  const [view, setView] = useState("review");
  const inputRef = useRef(null);

  // ---- market + drivers ----
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [market, setMarket] = useState(null); // {cbsa, name}
  const [rates, setRates] = useState(null);
  const [components, setComponents] = useState(null);
  const [phase, setPhase] = useState(null);
  const [rBusy, setRBusy] = useState(false);
  const [overrides, setOverrides] = useState({});
  const box = useRef(null);

  async function extract() {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("t12", file);
      const r = await fetch("/api/budget/extract", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Extraction failed."); setBusy(false); return; }
      const flat = [];
      for (const [key, v] of Object.entries(d.categories || {})) for (const li of v.lines) flat.push({ ...li, category: key });
      setMeta({ ...d.property_meta, period: d.period_detected, count: d.line_count });
      setLines(flat);
    } catch { setErr("Something went wrong reading the file."); }
    setBusy(false);
  }

  const grouped = useMemo(() => {
    if (!lines) return null;
    const cats = {};
    for (const li of lines) { (cats[li.category] ||= { total: 0, lines: [] }); cats[li.category].total += li.amount; cats[li.category].lines.push(li); }
    const sum = (ks) => ks.reduce((s, k) => s + (cats[k]?.total || 0), 0);
    const income = sum(["market_rent","loss_to_lease","vacancy_loss","concessions","bad_debt","other_income","utility_reimb","other_reimb"]);
    const controllable = sum(["payroll","utilities","contract_services","turnover","repairs","marketing","administrative"]);
    const noncontrollable = sum(["management_fee","insurance","property_taxes"]);
    return { cats, income, controllable, noncontrollable, noi: income - controllable - noncontrollable };
  }, [lines]);

  function remap(ref, key) { setLines((p) => p.map((l) => (l === ref ? { ...l, category: key } : l))); }

  // market typeahead
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/underwriting/resolve-market?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json()).then((d) => setResults(d.results || [])).catch(() => setResults([]));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setResults([]); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // prefill market from extracted city/state when we enter the drivers view
  useEffect(() => {
    if (view !== "drivers" || market || !meta?.city) return;
    const guess = `${meta.city}${meta.state ? ", " + meta.state : ""}`;
    fetch(`/api/underwriting/resolve-market?q=${encodeURIComponent(guess)}`)
      .then((r) => r.json()).then((d) => { if (d.results?.[0]) pick(d.results[0]); }).catch(() => {});
  }, [view]); // eslint-disable-line

  async function pick(m) {
    setMarket(m); setQ(""); setResults([]); setRBusy(true); setRates(null);
    try {
      const r = await fetch(`/api/budget/drivers?cbsa=${m.cbsa}`);
      const d = await r.json();
      setRates(d.rates || null); setComponents(d.components || null); setPhase(d.phase || null);
    } catch { setErr("Couldn't load market drivers."); }
    setRBusy(false);
  }

  const projected = useMemo(() => {
    if (!grouped || !rates) return null;
    const g = (cat) => (overrides[cat.key] ?? rates[cat.driverKey] ?? 0);
    const rows = {}; let inc = 0, ctrl = 0, non = 0;
    for (const cat of BUDGET_CATEGORIES) { if (cat.section !== "revenue" || !grouped.cats[cat.key]) continue; const base = grouped.cats[cat.key].total, growth = g(cat), next = base * (1 + growth); rows[cat.key] = { base, growth, next }; inc += next; }
    for (const cat of BUDGET_CATEGORIES) { if (cat.section !== "controllable" || !grouped.cats[cat.key]) continue; const base = grouped.cats[cat.key].total, growth = g(cat), next = base * (1 + growth); rows[cat.key] = { base, growth, next }; ctrl += next; }
    for (const cat of BUDGET_CATEGORIES) {
      if (cat.section !== "noncontrollable" || !grouped.cats[cat.key]) continue;
      const base = grouped.cats[cat.key].total;
      if (cat.key === "management_fee") { const defPct = grouped.income ? base / grouped.income : 0.03; const feePct = overrides.__mgmt ?? defPct; const next = feePct * inc; rows[cat.key] = { base, growth: feePct, next, isFee: true }; non += next; }
      else { const growth = g(cat), next = base * (1 + growth); rows[cat.key] = { base, growth, next }; non += next; }
    }
    return { rows, inc, ctrl, non, noi: inc - ctrl - non };
  }, [grouped, rates, overrides]);

  function why(cat) {
    if (cat.driverKey === "rent") return "Cycle-adjusted rent signal (forward)";
    if (cat.key === "management_fee") return "% of projected EGI";
    if (cat.driverKey === "insurance" || cat.driverKey === "tax") return "Editable default — no clean series, set it yourself";
    const c = components?.[cat.driverKey];
    if (c && c.trailing != null) return `trailing ${pct(c.trailing)} → reverts toward ${pct(c.norm)} norm`;
    return cat.driver;
  }

  // ---------- UPLOAD ----------
  if (!grouped) return (
    <div className="bb">
      <div className={`bb__drop ${file ? "has" : ""}`} onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] || null); }}>
        <Upload size={22} strokeWidth={1.6} />
        <div className="bb__dt">{file ? file.name : "Drop your T-12 here, or click to choose"}</div>
        <div className="bb__ds">Excel, PDF, or CSV · exported from any PM system</div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsm,.csv,.pdf,.png,.jpg,.jpeg" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      {err && <div className="bb__err"><AlertTriangle size={14} /> {err}</div>}
      <button className="bb__go" disabled={!file || busy} onClick={extract}>{busy ? (<><Loader2 size={15} className="spin" /> Reading & categorizing…</>) : "Extract & categorize"}</button>
      <div className="bb__note">The tool maps every line to a category by meaning — then you review and fix any before we project anything forward.</div>
      <style jsx>{S}</style>
    </div>
  );

  // ---------- REVIEW ----------
  if (view === "review") return (
    <div className="bb">
      <div className="bb__head">
        <div><div className="bb__pn">{meta?.name || "Property"}</div>
          <div className="bb__sub">{meta?.period || "period detected"} · {meta?.count} lines{meta?.city ? ` · ${meta.city}${meta?.state ? ", " + meta.state : ""}` : ""}</div></div>
        <button className="bb__reset" onClick={() => { setLines(null); setMeta(null); setFile(null); }}>Upload another</button>
      </div>
      <div className="bb__totals"><T k="Total Income" v={grouped.income} /><T k="Controllable Exp" v={grouped.controllable} /><T k="Non-Controllable" v={grouped.noncontrollable} /><T k="NOI" v={grouped.noi} big /></div>
      {SECTION_ORDER.map((section) => {
        const cs = BUDGET_CATEGORIES.filter((c) => c.section === section && grouped.cats[c.key]);
        if (!cs.length) return null;
        return (<div key={section} className="bb__section"><div className={`bb__sh ${section === "review" ? "warn" : ""}`}>{SECTION_LABEL[section]}</div>
          {cs.map((c) => { const g = grouped.cats[c.key]; const isOpen = open[c.key]; return (
            <div key={c.key} className="bb__cat">
              <div className="bb__crow" onClick={() => setOpen({ ...open, [c.key]: !isOpen })}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="bb__cn">{c.label}</span><span className={`bb__kind k-${c.kind}`}>{c.kind}</span><span className="bb__cd">{c.driver}</span>
                <span className="bb__ct">{$(g.total)}</span><span className="bb__cc">{g.lines.length}</span></div>
              {isOpen && (<div className="bb__lines">{g.lines.map((li, i) => (
                <div key={i} className="bb__line"><span className="bb__ll">{li.label}</span><span className="bb__la">{$(li.amount)}</span>
                  <select className="bb__sel" value={li.category} onChange={(e) => remap(li, e.target.value)}>{REMAP.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select></div>))}</div>)}
            </div>); })}</div>);
      })}
      <div className="bb__foot"><div className="bb__fn">Categorization look right? Next you’ll set the market and review each growth driver — pre-filled from its signals, all editable.</div>
        <button className="bb__next on" onClick={() => setView("drivers")}>Continue to drivers →</button></div>
      <style jsx>{S}</style>
    </div>
  );

  // ---------- DRIVERS ----------
  const secList = [["revenue","Income"],["controllable","Controllable Expenses"],["noncontrollable","Non-Controllable Expenses"]];
  return (
    <div className="bb">
      <div className="bb__head">
        <div><div className="bb__pn">{meta?.name || "Property"}</div>
          <div className="bb__sub">Next-year budget · base = {meta?.period || "T-12"}</div></div>
        <button className="bb__reset" onClick={() => setView("review")}>← Back to review</button>
      </div>

      <div className="bb__steplabel"><b>Select this property’s market</b> — the forward budget is built from its local signals.{meta?.city ? "" : " This statement had no location in it, so search for it below."}</div>
      <div className="bb__mkt" ref={box}>
        <div className={`bb__mktrow ${!market ? "need" : ""}`}>
          <Search size={14} />
          <input className="bb__mktin" placeholder={market ? market.name : "Search city, ST or ZIP…"} value={q} onChange={(e) => setQ(e.target.value)} />
          {market && <span className={`bb__phase ph-${(phase || "").split(/[ /]/)[0].toLowerCase()}`}>{phase || "—"}</span>}
        </div>
        {results.length > 0 && <div className="bb__res">{results.map((m) => <div key={m.cbsa} className="bb__ri" onClick={() => pick(m)}>{m.name}</div>)}</div>}
      </div>

      {!market ? (<div className="bb__empty">↑ Search and select the market above — your forward budget, every line projected on its signal, appears here.</div>) :
       rBusy ? (<div className="bb__hint"><Loader2 size={14} className="spin" /> Pulling {market.name} signals…</div>) :
       projected && (<>
        <div className="bb__totals">
          <T k="Proj. Income" v={projected.inc} /><T k="Proj. Controllable" v={projected.ctrl} /><T k="Proj. Non-Ctrl" v={projected.non} /><T k="Projected NOI" v={projected.noi} big />
        </div>
        <div className="bb__var">NOI vs T-12 base ({$(grouped.noi)}): <b className={projected.noi >= grouped.noi ? "up" : "dn"}>{projected.noi >= grouped.noi ? "+" : ""}{$(projected.noi - grouped.noi)}</b> ({pct((projected.noi - grouped.noi) / Math.abs(grouped.noi || 1))})</div>

        {secList.map(([section, label]) => {
          const cs = BUDGET_CATEGORIES.filter((c) => c.section === section && grouped.cats[c.key]);
          if (!cs.length) return null;
          return (<div key={section} className="bb__section"><div className="bb__sh">{label}</div>
            <div className="bb__dhead"><span>Category</span><span>T-12 base</span><span>Growth</span><span>Next year</span></div>
            {cs.map((c) => { const row = projected.rows[c.key]; if (!row) return null;
              const isFee = row.isFee;
              const val = overrides[isFee ? "__mgmt" : c.key] ?? row.growth;
              return (
                <div key={c.key} className="bb__drow">
                  <span className="bb__dcat">{c.label}{(c.driverKey === "insurance" || c.driverKey === "tax") && <span className="bb__flag">default</span>}</span>
                  <span className="bb__dbase">{$(row.base)}</span>
                  <span className="bb__dg">
                    <input type="number" step="0.1" className="bb__gin" value={+(val * 100).toFixed(1)}
                      onChange={(e) => setOverrides({ ...overrides, [isFee ? "__mgmt" : c.key]: (parseFloat(e.target.value) || 0) / 100 })} />
                    <span className="bb__gp">{isFee ? "% of EGI" : "%"}</span>
                  </span>
                  <span className="bb__dnext">{$(row.next)}</span>
                  <span className="bb__dwhy" title={why(c)}><Info size={11} /> {why(c)}</span>
                </div>);
            })}</div>);
        })}

        <div className="bb__foot"><div className="bb__fn">Every rate is a <b>forward</b> proposal — recent trend faded toward its long-run norm, so a spike (or slump) doesn’t just extrapolate. Adjust any, then export.</div>
          <button className="bb__next" disabled title="Branded Excel export — next build">Export budget →</button></div>
      </>)}
      <style jsx>{S}</style>
    </div>
  );
}

function T({ k, v, big }) {
  return (<div className={`t ${big ? "big" : ""}`}><div className="tk">{k}</div><div className="tv">{$(v)}</div>
    <style jsx>{`.t{background:#08090A;border:1px solid #1e2126;border-radius:9px;padding:11px 13px}.t.big{border-color:#2a2410}.tk{font-size:10px;color:#797E85;letter-spacing:.05em}.tv{font-size:18px;font-weight:700;color:#ECEDEF;margin-top:2px}.t.big .tv{color:#F5B544}`}</style></div>);
}

const S = `
  .bb { color:#ECEDEF; font-family:'IBM Plex Mono',ui-monospace,monospace; }
  .bb__drop { border:1.5px dashed #2a2c2f; border-radius:12px; padding:38px 20px; text-align:center; cursor:pointer; color:#797E85; background:#0E0F11; }
  .bb__drop.has { border-color:#F5B544; color:#ECEDEF; } .bb__drop:hover { border-color:#4a4f57; }
  .bb__dt { margin-top:10px; font-size:14px; color:#ECEDEF; } .bb__ds { font-size:11px; color:#5b5f66; margin-top:3px; }
  .bb__err { display:flex; align-items:center; gap:7px; margin-top:12px; padding:10px 12px; border-radius:8px; background:#1A0E0E; border:1px solid #5E1E1E; color:#E5634D; font-size:12.5px; }
  .bb__go { margin-top:14px; width:100%; padding:12px; border:0; border-radius:10px; background:#F5B544; color:#08090A; font-weight:700; font-size:13.5px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
  .bb__go:disabled { opacity:.5; cursor:default; }
  .bb__note, .bb__fn { font-size:11.5px; color:#5b5f66; margin-top:12px; line-height:1.5; } .bb__fn b { color:#9aa0a6; font-weight:600; }
  .spin { animation:spin 1s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
  .bb__head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
  .bb__pn { font-family:Archivo,sans-serif; font-size:20px; font-weight:800; } .bb__sub { font-size:11.5px; color:#797E85; margin-top:2px; }
  .bb__reset { background:transparent; border:1px solid #2a2c2f; color:#9aa0a6; border-radius:999px; padding:6px 13px; font-size:12px; cursor:pointer; font-family:inherit; }
  .bb__totals { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; margin-bottom:12px; } @media (max-width:640px){ .bb__totals { grid-template-columns:1fr 1fr; } }
  .bb__var { font-size:12px; color:#797E85; margin-bottom:16px; } .bb__var b.up { color:#5FB97C; } .bb__var b.dn { color:#E5634D; }
  .bb__section { margin-bottom:14px; } .bb__sh { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#797E85; margin-bottom:6px; } .bb__sh.warn { color:#E8B04B; }
  .bb__cat { border:1px solid #1e2126; border-radius:9px; margin-bottom:5px; overflow:hidden; }
  .bb__crow { display:flex; align-items:center; gap:9px; padding:10px 12px; cursor:pointer; background:#0E0F11; } .bb__crow:hover { background:#141619; }
  .bb__cn { font-weight:600; font-size:13px; min-width:150px; } .bb__kind { font-size:8.5px; text-transform:uppercase; letter-spacing:.08em; padding:2px 6px; border-radius:4px; }
  .k-signal { background:#0E1A12; color:#5FB97C; } .k-default { background:#2A1414; color:#E5634D; } .k-formula,.k-derived,.k-linked { background:#16130B; color:#F5B544; } .k-exclude,.k-review { background:#16181b; color:#797E85; }
  .bb__cd { flex:1; font-size:11px; color:#797E85; } @media (max-width:720px){ .bb__cd { display:none; } }
  .bb__ct { font-size:13px; font-weight:700; } .bb__cc { font-size:10px; color:#5b5f66; width:22px; text-align:right; }
  .bb__lines { background:#08090A; border-top:1px solid #1e2126; }
  .bb__line { display:flex; align-items:center; gap:10px; padding:7px 12px 7px 32px; border-bottom:1px solid #121417; font-size:12px; }
  .bb__ll { flex:1; color:#9aa0a6; } .bb__la { color:#ECEDEF; width:90px; text-align:right; }
  .bb__sel { background:#0E0F11; color:#9aa0a6; border:1px solid #2a2c2f; border-radius:6px; padding:4px 6px; font-size:11px; color-scheme:dark; font-family:inherit; }
  .bb__foot { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-top:16px; padding-top:14px; border-top:1px solid #1e2126; flex-wrap:wrap; }
  .bb__next { background:#16181b; color:#5b5f66; border:1px solid #2a2c2f; border-radius:999px; padding:9px 16px; font-size:13px; font-weight:600; font-family:inherit; }
  .bb__next.on { background:#F5B544; color:#08090A; cursor:pointer; border:0; }

  .bb__steplabel { font-size:12.5px; color:#9aa0a6; margin-bottom:8px; } .bb__steplabel b { color:#F5B544; font-weight:700; }
  .bb__mktrow.need { border-color:#F5B544; box-shadow:0 0 0 3px rgba(245,181,68,.10); }
  .bb__empty { text-align:center; color:#797E85; font-size:12.5px; border:1.5px dashed #2a2c2f; border-radius:10px; padding:26px 18px; margin-top:4px; }
  .bb__mkt { position:relative; margin-bottom:14px; }
  .bb__mktrow { display:flex; align-items:center; gap:9px; border:1px solid #2a2c2f; border-radius:9px; padding:10px 12px; background:#0E0F11; color:#797E85; }
  .bb__mktin { flex:1; background:transparent; border:0; outline:0; color:#ECEDEF; font-family:inherit; font-size:13px; }
  .bb__phase { font-size:10px; text-transform:uppercase; letter-spacing:.08em; padding:3px 8px; border-radius:999px; background:#16181b; color:#9aa0a6; }
  .ph-expansion { background:#0E1A12; color:#5FB97C; } .ph-hypersupply, .ph-contraction { background:#2A1414; color:#E5634D; } .ph-recovery { background:#16130B; color:#F5B544; }
  .bb__res { position:absolute; z-index:20; left:0; right:0; margin-top:4px; background:#0E0F11; border:1px solid #2a2c2f; border-radius:9px; overflow:hidden; }
  .bb__ri { padding:9px 12px; font-size:13px; cursor:pointer; color:#ECEDEF; } .bb__ri:hover { background:#16181b; }
  .bb__hint { display:flex; align-items:center; gap:8px; color:#797E85; font-size:12.5px; padding:20px 4px; }
  .bb__dhead { display:grid; grid-template-columns:1.6fr 1fr 1.1fr 1fr; gap:8px; padding:0 12px 5px; font-size:9.5px; letter-spacing:.06em; text-transform:uppercase; color:#5b5f66; }
  .bb__drow { display:grid; grid-template-columns:1.6fr 1fr 1.1fr 1fr; gap:8px; align-items:center; padding:9px 12px; border:1px solid #1e2126; border-radius:8px; margin-bottom:4px; background:#0E0F11; }
  .bb__dcat { font-size:12.5px; font-weight:600; } .bb__flag { margin-left:6px; font-size:8px; text-transform:uppercase; letter-spacing:.06em; color:#E5634D; background:#2A1414; padding:2px 5px; border-radius:4px; }
  .bb__dbase { font-size:12.5px; color:#9aa0a6; } .bb__dnext { font-size:13px; font-weight:700; color:#ECEDEF; }
  .bb__dg { display:flex; align-items:center; gap:5px; } .bb__gin { width:58px; background:#08090A; border:1px solid #2a2c2f; border-radius:6px; padding:5px 6px; color:#F5B544; font-family:inherit; font-size:12.5px; text-align:right; }
  .bb__gp { font-size:10px; color:#5b5f66; } .bb__dwhy { grid-column:1 / -1; display:flex; align-items:center; gap:5px; font-size:10.5px; color:#5b5f66; margin-top:2px; }
`;
