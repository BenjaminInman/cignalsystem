"use client";

import { useState, useEffect, useRef } from "react";
import { Download } from "lucide-react";
import MarketOnePager from "@/components/MarketOnePager";

export default function OnePagerPage() {
  const [cbsa, setCbsa] = useState("28940");
  const [marketName, setMarketName] = useState("Knoxville, TN");
  const [scenario, setScenario] = useState("base");
  const [mr, setMr] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const box = useRef(null);

  useEffect(() => {
    if (!cbsa) return;
    fetch(`/api/underwriting/market-read?cbsa=${cbsa}&scenario=${scenario}`)
      .then((r) => r.json()).then((d) => setMr(d.error ? null : d)).catch(() => setMr(null));
  }, [cbsa, scenario]);

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

  function pick(m) { setCbsa(m.cbsa); setMarketName(m.name); setQ(""); setResults([]); }

  return (
    <div className="pg">
      <div className="pg__head no-print">
        <div>
          <div className="pg__kick">WORKBENCH · ONE-PAGER</div>
          <h1>Market Cycle One-Pager</h1>
          <p>Pick a market and export a branded snapshot — phase, forward assumptions, and the signals behind them.</p>
        </div>
      </div>

      <div className="pg__controls no-print">
        <div className="pg__search" ref={box}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Market name or ZIP (e.g. Nashville or 37203)" />
          {results.length > 0 && (
            <ul className="pg__results">
              {results.map((m) => (<li key={m.cbsa + m.name} onClick={() => pick(m)}>{m.name}<span>{m.cbsa}</span></li>))}
            </ul>
          )}
        </div>
        <div className="pg__scn">
          {["bear", "base", "bull"].map((s) => (<button key={s} data-active={scenario === s} onClick={() => setScenario(s)}>{s}</button>))}
        </div>
        <button className="pg__pdf" onClick={() => window.print()}><Download size={15} strokeWidth={2} /> Save as PDF</button>
      </div>

      <div className="pg__doc">
        <MarketOnePager mr={mr} marketName={marketName} scenario={scenario} goingInCap={0.0674} />
      </div>

      <style jsx>{`
        .pg { max-width:820px; margin:0 auto; padding:26px 16px 60px; color:#ECEDEF; font-family:Archivo,sans-serif; }
        .pg__kick { font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.28em; color:#797E85; }
        .pg__head h1 { font-size:24px; font-weight:800; margin:8px 0 0; }
        .pg__head p { color:#797E85; font-size:13.5px; margin:6px 0 0; font-family:'IBM Plex Mono',monospace; }
        .pg__controls { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin:18px 0; }
        .pg__search { position:relative; width:320px; max-width:100%; }
        .pg__search input { width:100%; padding:10px 12px; border:1px solid #2a2c2f; border-radius:9px; font-size:14px;
                            background:#0E0F11; color:#ECEDEF; color-scheme:dark; font-family:'IBM Plex Mono',monospace; }
        .pg__results { position:absolute; z-index:30; left:0; right:0; margin:4px 0 0; padding:4px; list-style:none;
                       background:#0E0F11; border:1px solid #2a2c2f; border-radius:9px; max-height:260px; overflow:auto; }
        .pg__results li { display:flex; justify-content:space-between; gap:10px; padding:9px 10px; border-radius:6px; cursor:pointer;
                          font-size:13px; font-family:'IBM Plex Mono',monospace; color:#ECEDEF; }
        .pg__results li:hover { background:#16181b; } .pg__results li span { color:#5b5f66; font-size:11px; }
        .pg__scn { display:flex; gap:3px; background:#0E0F11; border:1px solid #1e2126; padding:3px; border-radius:8px; }
        .pg__scn button { text-transform:capitalize; font-size:12px; padding:6px 12px; border:0; border-radius:6px; background:transparent; color:#797E85; cursor:pointer; font-family:'IBM Plex Mono',monospace; }
        .pg__scn button[data-active="true"] { background:#F5B544; color:#08090A; font-weight:700; }
        .pg__pdf { display:inline-flex; align-items:center; gap:6px; padding:10px 15px; border:0; border-radius:9px; background:#F5B544; color:#08090A; font-weight:700; font-size:13px; cursor:pointer; margin-left:auto; }
      `}</style>
      <style jsx global>{`
        @media print {
          header, footer, .no-print { display:none !important; }
          body { background:#fff !important; }
          .pg { padding:0 !important; max-width:none !important; }
          .pg__doc :global(.op) { box-shadow:none !important; width:100% !important; border-radius:0 !important; }
          @page { margin:0.4in; }
        }
      `}</style>
    </div>
  );
}
