"use client";

import { useState, useEffect, useMemo } from "react";
import { Award, ExternalLink, Loader2 } from "lucide-react";
import { toneColor } from "@/components/ui";

const SOURCES = {
  norada: { label: "Norada", title: "20 Best Cities to Invest · 2026", url: "https://www.noradarealestate.com/blog/best-places-to-invest-in-real-estate/" },
  yardi: { label: "Yardi / MHN", title: "Top Emerging Markets · 2026", url: "https://www.multihousingnews.com/top-emerging-multifamily-markets/" },
};

export default function ExpertPicks({ noradaMarkets = [] }) {
  const [src, setSrc] = useState("norada");
  const [yardi, setYardi] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/emerging-markets")
      .then((r) => r.json())
      .then((em) => {
        if (cancelled) return null;
        const ym = em.markets || [];
        setYardi(ym);
        const union = [
          ...noradaMarkets.map((m) => ({ cbsa: m.cbsa, name: m.city })),
          ...ym.map((m) => ({ cbsa: m.cbsa, name: `${m.city}, ${m.state}` })),
        ].filter((x) => x.cbsa);
        const seen = {}, cbsas = [], names = [];
        for (const x of union) { if (seen[x.cbsa]) continue; seen[x.cbsa] = 1; cbsas.push(x.cbsa); names.push(x.name); }
        const p = new URLSearchParams({ cbsas: cbsas.join(","), names: names.join("|") });
        return fetch(`/api/market-scorecard?${p.toString()}`).then((r) => r.json());
      })
      .then((sc) => { if (!cancelled) { if (sc) setScores(sc.markets || {}); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [noradaMarkets]);

  const rows = useMemo(() => {
    if (src === "yardi") {
      return yardi.map((m) => ({ key: m.cbsa || `${m.city}${m.rank}`, rank: m.rank, name: `${m.city}, ${m.state}`, tag: m.metro_name, cbsa: m.cbsa }));
    }
    return noradaMarkets.map((m, i) => ({ key: m.cbsa || m.city, rank: i + 1, name: m.city, tag: m.tier, cbsa: m.cbsa }));
  }, [src, yardi, noradaMarkets]);

  const meta = SOURCES[src];

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker mb-1 flex items-center gap-2"><Award size={13} className="text-signal" /> Expert&apos;s Picks</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">Their List, Scored</h2>
          <p className="mt-2 max-w-md text-sm text-muted">A published &ldquo;top markets&rdquo; ranking with each pick&apos;s live Cignal score beside it. Where the badge runs red, the data disagrees with the list.</p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-[var(--line)]">
          {Object.entries(SOURCES).map(([k, s]) => (
            <button key={k} onClick={() => setSrc(k)} className={`mono px-3 py-2 text-[11px] tracking-[0.04em] ${src === k ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"}`}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <a href={meta.url} target="_blank" rel="noopener noreferrer" className="mono inline-flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-muted transition-colors hover:text-signal">
          {meta.title} <ExternalLink size={11} />
        </a>
        <span className="mono text-[10px] tracking-[0.06em] text-muted">{loading ? <><Loader2 size={11} className="mr-1 inline animate-spin align-[-1px]" />scoring…</> : "EDITORIAL RANK · LIVE SCORE"}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--line)]">
        {rows.map((m, i) => {
          const sc = scores[m.cbsa];
          const score = sc?.score ?? null;
          const tone = sc?.scoreTone || "neutral";
          return (
            <div key={m.key} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 bg-bg2 px-4 py-3 ${i ? "border-t border-[var(--line)]" : ""}`}>
              <span className="mono w-6 text-center text-[12px] text-muted">{m.rank}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{m.name}</span>
                {m.tag && <span className="mono text-[10px] tracking-[0.06em] text-muted">{m.tag}</span>}
              </span>
              <span className="mono rounded px-2.5 py-1 text-[12px]" style={{ color: toneColor(tone), backgroundColor: `${toneColor(tone)}1a` }}>
                {loading && score == null ? "··" : score ?? "—"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mono mt-3 text-[10px] leading-relaxed tracking-[0.04em] text-muted">
        Score = national-percentile blend of live fundamentals (employment-weighted). A high editorial rank next to a low score is the gap most lists never show you.
      </p>
    </div>
  );
}
