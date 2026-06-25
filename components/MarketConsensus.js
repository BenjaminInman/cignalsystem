"use client";

import { useState, useEffect, useMemo } from "react";
import { Layers, Loader2, Info } from "lucide-react";
import { toneColor } from "@/components/ui";

// Source quality tiers, mirrored from the v_market_consensus_weighted view (display only).
const TIER1 = new Set([
  "Arbor-Chandan",
  "Marcus & Millichap",
  "IPA (Institutional Property Advisors)",
  "Matthews",
  "PwC / ULI",
]);
const TIER2 = new Set(["Crexi", "LoopNet"]);
function tierOf(src) {
  if (TIER1.has(src)) return "institutional";
  if (TIER2.has(src)) return "marketplace";
  return "editorial";
}

export default function MarketConsensus() {
  const [markets, setMarkets] = useState([]);
  const [topScore, setTopScore] = useState(1);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/market-consensus")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return null;
        const ms = data.markets || [];
        setMarkets(ms);
        setTopScore(data.topScore || 1);
        const cbsas = ms.map((m) => m.cbsa).filter(Boolean);
        const names = ms.map((m) => `${m.city}, ${m.state}`);
        if (!cbsas.length) return null;
        const p = new URLSearchParams({ cbsas: cbsas.join(","), names: names.join("|") });
        return fetch(`/api/market-scorecard?${p.toString()}`).then((r) => r.json());
      })
      .then((sc) => {
        if (!cancelled) {
          if (sc) setScores(sc.markets || {});
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => markets, [markets]);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker mb-1 flex items-center gap-2">
            <Layers size={13} className="text-signal" /> Market Consensus
          </p>
          <h2 className="headline text-2xl text-ink md:text-3xl">Weighted Market Consensus &middot; 2026</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Twelve published &ldquo;top markets&rdquo; lists, combined into one ranking and weighted by source
            rigor &mdash; institutional research counts more than an SEO blog. Each market carries its live
            Cignal score, so where the crowd and the fundamentals disagree, you see it.
          </p>
        </div>
        <span className="mono shrink-0 text-[10px] tracking-[0.06em] text-muted">
          {loading ? (
            <><Loader2 size={11} className="mr-1 inline animate-spin align-[-1px]" />scoring&hellip;</>
          ) : (
            "CONSENSUS RANK &middot; LIVE SCORE"
          )}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--line)]">
        {rows.map((m, i) => {
          const sc = m.cbsa ? scores[m.cbsa] : null;
          const score = sc?.score ?? null;
          const tone = sc?.scoreTone || "neutral";
          const pct = Math.max(8, Math.round((m.weightedScore / topScore) * 100));
          const isOpen = open === m.rank;
          return (
            <div key={`${m.city}-${m.state}`} className={i ? "border-t border-[var(--line)]" : ""}>
              <button
                onClick={() => setOpen(isOpen ? null : m.rank)}
                className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 bg-bg2 px-4 py-3 text-left transition-colors hover:bg-[var(--line)]/30"
              >
                <span className="mono w-6 text-center text-[12px] text-muted">{m.rank}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {m.city}, {m.state}
                  </span>
                  <span className="mono text-[10px] tracking-[0.06em] text-muted">
                    {m.appearances} SOURCES &middot; BEST RANK #{m.bestRank}
                  </span>
                </span>
                <span className="hidden w-28 sm:block">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                    <span className="block h-full rounded-full bg-signal/70" style={{ width: `${pct}%` }} />
                  </span>
                </span>
                <span
                  className="mono rounded px-2.5 py-1 text-[12px]"
                  style={{ color: toneColor(tone), backgroundColor: `${toneColor(tone)}1a` }}
                >
                  {loading && score == null ? "··" : score ?? "—"}
                </span>
              </button>
              {isOpen && (
                <div className="bg-bg2/60 px-4 pb-4 pt-1">
                  <p className="mono mb-2 flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-muted">
                    <Info size={11} /> SOURCES NAMING THIS MARKET
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.sources.map((s) => {
                      const t = tierOf(s);
                      const c = t === "institutional" ? "var(--up)" : t === "marketplace" ? "var(--signal)" : "var(--muted)";
                      return (
                        <span
                          key={s}
                          className="mono rounded px-2 py-0.5 text-[10px] tracking-[0.03em]"
                          style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)` }}
                        >
                          {s}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mono mt-3 text-[10px] leading-relaxed tracking-[0.04em] text-muted">
        Consensus strength weights each source by tier (institutional research &gt; marketplace &gt; editorial) and
        by where the market lands on its list. Score = national-percentile blend of live fundamentals
        (employment-weighted). A market high on the crowd&rsquo;s list but low on score is the gap most lists never show.
      </p>
    </div>
  );
}
