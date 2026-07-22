"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Hammer, Wrench, Landmark, Handshake, Building2, Building, ChevronDown, Split } from "lucide-react";
import { useContent } from "@/components/VerticalProvider";
import PaywallBlur from "@/components/PaywallBlur";
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

// "2026-06-30" -> "Jun 30" — the anchor is shown so a reader can see exactly
// what the comparison is against rather than trusting an unlabelled number.
function fmtAnchor(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MON[m - 1]} ${d}`;
}

export default function IndicesPage() {
  const { INDICES = [] } = useContent();
  const [quotes, setQuotes] = useState({});
  const [trends, setTrends] = useState({});
  const [trendMeta, setTrendMeta] = useState(null);
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

  // Period returns (quarter-to-date, year-to-date). Daily moves are noise for a
  // cycle read; these two horizons are where the trend actually shows.
  useEffect(() => {
    fetch(`/api/index-trends`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.periods) setTrends(d.periods);
        if (d?.quarterAnchor) setTrendMeta({ q: d.quarterAnchor, y: d.yearAnchor, yoy: d.yoyAnchor });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/gse-signals`)
      .then((r) => r.json())
      .then((d) => d.signals && setGse(d.signals))
      .catch(() => {});
  }, []);

  // Merge live quotes over the content pack. The pack carries the ROSTER (which
  // tickers, in which category) but its price/chg are stale samples -- they must
  // never render as quotes. A name the feed doesn't cover is dropped from the
  // donut and its average rather than contributing a made-up move, and shows a
  // dash in the holdings list.
  // Equal-weights a period return across members, matching the daily donut
  // methodology exactly so the three readings on a card are comparable rather
  // than three different constructs. Members without a figure for that horizon
  // are skipped, not zero-filled -- a zero would drag the index toward flat.
  const periodAvg = (ms, key) => {
    const vals = ms
      .map((m) => trends[m.ticker]?.[key])
      .filter((v) => typeof v === "number" && Number.isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const merged = (m) => {
    const q = quotes[m.ticker];
    return q
      ? { ...m, price: q.price, chg: q.chg, quoted: true }
      : { ...m, price: null, chg: null, quoted: false };
  };

  // Composite "Housing Equity Complex": equal-weight the daily move of every
  // price member (GSE tiles excluded — they're a credit signal, not a price).
  // Sub-indices are the category averages; divergence is the spread between the
  // strongest and weakest sub-index, which is itself a signal.
  const priceCats = INDICES.map((cat) => {
    // Only quoted names count toward an average -- an unquoted ticker has no
    // move to contribute, and inventing one from a stale sample would quietly
    // bias the composite.
    const ms = cat.members.filter((m) => !m.gse).map(merged).filter((m) => m.quoted);
    const avg = ms.length ? ms.reduce((s, m) => s + m.chg, 0) / ms.length : null;
    return { category: cat.category, avg, qtd: periodAvg(ms, "qtd"), n: ms.length };
  }).filter((c) => c.avg != null);

  // Dedupe by ticker before blending. CBRE, JLL and CWK each appear in two
  // categories (Brokerages and Commercial Real Estate Services), so a flat map
  // counted them twice -- the headline read "39 names" against 36 real ones and
  // over-weighted those three firms in the composite.
  const allMembers = Object.values(
    INDICES.flatMap((cat) => cat.members.filter((m) => !m.gse).map(merged))
      .filter((m) => m.quoted)
      .reduce((acc, m) => ({ ...acc, [m.ticker]: m }), {})
  );
  const blended = allMembers.length
    ? allMembers.reduce((s, m) => s + m.chg, 0) / allMembers.length
    : 0;
  const blendedYoy = periodAvg(allMembers, "yoy");
  const blendedQtd = periodAvg(allMembers, "qtd");
  // Divergence is measured on the QUARTER, not the day. A one-session spread
  // between sub-indices is noise -- sectors scatter every day on nothing. A
  // spread that persists across a quarter is a regime signal, which is what the
  // words "leading" and "lagging" actually claim. It also has to match the
  // headline it sits beside: with the card now leading on annual and quarterly
  // figures, a flag computed on today's tape would read as though those
  // leading/lagging numbers were the same horizon. Threshold raised to 4pp
  // accordingly -- quarterly spreads run far wider than daily ones (13.2pp
  // today against 2.0pp on the day), so the old 1pp bar would fire permanently.
  const divCats = priceCats.filter((c) => typeof c.qtd === "number");
  const subVals = divCats.map((c) => c.qtd);
  const spread = subVals.length ? Math.max(...subVals) - Math.min(...subVals) : 0;
  const diverging = subVals.length >= 2 && spread >= 4.0;
  const strongest = divCats.reduce((a, b) => (b.qtd > a.qtd ? b : a), divCats[0] || {});
  const weakest = divCats.reduce((a, b) => (b.qtd < a.qtd ? b : a), divCats[0] || {});
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

      {/* The Housing Equity Complex is the Cignal+ lens on this page, the same
          split as Indicators/Onion and Portfolio/Architect: Pro gets the
          instrument, the top tier gets the read. It is what turns 36 scattered
          quotes into "the complex is diverging, for-sale side confirming,
          rental side lagging" — the synthesis is the product.

          Soft blur, NOT `hard`. The Onion and Architect are held out of the DOM
          because they are the method itself. Here the inputs are already on the
          page: every member's daily move is in the donuts below, so hiding the
          composite protects nothing a Pro member couldn't average by hand. What
          the gate sells is the synthesis, and a blurred teaser sells it better
          than an empty box.

          The Buffett Indicator further down stays open to Pro deliberately —
          market cap ÷ GDP is a public metric off Fed Z.1 and BEA, not Cignal
          IP. Gating something a member can Google in five seconds cheapens the
          gates that are actually earned. */}
      <PaywallBlur
        page="indices"
        title="Housing Equity Complex"
        minTier="cignal_plus"
        wrapClass="mt-8"
        blurb="The blended read across all 36 housing-economy names, split into sub-indices, with the divergence flag that fires when they stop agreeing. Unlock it with Cignal+."
      >
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mono text-[10px] tracking-[0.18em] text-muted">HOUSING EQUITY COMPLEX</p>
            {/* Ordered by signal strength, not recency: annual leads at full
                size, the quarter sits beneath it, and today's move is smallest.
                A cycle platform that leads with the daily tape is arguing
                against its own thesis -- one session tells you almost nothing
                about where the market is in the cycle, and the year tells you
                most of it. */}
            <div className="mt-2 flex items-baseline gap-3">
              <span
                className="headline text-4xl"
                style={{ color: blendedYoy == null ? "#797E85" : blendedYoy >= 0 ? "#5FB97C" : "#E5634D" }}
              >
                {blendedYoy == null ? "—" : `${blendedYoy >= 0 ? "+" : ""}${blendedYoy.toFixed(2)}%`}
              </span>
              <span className="mono text-[11px] text-muted">
                year over year{trendMeta?.yoy ? ` · vs ${fmtAnchor(trendMeta.yoy)}` : ""} · {allMembers.length} names
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-3">
              <span
                className="mono text-xl font-medium"
                style={{ color: blendedQtd == null ? "#797E85" : blendedQtd >= 0 ? "#5FB97C" : "#E5634D" }}
              >
                {blendedQtd == null ? "—" : `${blendedQtd >= 0 ? "+" : ""}${blendedQtd.toFixed(2)}%`}
              </span>
              <span className="mono text-[11px] text-muted">
                this quarter{trendMeta ? ` · since ${fmtAnchor(trendMeta.q)}` : ""}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-3">
              <span className="mono text-[13px] font-medium" style={{ color: blendedColor }}>
                {blended >= 0 ? "+" : ""}{blended.toFixed(2)}%
              </span>
              <span className="mono text-[11px] text-muted/70">
                today {live ? "· daily close" : "· reference"}
              </span>
            </div>
          </div>
          <div className="text-right">
            {diverging ? (
              <>
                <span className="mono inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] tracking-[0.08em]" style={{ color: "#E8B04B", backgroundColor: "#E8B04B1a", border: "1px solid #E8B04B40" }}>
                  <Split size={13} /> DIVERGENCE
                </span>
                <p className="mono mt-2 max-w-[250px] text-[11px] leading-relaxed text-muted">
                  this quarter: {strongest.category} leading{strongest.qtd != null ? ` (${strongest.qtd >= 0 ? "+" : ""}${strongest.qtd.toFixed(2)}%)` : ""}, {weakest.category} lagging{weakest.qtd != null ? ` (${weakest.qtd >= 0 ? "+" : ""}${weakest.qtd.toFixed(2)}%)` : ""}
                </p>
              </>
            ) : (
              <span className="mono inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] tracking-[0.08em]" style={{ color: "#5FB97C", backgroundColor: "#5FB97C1a", border: "1px solid #5FB97C40" }}>
                <Split size={13} /> IN AGREEMENT
              </span>
            )}
          </div>
        </div>

        {/* Sub-index dials, quarterly to match the divergence flag. Labelled
            explicitly -- an unlabelled percentage next to an annual headline
            invites the reader to assume the wrong horizon. */}
        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <p className="mono mb-3 text-[10px] tracking-[0.12em] text-muted">BY SUB-INDEX · THIS QUARTER</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {priceCats.map((c) => {
            return (
              <div key={c.category} className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-muted">{c.category}</span>
                {/* Quarterly, matching the divergence flag above. */}
                <span
                  className="mono text-sm font-medium"
                  style={{ color: c.qtd == null ? "#797E85" : c.qtd >= 0 ? "#5FB97C" : "#E5634D" }}
                >
                  {c.qtd == null ? "—" : `${c.qtd >= 0 ? "+" : ""}${c.qtd.toFixed(2)}%`}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>
      </PaywallBlur>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {INDICES.map((cat) => {
          const Icon = ICONS[cat.category] || TrendingUp;
          const priceMembers = cat.members.filter((m) => !m.gse).map(merged);
          const gseMembers = cat.members.filter((m) => m.gse);
          // The donut and its average are built from quoted names only.
          const members = priceMembers.filter((m) => m.quoted);
          const unquoted = priceMembers.filter((m) => !m.quoted);
          const avg = members.length
            ? members.reduce((s, m) => s + m.chg, 0) / members.length
            : 0;
          const up = members.filter((m) => m.chg > 0).length;
          const qtd = periodAvg(members, "qtd");
          const yoy = periodAvg(members, "yoy");
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
                  {/* The headline number is the ANNUAL read, not the daily one.
                      Signal strength runs annual > quarterly > daily for a cycle
                      platform, so the visual hierarchy follows it: the strongest
                      horizon gets the largest type and the top position, and the
                      daily sits furthest down as context. Leading with the daily
                      put the noisiest number in the most prominent slot. */}
                  <div className="text-right">
                    <div className="headline text-2xl" style={{ color: yoy == null ? "#797E85" : yoy >= 0 ? "#5FB97C" : "#E5634D" }}>
                      {yoy == null ? "—" : `${yoy >= 0 ? "+" : ""}${yoy.toFixed(2)}%`}
                    </div>
                    <p className="mono text-[10px] tracking-[0.12em] text-muted">
                      YEAR OVER YEAR
                    </p>
                  </div>
                  <ChevronDown size={18} className="text-muted transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
                </div>
              </button>

              {/* Trend readings sit ABOVE the donut, ordered strongest to
                  weakest: the header carries the annual, then the quarter, then
                  today. The donut below is a daily visualisation, so the daily
                  figure sits with it. The three horizons routinely disagree --
                  Home Builders can print -9% for the quarter while the year is
                  still positive -- and that disagreement is the actual read. */}
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--line)] bg-[var(--line)]">
                {[
                  { label: "THIS QUARTER", v: qtd, sub: trendMeta ? `since ${fmtAnchor(trendMeta.q)}` : "quarter to date" },
                  { label: "TODAY", v: members.length ? avg : null, sub: live ? "daily close" : "reference" },
                ].map((cell) => (
                  <div key={cell.label} className="bg-bg2 px-4 py-3">
                    <p className="mono text-[10px] tracking-[0.12em] text-muted">{cell.label}</p>
                    <p
                      className="mono mt-1 text-lg font-medium"
                      style={{ color: cell.v == null ? "#797E85" : cell.v >= 0 ? "#5FB97C" : "#E5634D" }}
                    >
                      {cell.v == null ? "—" : `${cell.v >= 0 ? "+" : ""}${cell.v.toFixed(2)}%`}
                    </p>
                    <p className="mono text-[10px] text-muted/70">{cell.sub}</p>
                  </div>
                ))}
              </div>

              {/* performance donut — the daily move, member by member */}
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
                  {unquoted.map((m) => (
                    <div key={m.ticker} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-[var(--line)] px-4 py-3">
                      <div>
                        <span className="mono text-sm font-medium text-ink">{m.ticker}</span>
                        <span className="ml-2 text-[12px] text-muted">{m.name}</span>
                      </div>
                      <span className="mono text-right text-sm text-muted">—</span>
                      <span className="mono w-16 text-right text-sm text-muted">—</span>
                    </div>
                  ))}
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

      {/* Section break before the Buffett Indicator.
          Two things were wrong with it sitting flush here. It read as a seventh
          index rather than a change of scope — and it sat directly beneath the
          Databento attribution, which implies a source it does not use: Buffett
          is Fed Z.1 market cap over BEA GDP, nothing to do with the equity feed.
          The rule closes the equity section so the attribution belongs to the
          cards above it, and the label signals the zoom-out.

          The label is "ZOOMING OUT", not "MACRO BACKDROP", because the component
          below already opens with a "Macro · Broad Market" kicker — stacking a
          second Macro label would read as a mistake. This one names the move
          instead of restating the category. */}
      <div className="mt-14 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span className="mono text-[10px] tracking-[0.18em] text-muted/70">ZOOMING OUT</span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      {/* The card carries its own mt-14, which would leave the label floating far
          above the thing it introduces. Override it so the two read as one unit:
          the space belongs ABOVE the divider, separating the equity section. */}
      <div className="[&>*]:!mt-6">
        <BuffettIndicator />
      </div>
    </div>
  );
}
