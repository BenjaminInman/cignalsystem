"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Hammer, Wrench, Landmark, Handshake, Building2, Building, ChevronDown, Split } from "lucide-react";
import { useContent } from "@/components/VerticalProvider";
import BuffettIndicator from "@/components/BuffettIndicator";
import IndexDonut from "@/components/IndexDonut";

const ICONS = {
  "Home Builders": Hammer,
  "Home Improvement": Wrench,
  "Lenders": Landmark,
  "Brokerages": Handshake,
  "Commercial Real Estate Services": Building2,
  "Residential REITs and Operators": Building,
};

export default function IndicesPage() {
  const { INDICES = [] } = useContent();
  const [quotes, setQuotes] = useState({});
  const [gse, setGse] = useState({});
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState({});
  const symbols = INDICES.flatMap((c) => c.members.filter((m) => !m.gse).map((m) => m.ticker));
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!symbolsKey) return;
    fetch(`/api/quotes?symbols=${symbolsKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.quotes && Object.keys(d.quotes).length) {
          setQuotes(d.quotes);
          setLive(true);
        }
      })
      .catch(() => {});
  }, [symbolsKey]);

  useEffect(() => {
    fetch(`/api/gse-signals`)
      .then((r) => r.json())
      .then((d) => d.signals && setGse(d.signals))
      .catch(() => {});
  }, []);

  // Merge live quotes over fallback values (price members only).
  const merged = (m) => ({
    ...m,
    price: quotes[m.ticker]?.price ?? m.price,
    chg: quotes[m.ticker]?.chg ?? m.chg,
  });

  // Composite "Housing Equity Complex": equal-weight the daily move of every
  // price member (GSE tiles excluded — they're a credit signal, not a price).
  // Sub-indices are the category averages; divergence is the spread between the
  // strongest and weakest sub-index, which is itself a signal.
  const priceCats = INDICES.map((cat) => {
    const ms = cat.members.filter((m) => !m.gse).map(merged);
    const avg = ms.length ? ms.reduce((s, m) => s + m.chg, 0) / ms.length : null;
    return { category: cat.category, avg, n: ms.length };
  }).filter((c) => c.avg != null);

  const allMembers = INDICES.flatMap((cat) =>
    cat.members.filter((m) => !m.gse).map(merged)
  );
  const blended = allMembers.length
    ? allMembers.reduce((s, m) => s + m.chg, 0) / allMembers.length
    : 0;
  const subVals = priceCats.map((c) => c.avg);
  const spread = subVals.length ? Math.max(...subVals) - Math.min(...subVals) : 0;
  const diverging = spread >= 1.0; // ≥1pp spread between sub-indices reads as divergence
  const strongest = priceCats.reduce((a, b) => (b.avg > a.avg ? b : a), priceCats[0] || {});
  const weakest = priceCats.reduce((a, b) => (b.avg < a.avg ? b : a), priceCats[0] || {});
  const blendedColor = blended >= 0 ? "#5FB97C" : "#E5634D";

  return (
    <div className="pt-12 pb-10">
      <p className="kicker mb-3 flex items-center gap-2"><TrendingUp size={12} className="text-signal" /> Market Indices</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Housing-Economy Indices</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Public-market proxies for the forces moving the housing economy — each category shown as a
        performance donut: green advancing, red declining, sized by the size of the move. Tap a category to
        open its holdings.
      </p>

      {/* Composite: the Housing Equity Complex headline read */}
      <div className="mt-8 card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mono text-[10px] tracking-[0.18em] text-muted">HOUSING EQUITY COMPLEX</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="headline text-4xl" style={{ color: blendedColor }}>
                {blended >= 0 ? "+" : ""}{blended.toFixed(2)}%
              </span>
              <span className="mono text-[11px] text-muted">
                blended · {allMembers.length} names {live ? "· daily close" : "· reference"}
              </span>
            </div>
          </div>
          <div className="text-right">
            {diverging ? (
              <>
                <span className="mono inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] tracking-[0.08em]" style={{ color: "#E8B04B", backgroundColor: "#E8B04B1a", border: "1px solid #E8B04B40" }}>
                  <Split size={13} /> DIVERGENCE
                </span>
                <p className="mono mt-2 max-w-[240px] text-[11px] leading-relaxed text-muted">
                  {strongest.category} leading{strongest.avg != null ? ` (${strongest.avg >= 0 ? "+" : ""}${strongest.avg.toFixed(2)}%)` : ""}, {weakest.category.toLowerCase()} lagging{weakest.avg != null ? ` (${weakest.avg >= 0 ? "+" : ""}${weakest.avg.toFixed(2)}%)` : ""}
                </p>
              </>
            ) : (
              <span className="mono inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] tracking-[0.08em]" style={{ color: "#5FB97C", backgroundColor: "#5FB97C1a", border: "1px solid #5FB97C40" }}>
                <Split size={13} /> IN AGREEMENT
              </span>
            )}
          </div>
        </div>

        {/* sub-index dials */}
        <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {priceCats.map((c) => {
            const col = c.avg >= 0 ? "#5FB97C" : "#E5634D";
            return (
              <div key={c.category} className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-muted">{c.category}</span>
                <span className="mono text-sm font-medium" style={{ color: col }}>
                  {c.avg >= 0 ? "+" : ""}{c.avg.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {INDICES.map((cat) => {
          const Icon = ICONS[cat.category] || TrendingUp;
          const priceMembers = cat.members.filter((m) => !m.gse).map(merged);
          const gseMembers = cat.members.filter((m) => m.gse);
          const members = priceMembers;
          const avg = members.length
            ? members.reduce((s, m) => s + m.chg, 0) / members.length
            : 0;
          const up = members.filter((m) => m.chg > 0).length;
          const positive = avg >= 0;
          const color = positive ? "#5FB97C" : "#E5634D";
          const isOpen = !!open[cat.category];
          return (
            <div key={cat.category} className="card p-6">
              {/* clickable header */}
              <button
                onClick={() => setOpen((o) => ({ ...o, [cat.category]: !o[cat.category] }))}
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal/10">
                    <Icon size={16} className="text-signal" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-ink">{cat.category}</h2>
                    <p className="mono text-[11px] tracking-wide text-muted">
                      {up}/{members.length} advancing{gseMembers.length ? ` · +${gseMembers.length} GSE` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="headline text-2xl" style={{ color }}>
                      {positive ? "+" : ""}{avg.toFixed(2)}%
                    </div>
                    <p className="mono text-[10px] tracking-[0.12em] text-muted">CATEGORY AVG</p>
                  </div>
                  <ChevronDown size={18} className="text-muted transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
                </div>
              </button>

              {/* performance donut — always visible, the at-a-glance read */}
              <div className="mt-4 flex justify-center">
                <IndexDonut members={members} />
              </div>

              {/* expandable holdings */}
              {isOpen && (
                <div className="mt-4 overflow-hidden rounded-md border border-[var(--line)]">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-white/[0.02] px-4 py-2 mono text-[10px] tracking-[0.12em] text-muted">
                    <span>SYMBOL</span><span className="text-right">PRICE</span><span className="text-right">CHG</span>
                  </div>
                  {members.map((m, i) => {
                    const u = m.chg >= 0;
                    return (
                      <div key={m.ticker} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 ${i ? "border-t border-[var(--line)]" : ""}`}>
                        <div>
                          <span className="mono text-sm font-medium text-ink">{m.ticker}</span>
                          <span className="ml-2 text-[12px] text-muted">{m.name}</span>
                        </div>
                        <span className="mono text-right text-sm text-ink">${m.price.toFixed(2)}</span>
                        <span className="mono w-16 text-right text-sm" style={{ color: u ? "#5FB97C" : "#E5634D" }}>
                          {u ? "+" : ""}{m.chg.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                  {gseMembers.map((m) => {
                    const sig = gse[m.gse];
                    const vol = gse[m.gseVol];
                    // Falling delinquency is good -> green when delta < 0.
                    const good = sig?.delta != null ? sig.delta < 0 : null;
                    const col = good == null ? "#797E85" : good ? "#5FB97C" : "#E5634D";
                    // Volume reads the normal way: more lending = green.
                    const volCol = vol?.delta == null ? "#797E85" : vol.delta >= 0 ? "#5FB97C" : "#E5634D";
                    return (
                      <div key={m.ticker} className="border-t border-[var(--line)] bg-white/[0.015]">
                        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3">
                          <div>
                            <span className="mono text-sm font-medium text-ink">{m.ticker}</span>
                            <span className="ml-2 text-[12px] text-muted">{m.name}</span>
                            <span className="mono ml-2 rounded bg-signal/10 px-1.5 py-0.5 text-[9px] tracking-[0.08em] text-signal">
                              {m.gseLabel}
                            </span>
                          </div>
                          <span className="mono text-right text-sm text-ink">
                            {sig ? `${sig.value.toFixed(2)}%` : "—"}
                          </span>
                          <span className="mono w-16 text-right text-sm" style={{ color: col }}>
                            {sig?.delta != null ? `${sig.delta >= 0 ? "+" : ""}${sig.delta.toFixed(2)}pp` : ""}
                          </span>
                        </div>
                        {vol && (
                          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 pb-3">
                            <div className="pl-1">
                              <span className="mono text-[11px] text-muted/70">new MF business volume</span>
                              <span className="mono ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[9px] tracking-[0.08em] text-muted">
                                quarterly
                              </span>
                            </div>
                            <span className="mono text-right text-[13px] text-ink/80">${vol.value.toFixed(1)}B</span>
                            <span className="mono w-16 text-right text-[13px]" style={{ color: volCol }}>
                              {vol.delta != null ? `${vol.delta >= 0 ? "+" : ""}${vol.delta.toFixed(1)}B` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {gseMembers.length > 0 && (
                    <p className="mono border-t border-[var(--line)] px-4 py-2 text-[10px] leading-relaxed text-muted/70">
                      FNMA/FMCC are shown as two separate public-filing signals, never blended:
                      multifamily serious delinquency rate (monthly
                      {gse[gseMembers[0]?.gse]?.asOf ? `, as of ${gse[gseMembers[0].gse].asOf}` : ""}), where a
                      falling rate is green; and new multifamily business volume (quarterly
                      {gse[gseMembers[0]?.gseVol]?.asOf ? `, as of ${gse[gseMembers[0].gseVol].asOf}` : ""}),
                      where more lending is green. GSEs trade OTC; neither is a stock quote.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mono mt-6 flex items-center gap-2 text-[11px] tracking-[0.06em] text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-flicker bg-signal" : "bg-muted"}`} />
        {live
          ? "Daily close · via Databento (EOD, delayed)"
          : "Showing reference values — daily closes resume when the feed refreshes"}
      </p>
      <p className="mono mt-1 text-[10px] tracking-[0.06em] text-muted/60">
        Equity data provided by Databento. GSE delinquency from public Fannie Mae / Freddie Mac filings.
      </p>

      <BuffettIndicator />
    </div>
  );
}
