"use client";
import { useState, useMemo, useRef } from "react";
import { Upload, Loader2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { BUDGET_CATEGORIES, CAT_BY_KEY, SECTION_ORDER, SECTION_LABEL } from "@/lib/budget/taxonomy";

const $ = (n) => (n == null || isNaN(n) ? "—" : (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString());
const REMAP_OPTIONS = BUDGET_CATEGORIES.map((c) => ({ key: c.key, label: c.label }));

export default function BudgetBuilder() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [meta, setMeta] = useState(null);
  const [lines, setLines] = useState(null); // [{label, amount, category}]
  const [open, setOpen] = useState({});
  const inputRef = useRef(null);

  async function extract() {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("t12", file);
      const r = await fetch("/api/budget/extract", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Extraction failed."); setBusy(false); return; }
      const flat = [];
      for (const [key, v] of Object.entries(d.categories || {}))
        for (const li of v.lines) flat.push({ ...li, category: key });
      setMeta({ ...d.property_meta, period: d.period_detected, count: d.line_count });
      setLines(flat);
    } catch { setErr("Something went wrong reading the file."); }
    setBusy(false);
  }

  const grouped = useMemo(() => {
    if (!lines) return null;
    const cats = {};
    for (const li of lines) { (cats[li.category] ||= { total: 0, lines: [] }); cats[li.category].total += li.amount; cats[li.category].lines.push(li); }
    const sum = (keys) => keys.reduce((s, k) => s + (cats[k]?.total || 0), 0);
    const income = sum(["market_rent","loss_to_lease","vacancy_loss","concessions","bad_debt","other_income","utility_reimb","other_reimb"]);
    const controllable = sum(["payroll","utilities","contract_services","turnover","repairs","marketing","administrative"]);
    const noncontrollable = sum(["management_fee","insurance","property_taxes"]);
    return { cats, income, controllable, noncontrollable, noi: income - controllable - noncontrollable };
  }, [lines]);

  function remap(lineRef, newKey) {
    setLines((prev) => prev.map((l) => (l === lineRef ? { ...l, category: newKey } : l)));
  }

  if (!grouped) {
    return (
      <div className="bb">
        <div className={`bb__drop ${file ? "has" : ""}`} onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] || null); }}>
          <Upload size={22} strokeWidth={1.6} />
          <div className="bb__dt">{file ? file.name : "Drop your T-12 here, or click to choose"}</div>
          <div className="bb__ds">Excel, PDF, or CSV · exported from any PM system</div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsm,.csv,.pdf,.png,.jpg,.jpeg" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        {err && <div className="bb__err"><AlertTriangle size={14} /> {err}</div>}
        <button className="bb__go" disabled={!file || busy} onClick={extract}>
          {busy ? (<><Loader2 size={15} className="spin" /> Reading & categorizing…</>) : "Extract & categorize"}
        </button>
        <div className="bb__note">The tool maps every line to a category using the statement’s meaning — then you review and fix any before we project anything forward.</div>
        <style jsx>{S}</style>
      </div>
    );
  }

  return (
    <div className="bb">
      <div className="bb__head">
        <div>
          <div className="bb__pn">{meta?.name || "Property"}</div>
          <div className="bb__sub">{meta?.period || "period detected"} · {meta?.count} lines categorized{meta?.city ? ` · ${meta.city}${meta?.state ? ", " + meta.state : ""}` : ""}</div>
        </div>
        <button className="bb__reset" onClick={() => { setLines(null); setMeta(null); setFile(null); }}>Upload another</button>
      </div>

      <div className="bb__totals">
        <T k="Total Income" v={grouped.income} />
        <T k="Controllable Exp" v={grouped.controllable} />
        <T k="Non-Controllable" v={grouped.noncontrollable} />
        <T k="NOI" v={grouped.noi} big />
      </div>

      {SECTION_ORDER.map((section) => {
        const catsInSection = BUDGET_CATEGORIES.filter((c) => c.section === section && grouped.cats[c.key]);
        if (!catsInSection.length) return null;
        return (
          <div key={section} className="bb__section">
            <div className={`bb__sh ${section === "review" ? "warn" : ""}`}>{SECTION_LABEL[section]}</div>
            {catsInSection.map((c) => {
              const g = grouped.cats[c.key]; const isOpen = open[c.key];
              return (
                <div key={c.key} className="bb__cat">
                  <div className="bb__crow" onClick={() => setOpen({ ...open, [c.key]: !isOpen })}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="bb__cn">{c.label}</span>
                    <span className={`bb__kind k-${c.kind}`}>{c.kind}</span>
                    <span className="bb__cd">{c.driver}</span>
                    <span className="bb__ct">{$(g.total)}</span>
                    <span className="bb__cc">{g.lines.length}</span>
                  </div>
                  {isOpen && (
                    <div className="bb__lines">
                      {g.lines.map((li, i) => (
                        <div key={i} className="bb__line">
                          <span className="bb__ll">{li.label}</span>
                          <span className="bb__la">{$(li.amount)}</span>
                          <select className="bb__sel" value={li.category} onChange={(e) => remap(li, e.target.value)}>
                            {REMAP_OPTIONS.map((o) => (<option key={o.key} value={o.key}>{o.label}</option>))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="bb__foot">
        <div className="bb__fn">Categorization looks right? Next you’ll set the growth drivers — each pre-filled from this market’s signals, all editable.</div>
        <button className="bb__next" disabled title="Driver panel — next build">Continue to drivers →</button>
      </div>
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
  .bb__drop.has { border-color:#F5B544; color:#ECEDEF; }
  .bb__drop:hover { border-color:#4a4f57; }
  .bb__dt { margin-top:10px; font-size:14px; color:#ECEDEF; } .bb__ds { font-size:11px; color:#5b5f66; margin-top:3px; }
  .bb__err { display:flex; align-items:center; gap:7px; margin-top:12px; padding:10px 12px; border-radius:8px; background:#1A0E0E; border:1px solid #5E1E1E; color:#E5634D; font-size:12.5px; }
  .bb__go { margin-top:14px; width:100%; padding:12px; border:0; border-radius:10px; background:#F5B544; color:#08090A; font-weight:700; font-size:13.5px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
  .bb__go:disabled { opacity:.5; cursor:default; }
  .bb__note, .bb__fn { font-size:11.5px; color:#5b5f66; margin-top:12px; line-height:1.5; }
  .spin { animation:spin 1s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
  .bb__head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
  .bb__pn { font-family:Archivo,sans-serif; font-size:20px; font-weight:800; }
  .bb__sub { font-size:11.5px; color:#797E85; margin-top:2px; }
  .bb__reset { background:transparent; border:1px solid #2a2c2f; color:#9aa0a6; border-radius:999px; padding:6px 13px; font-size:12px; cursor:pointer; font-family:inherit; }
  .bb__totals { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; margin-bottom:18px; }
  @media (max-width:640px){ .bb__totals { grid-template-columns:1fr 1fr; } }
  .bb__section { margin-bottom:14px; }
  .bb__sh { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#797E85; margin-bottom:6px; }
  .bb__sh.warn { color:#E8B04B; }
  .bb__cat { border:1px solid #1e2126; border-radius:9px; margin-bottom:5px; overflow:hidden; }
  .bb__crow { display:flex; align-items:center; gap:9px; padding:10px 12px; cursor:pointer; background:#0E0F11; }
  .bb__crow:hover { background:#141619; }
  .bb__cn { font-weight:600; color:#ECEDEF; font-size:13px; min-width:150px; }
  .bb__kind { font-size:8.5px; text-transform:uppercase; letter-spacing:.08em; padding:2px 6px; border-radius:4px; }
  .k-signal { background:#0E1A12; color:#5FB97C; } .k-default { background:#2A1414; color:#E5634D; }
  .k-formula, .k-derived, .k-linked { background:#16130B; color:#F5B544; } .k-exclude, .k-review { background:#16181b; color:#797E85; }
  .bb__cd { flex:1; font-size:11px; color:#797E85; } @media (max-width:720px){ .bb__cd { display:none; } }
  .bb__ct { font-size:13px; font-weight:700; color:#ECEDEF; } .bb__cc { font-size:10px; color:#5b5f66; width:22px; text-align:right; }
  .bb__lines { background:#08090A; border-top:1px solid #1e2126; }
  .bb__line { display:flex; align-items:center; gap:10px; padding:7px 12px 7px 32px; border-bottom:1px solid #121417; font-size:12px; }
  .bb__ll { flex:1; color:#9aa0a6; } .bb__la { color:#ECEDEF; width:90px; text-align:right; }
  .bb__sel { background:#0E0F11; color:#9aa0a6; border:1px solid #2a2c2f; border-radius:6px; padding:4px 6px; font-size:11px; color-scheme:dark; font-family:inherit; }
  .bb__foot { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-top:16px; padding-top:14px; border-top:1px solid #1e2126; flex-wrap:wrap; }
  .bb__next { background:#16181b; color:#5b5f66; border:1px solid #2a2c2f; border-radius:999px; padding:9px 16px; font-size:13px; font-weight:600; font-family:inherit; }
`;
