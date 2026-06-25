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

// Build the leading/supporting fundamentals behind a market's Cignal score
// from the scorecard payload already loaded for the score badge.
function fundamentals(sc) {
  const c = sc.cols || {}, b = sc.box || {};
  const s = (n) => (n >= 0 ? "+" : "");
  const lead = [], sup = [];
  if (c.employment) lead.push({ k: "Employment YoY", v: `${s(c.employment.v)}${c.employment.v}%`, pct: c.employment.pct, src: "BLS CES" });
  if (b.permits) lead.push({ k: "MF Permits YoY", v: b.permits.deltaPct != null ? `${s(b.permits.deltaPct)}${b.permits.deltaPct}%` : `${b.permits.v.toLocaleString()}`, pct: null, src: "Census BPS" });
  if (b.aimi) lead.push({ k: "AIMI YoY", v: b.aimi.yoyPct != null ? `${s(b.aimi.yoyPct)}${b.aimi.yoyPct}%` : `${b.aimi.v}`, pct: null, src: "Freddie Mac" });
  if (c.rent) sup.push({ k: "Rent Growth YoY", v: `${s(c.rent.v)}${c.rent.v}%`, pct: c.rent.pct, src: "Zillow ZORI" });
  if (c.vacancy) sup.push({ k: "Vacancy", v: `${c.vacancy.v}%`, pct: c.vacancy.pct, src: "Apartment List" });
  if (c.unemployment) sup.push({ k: "Unemployment", v: `${c.unemployment.v}%`, pct: c.unemployment.pct, src: "BLS LAUS" });
  if (b.homeValue) sup.push({ k: "Home Value", v: `$${Math.round(b.homeValue.v / 1000)}k`, pct: null, src: "Zillow ZHVI" });
  if (b.rppRents) sup.push({ k: "Rent Parity", v: `${b.rppRents.v}`, pct: null, src: "BEA RPP" });
  return { leading: lead, supporting: sup };
}

function FundRow({ x }) {
  const t = x.pct == null ? null : x.pct >= 66 ? "bull" : x.pct >= 45 ? "neutral" : "bear";
  return (
    <div className="flex items-center justify-between gap-2 border-t border-[var(--line)]/40 py-1.5 first:border-t-0">
      <span className="min-w-0 truncate">
        <span className="text-[12px] text-ink">{x.k}</span>
        <span className="mono ml-1.5 text-[9px] tracking-[0.03em] text-muted">{x.src}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="mono text-[11px] text-ink">{x.v}</span>
        {t && (
          <span
            className="mono rounded px-1.5 py-0.5 text-[10px]"
            title="national percentile rank"
            style={{ color: toneColor(t), backgroundColor: `${toneColor(t)}1a` }}
          >
            {x.pct}
          </span>
        )}
      </span>
    </div>
  );
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
          <h2 className="headline text-2xl text-ink md:text-3xl">Top Market Consensus &middot; 2026</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Twelve published &ldquo;top markets&rdquo; lists, combined into one ranking that leans on
            institutional research over SEO blogs. Each market carries its live
            Cignal score &mdash; click any city to see the fundamentals behind it.
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
          const fund = sc ? fundamentals(sc) : { leading: [], supporting: [] };
          const hasFund = fund.leading.length || fund.supporting.length;
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
                <div className="bg-bg2/60 px-4 pb-4 pt-2">
                  <p className="mono mb-1.5 flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-muted">
                    <Info size={11} /> FUNDAMENTALS BEHIND THE CIGNAL SCORE
                  </p>
                  {!sc ? (
                    <p className="mono py-2 text-[11px] text-muted">
                      <Loader2 size={11} className="mr-1 inline animate-spin align-[-1px]" />loading fundamentals&hellip;
                    </p>
                  ) : hasFund ? (
                    <>
                      <div className="grid gap-x-8 sm:grid-cols-2">
                        <div>
                          <p className="mono mb-0.5 text-[9px] tracking-[0.12em] text-signal/80">LEADING</p>
                          {fund.leading.length ? (
                            fund.leading.map((x) => <FundRow key={x.k} x={x} />)
                          ) : (
                            <p className="py-1.5 text-[11px] text-muted">No leading signal at metro grain.</p>
                          )}
                        </div>
                        <div>
                          <p className="mono mb-0.5 text-[9px] tracking-[0.12em] text-muted">SUPPORTING</p>
                          {fund.supporting.map((x) => <FundRow key={x.k} x={x} />)}
                        </div>
                      </div>
                      <p className="mono mt-2 text-[9px] tracking-[0.04em] text-muted">
                        Badge = national percentile rank vs. all reporting metros (higher = stronger). Employment is double-weighted in the score as the only leading metro signal.
                      </p>
                    </>
                  ) : (
                    <p className="py-1.5 text-[11px] text-muted">No live fundamentals for this metro yet.</p>
                  )}

                  <p className="mono mb-2 mt-3 flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-muted">
                    SOURCES NAMING THIS MARKET
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
        Consensus strength reflects each source&rsquo;s tier (institutional research &gt; marketplace &gt; editorial) and
        where the market lands on its list. Score = national-percentile blend of live fundamentals
        (employment-led). A market high on the crowd&rsquo;s list but low on score is the gap most lists never show.
      </p>
    </div>
  );
}
