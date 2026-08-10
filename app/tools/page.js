"use client";

import Link from "next/link";
import { Download, ArrowUpRight, Wrench } from "lucide-react";

const TOOLS = [
  {
    name: "Cignal Underwriting Model",
    desc: "The full cycle-adjusted multifamily model — pro forma, debt, LP/GP promote waterfall, and a Sell-vs-Refinance recommendation driven by the market's Cignal read.",
    tags: ["Excel", "Interactive"],
    download: "/downloads/Cignal_Underwriting_Model.xlsx",
    href: "/underwrite",
    status: "live",
  },
  {
    name: "Litmus Test",
    desc: "A 30-second go/no-go screen — cap, DSCR, cash-on-cash (and the value-add spread) against your minimum bar. Pass earns the full model; fail is dead.",
    tags: ["Interactive", "Excel"],
    href: "/litmus",
    download: "/downloads/Cignal_Litmus_Test.xlsx",
    status: "live",
  },
  {
    name: "Market Cycle One-Pager",
    desc: "A branded, exportable snapshot of any market — phase, forward assumptions, and the signals behind them. Pick a market and save the PDF.",
    tags: ["PDF"],
    href: "/one-pager",
    status: "live",
  },
  {
    name: "Exit Strategy Analyzer",
    desc: "Own an asset? Sell now vs. refinance-and-hold, with the incremental-IRR math and a cycle-driven call.",
    tags: ["Interactive"],
    href: "/exit-analyzer",
    status: "live",
  },
  { name: "Cap-Rate Sensitivity Grid", desc: "Value and returns across a cap-rate × rent-growth matrix, seeded from the market's read.", tags: ["Excel"], status: "soon" },
  {
    name: "Market Screener Export",
    desc: "Every metro ranked by cycle — sort by momentum, filter by phase, find where to look, then export the screen as CSV.",
    tags: ["Interactive", "CSV"],
    href: "/screener",
    status: "live",
  },
  { name: "Signal Divergence — The Tell", desc: "Leading-vs-lagging divergence for your markets — the early-warning watch as a downloadable sheet.", tags: ["Excel"], status: "soon" },
];

export default function ToolsPage() {
  return (
    <div className="pg">
      <div className="pg__head">
        <div className="pg__kick"><Wrench size={13} strokeWidth={1.8} /> TOOLBOX</div>
        <h1>Tools</h1>
        <p>Working tools built from the Cignal engine — download them, or open their live versions. New tools land here as we build them.</p>
      </div>

      <div className="pg__grid">
        {TOOLS.map((t) => (
          <div key={t.name} className={`card ${t.status === "soon" ? "is-soon" : ""}`}>
            <div className="card__tags">
              {t.tags.map((tag) => (<span key={tag} className="tag">{tag}</span>))}
              {t.status === "soon" && <span className="tag tag--soon">Coming soon</span>}
            </div>
            <h3>{t.name}</h3>
            <p>{t.desc}</p>
            {t.status === "live" && (
              <div className="card__actions">
                {t.download && (<a href={t.download} download className="btn btn--primary"><Download size={14} strokeWidth={2} /> Download .xlsx</a>)}
                {t.href && (<Link href={t.href} className="btn"><ArrowUpRight size={14} strokeWidth={2} /> Open interactive</Link>)}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .pg { max-width:1080px; margin:0 auto; padding:28px 16px 70px; color:#ECEDEF; font-family:Archivo,sans-serif; }
        .pg__kick { display:inline-flex; align-items:center; gap:6px; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.28em; color:#797E85; }
        .pg__head h1 { font-size:26px; font-weight:800; margin:8px 0 0; }
        .pg__head p { color:#797E85; font-size:13.5px; margin:6px 0 22px; max-width:640px; font-family:'IBM Plex Mono',monospace; }
        .pg__grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:14px; }
        .card { background:#0E0F11; border:1px solid #1e2126; border-radius:12px; padding:18px; display:flex; flex-direction:column; }
        .card.is-soon { opacity:.62; }
        .card__tags { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
        .tag { font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; padding:3px 8px; border-radius:4px; background:#16130B; color:#F5B544; border:1px solid #2a2410; }
        .tag--soon { background:#16181b; color:#797E85; border-color:#26292e; }
        .card h3 { font-size:16px; font-weight:700; margin:0 0 6px; }
        .card p { font-size:12.5px; color:#9aa0a6; line-height:1.5; margin:0 0 14px; font-family:'IBM Plex Mono',monospace; flex:1; }
        .card__actions { display:flex; gap:8px; flex-wrap:wrap; }
        .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; font-size:12.5px; font-weight:600; cursor:pointer; text-decoration:none;
               background:#16181b; color:#ECEDEF; border:1px solid #2a2c2f; }
        .btn--primary { background:#F5B544; color:#08090A; border-color:#F5B544; }
      `}</style>
    </div>
  );
}
