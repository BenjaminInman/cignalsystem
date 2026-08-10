"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Underwriter from "@/components/Underwriter";
import MarketReadCard from "@/components/MarketReadCard";

export default function UnderwritePage() {
  const [tier, setTier] = useState("free");
  const [cbsa, setCbsa] = useState("28940");
  const [marketName, setMarketName] = useState("Knoxville, TN");
  const [scenario, setScenario] = useState("base");
  const [mr, setMr] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState([]);
  const [injected, setInjected] = useState(null);
  const [loadKey, setLoadKey] = useState(0);
  const [floatTop, setFloatTop] = useState(140);
  const box = useRef(null);
  const headerRef = useRef(null);

  const loadSaved = useCallback(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("portfolio_properties").select("id,name,underwriting,created_at")
        .eq("user_id", user.id).not("underwriting", "is", null)
        .order("created_at", { ascending: false }).then(({ data }) => setSaved(data || []));
    });
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("profiles").select("tier").eq("id", user.id).single().then(({ data }) => setTier(data?.tier || "free"));
    });
    loadSaved();
  }, [loadSaved]);

  // Auto-fill from a Litmus Test handoff (?units=&avgRent=&...&cap=)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!p.get("units")) return;
    const n = (k, d0) => { const v = parseFloat(p.get(k)); return isNaN(v) ? d0 : v; };
    setInjected({
      deal: {
        units: n("units", 80), avgRent: n("avgRent", 1150), expenseRatio: n("expenseRatio", 0.45),
        ltv: n("ltv", 0.7), rate: n("rate", 0.0625), goingInCap: n("cap", 0.0674), otherIncomePerUnit: 0,
      },
      ov: { stabilizedVacancy: n("vacancy", 0.06) },
      name: "",
    });
    setLoadKey((k) => k + 1);
  }, []);

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

  // floating panel: tuck under the header, then pin near the top as you scroll
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const b = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 120;
      setFloatTop(Math.max(16, b + 12));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  function pick(m) { setCbsa(m.cbsa); setMarketName(m.name); setQ(""); setResults([]); }
  function reopen(id) {
    const row = saved.find((r) => r.id === id); if (!row?.underwriting) return;
    const u = row.underwriting;
    setCbsa(u.cbsa); setMarketName(u.marketName || ""); setScenario(u.scenario || "base");
    setInjected({ deal: u.deal, ov: u.ov, name: row.name }); setLoadKey((k) => k + 1);
  }

  return (
    <div className="pg">
      <div className="pg__head" ref={headerRef}>
        <h1>Underwriter</h1>
        <p>Type a market or ZIP; the floating read on the left updates live and auto-fills the model’s forward assumptions.</p>
        <div className="pg__controls">
          <div className="pg__search" ref={box}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Market name or ZIP (e.g. Nashville or 37203)" />
            {results.length > 0 && (
              <ul className="pg__results">
                {results.map((m) => (<li key={m.cbsa + m.name} onClick={() => pick(m)}>{m.name}<span>{m.cbsa}</span></li>))}
              </ul>
            )}
          </div>
          {saved.length > 0 && (
            <select className="pg__saved" defaultValue="" onChange={(e) => e.target.value && reopen(e.target.value)}>
              <option value="">Reopen saved deal…</option>
              {saved.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>
          )}
        </div>
      </div>

      <div className="pg__body">
        <div className="pg__float" style={{ top: floatTop }}>
          <MarketReadCard mr={mr} scenario={scenario} setScenario={setScenario} marketName={marketName} goingInCap={0.0674} />
        </div>
        <div className="pg__main">
          <Underwriter mr={mr} scenario={scenario} marketName={marketName} userTier={tier}
            injected={injected} loadKey={loadKey} onSaved={loadSaved} />
        </div>
      </div>

      <style jsx>{`
        .pg { max-width:1240px; margin:0 auto; padding:26px 16px 70px; color:#ECEDEF; font-family:Archivo,sans-serif; }
        .pg__head h1 { font-size:24px; font-weight:800; margin:0; }
        .pg__head p { color:#797E85; font-size:13.5px; margin:6px 0 16px; font-family:'IBM Plex Mono',monospace; }
        .pg__controls { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start; }
        .pg__search { position:relative; width:360px; max-width:100%; }
        .pg__search input { width:100%; padding:11px 13px; border:1px solid #2a2c2f; border-radius:9px; font-size:14px;
                            background:#0E0F11; color:#ECEDEF; color-scheme:dark; font-family:'IBM Plex Mono',monospace; }
        .pg__results { position:absolute; z-index:30; left:0; right:0; margin:4px 0 0; padding:4px; list-style:none;
                       background:#0E0F11; border:1px solid #2a2c2f; border-radius:9px; max-height:260px; overflow:auto; }
        .pg__results li { display:flex; justify-content:space-between; gap:10px; padding:9px 10px; border-radius:6px; cursor:pointer;
                          font-size:13px; font-family:'IBM Plex Mono',monospace; color:#ECEDEF; }
        .pg__results li:hover { background:#16181b; }
        .pg__results li span { color:#5b5f66; font-size:11px; }
        .pg__saved { padding:11px 13px; border:1px solid #2a2c2f; border-radius:9px; background:#0E0F11; color:#ECEDEF;
                     color-scheme:dark; font-size:13.5px; font-family:'IBM Plex Mono',monospace; }

        .pg__body { position:relative; margin-top:18px; }
        .pg__main { margin-left:332px; min-width:0; }
        .pg__float { position:fixed; left:max(16px, calc((100vw - 1240px)/2 + 16px)); width:300px; z-index:15; }

        @media (max-width:900px){
          .pg__main { margin-left:0; }
          .pg__float { position:static; left:auto; width:auto; top:auto !important; margin-bottom:16px; }
        }
      `}</style>
    </div>
  );
}
