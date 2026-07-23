"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MapPin, Building2, ChevronDown, Truck, Package, Search, Bookmark, Check, Loader2, Factory } from "lucide-react";
import { toneColor, Sparkline } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useContent, useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import EmergingMarkets from "@/components/EmergingMarkets";
import MarketRanker from "@/components/MarketRanker";
import MigrationDivergence from "@/components/MigrationDivergence";
import MarketConsensus from "@/components/MarketConsensus";
import RentRadial from "@/components/RentRadial";
import IndicatorRow from "@/components/IndicatorRow";
import { metroSignalRows } from "@/lib/submarket-rows";
import AskCanary from "@/components/AskCanary";

function fmtMonth(d) {
  if (!d) return "";
  const x = new Date(d + "T00:00:00Z");
  return x.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export default function MarketMapsPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "market-maps")) return <ComingSoonInline vertical={vertical} title="Market Maps" />;
  return <MarketMapsInner />;
}

function MarketMapsInner() {
  const { MARKET_GROUPS = [], COPY = {} } = useContent();
  const [f, setF] = useState("All");
  const [mig, setMig] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [card, setCard] = useState(null);
  const tracked = useMemo(
    () => MARKET_GROUPS.flatMap((g) => g.markets).filter((m) => m.cbsa).map((m) => ({ cbsa: m.cbsa, name: m.city })),
    [MARKET_GROUPS]
  );
  useEffect(() => {
    fetch("/api/migration").then((r) => r.json()).then(setMig).catch(() => setMig({}));
    fetch("/api/metro-growth").then((r) => r.json()).then(setGrowth).catch(() => setGrowth({ growth: {} }));
  }, []);
  useEffect(() => {
    if (!tracked.length) return;
    const cbsas = encodeURIComponent(tracked.map((t) => t.cbsa).join(","));
    const names = encodeURIComponent(tracked.map((t) => t.name).join("|"));
    fetch(`/api/market-scorecard?cbsas=${cbsas}&names=${names}`)
      .then((r) => r.json()).then(setCard).catch(() => setCard({ markets: {} }));
  }, [tracked]);
  const labels = COPY.mmMetrics || ["Rent Growth", "Employment", "Vacancy", "Unemployment"];
  const gmap = growth?.growth || {};
  const loaded = growth != null;
  const cmap = card?.markets || {};
  const withLive = (m) => {
    const sc = cmap[m.cbsa] || null;
    const g = gmap[m.zori || m.city]; // metro-growth (zori_metro) is keyed by "City, ST" name
    const base = { ...m, sc, rentVal: parseFloat(m.rent), rentTone: m.tone, live: false };
    if (g == null) return base;
    const rentTone = g > 0.15 ? "bull" : g < -0.15 ? "bear" : "neutral";
    return { ...base, rent: `${g >= 0 ? "+" : ""}${g}%`, rentVal: g, rentTone, live: true };
  };
  const groupsAll = MARKET_GROUPS.map((g) => ({ ...g, markets: g.markets.map(withLive) }));
  const filters = ["All", ...MARKET_GROUPS.map((g) => g.region)];
  const groups = groupsAll.filter((g) => f === "All" || g.region === f);
  const flat = groupsAll.flatMap((g) => g.markets);
  // Show every tracked market with live ZORI — growth AND decline (sorted high to low).
  const all = flat.filter((m) => (loaded ? m.live : true)).sort((a, b) => b.rentVal - a.rentVal);

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Market Maps</h1>
      <p className="mt-3 max-w-2xl text-muted">{COPY.mmSubtitle || "Fundamentals scored and ranked across top U.S. metros."}</p>

      <ZipLookup />

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <MarketConsensus />
        <MarketRanker watchlistCbsas={tracked.map((t) => t.cbsa)} />
      </div>

      <div className="card mt-8 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">{labels[0]} — Tracked Markets <span className="text-muted">· metro · multifamily</span></h2>
          <span className="mono text-[10px] tracking-[0.08em] text-muted">
            {growth?.asOf ? <><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-up align-middle" />LIVE · ZORI YoY · metro · multifamily · as of {fmtMonth(growth.asOf)}</> : "Loading live data…"}
          </span>
        </div>
        <RentRadial markets={all} />
        <p className="mono mt-3 text-[10px] tracking-[0.06em] text-muted">Live ZORI year-over-year, metro-level · ring grouped by U.S. region, wedge sized by the size of the move · hover any market for the exact figure.</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((x) => (
          <button key={x} onClick={() => setF(x)} className={`mono rounded-md border px-4 py-2 text-[12px] tracking-[0.04em] ${f === x ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}>{x}</button>
        ))}
      </div>

      {groups.map((g) => (
        <div key={g.region} className="mt-8">
          <p className="kicker mb-4 flex items-center gap-2"><Building2 size={13} className="text-signal" /> {g.region}</p>
          <div className="overflow-hidden rounded-lg border border-[var(--line)]">
            {g.markets.map((m, i) => (
              <MarketRow key={m.city} m={m} i={i} labels={labels} loaded={card != null} />
            ))}
          </div>
        </div>
      ))}

      <MigrationDivergence />
      <MigrationTrends data={mig?.uhaul} />
      <PodsTrends data={mig?.pods} />
      <EmergingMarkets />
      <IndustryExposureScreen />
    </div>
  );
}

function pctLabel(p) {
  if (p == null) return null;
  const t = p % 100, u = p % 10;
  const s = u === 1 && t !== 11 ? "st" : u === 2 && t !== 12 ? "nd" : u === 3 && t !== 13 ? "rd" : "th";
  return `${p}${s} pct`;
}

function SignalLine({ label, value, pct, src, lead, note }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-[var(--line)] py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm text-ink">
          {label}
          {lead && <span className="mono rounded bg-signal/10 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-signal">LEADING</span>}
        </p>
        {note && <p className="mt-0.5 text-[11px] leading-snug text-muted">{note}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="mono text-sm text-ink">{value ?? "—"}</p>
        <p className="mono mt-0.5 text-[10px] tracking-[0.06em] text-muted">{[pctLabel(pct), src].filter(Boolean).join(" · ")}</p>
      </div>
    </div>
  );
}

function MarketRow({ m, i, labels, loaded }) {
  const [open, setOpen] = useState(false);
  const sc = m.sc;
  const score = sc?.score ?? null;
  const scoreTone = sc?.scoreTone || m.tone;
  const cols = sc?.cols || {};
  const fmtPct = (v) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${v}%`);
  const fmtNum = (v) => (v == null ? "—" : `${v}`);
  const empV = cols.employment ? fmtPct(cols.employment.v) : "—";
  const vacV = cols.vacancy ? `${cols.vacancy.v}%` : "—";
  const unempV = cols.unemployment ? `${cols.unemployment.v}%` : "—";
  const empTone = cols.employment ? (cols.employment.v > 0.3 ? "bull" : cols.employment.v < -0.3 ? "bear" : "neutral") : undefined;

  return (
    <div className={i ? "border-t border-[var(--line)]" : ""}>
      <div
        role="button" tabIndex={0} aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="grid cursor-pointer grid-cols-2 items-center gap-4 bg-bg2 px-6 py-5 transition hover:bg-bg2/60 md:grid-cols-[1.4fr_repeat(4,1fr)_auto]"
      >
        <p className="flex items-center gap-2 font-semibold text-ink"><MapPin size={14} className="text-muted" /> {m.city}</p>
        <Metric label={labels[0]} value={m.rent} tone={m.rentTone} />
        <Metric label={labels[1]} value={empV} tone={empTone} />
        <Metric label={labels[2]} value={vacV} />
        <Metric label={labels[3]} value={unempV} />
        <div className="flex items-center justify-end gap-3">
          <span className="mono rounded px-2.5 py-1 text-[12px]" style={{ color: toneColor(scoreTone), backgroundColor: `${toneColor(scoreTone)}1a` }}>
            {score ?? (loaded ? "—" : "··")}
          </span>
          <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] bg-bg px-6 py-5">
          {!sc ? (
            <p className="mono text-[11px] text-muted">Loading metro signals…</p>
          ) : (
            <>
              <p className="mb-3 text-[12px] leading-relaxed text-muted">
                <span className="text-ink">Why it scores {score ?? "—"}: </span>
                {cols.employment
                  ? `payroll employment ${fmtPct(cols.employment.v)} YoY (${pctLabel(cols.employment.pct)} of U.S. metros) — the leading demand signal — corroborated by the trailing fundamentals below. Score is a national percentile rank, weighted toward employment.`
                  : "metro employment isn't reported for this market, so the score reflects the available trailing fundamentals only."}
              </p>

              <p className="kicker mb-1">Leading</p>
              <SignalLine label="Payroll Employment (YoY)" value={cols.employment ? fmtPct(cols.employment.v) : null} pct={cols.employment?.pct} src="BLS" lead note="Total nonfarm jobs — the upstream driver of household formation and rental demand." />
              {sc.box?.aimi && (
                <SignalLine label="Apartment Investment Market Index" value={sc.box.aimi.yoyPct != null ? fmtPct(sc.box.aimi.yoyPct) : fmtNum(sc.box.aimi.v)} src="Freddie Mac AIMI" lead note="Composite of rents, property values and mortgage rates; higher = relatively more attractive entry point." />
              )}
              {sc.box?.permits && (
                <SignalLine label="MF Permits 5+ (annual)" value={`${sc.box.permits.v.toLocaleString()}${sc.box.permits.deltaPct != null ? ` · ${sc.box.permits.deltaPct >= 0 ? "+" : ""}${sc.box.permits.deltaPct}% YoY` : ""}`} src={`Census BPS · ${sc.box.permits.year}`} lead note="New multifamily units authorized — the future supply pipeline. Rising = more deliveries (and rent pressure) ahead." />
              )}

              <p className="kicker mb-1 mt-4">Supporting fundamentals</p>
              <SignalLine label="Market Rent (ZORI, YoY)" value={m.live ? m.rent : null} pct={cols.rent?.pct} src="Zillow ZORI" note="Observed asking-rent momentum across all rental types." />
              <SignalLine label="Vacancy Index" value={cols.vacancy ? `${cols.vacancy.v}%` : null} pct={cols.vacancy?.pct} src="Apartment List" note="Share of units sitting empty; lower ranks higher." />
              <SignalLine label="Unemployment Rate" value={cols.unemployment ? `${cols.unemployment.v}%` : null} pct={cols.unemployment?.pct} src="BLS LAUS" note="Labor-market slack; lower ranks higher." />
              {sc.box?.rppRents && (
                <SignalLine label="Rent Price Parity" value={fmtNum(sc.box.rppRents.v)} src="BEA RPP" note="Local rent cost vs national = 100 — an affordability read." />
              )}
              {sc.box?.homeValue && (
                <SignalLine label="Home Value (ZHVI)" value={`$${Math.round(sc.box.homeValue.v / 1000)}k${sc.box.homeValue.yoyPct != null ? ` · ${sc.box.homeValue.yoyPct >= 0 ? "+" : ""}${sc.box.homeValue.yoyPct}% YoY` : ""}`} src="Zillow ZHVI" note="Median home value and appreciation — affordability and owner-equity read." />
              )}

              <p className="mt-4 text-[11px] leading-relaxed text-muted">
                Sources: U.S. Bureau of Labor Statistics (employment, unemployment), Zillow Research (ZORI rent, ZHVI home value), Apartment List (vacancy), Bureau of Economic Analysis (Regional Price Parity), Census BPS (multifamily permits){sc.box?.aimi ? ", Freddie Mac (AIMI)" : ""}. Percentiles rank this metro against every U.S. metro reporting each series. The score weights employment — the only leading signal carried at metro level — most heavily; trailing series confirm rather than trigger.
              </p>
              {m.cbsa && (
                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <AskCanary variant="inline" question={`How does ${m.city} look right now?`} metro={m.zori || m.city} cbsa={m.cbsa} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const UHAUL_TABS = [
  { key: "metros", label: "Metros", n: "Top 25" },
  { key: "states", label: "States", n: "All 50" },
  { key: "cities", label: "Cities", n: "Top 25" },
];

function moveMeta(prev, rank) {
  if (prev == null) return { label: "NEW", tone: "signal" };
  const d = prev - rank;
  if (d > 0) return { label: `\u25B2 ${d}`, tone: "bull" };
  if (d < 0) return { label: `\u25BC ${Math.abs(d)}`, tone: "bear" };
  return { label: "\u2014", tone: "muted" };
}

function MigrationTrends({ data }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("metros");
  if (!data) {
    return (
      <div className="mt-14"><div className="card p-6">
        <p className="kicker flex items-center gap-2"><Truck size={13} className="text-signal" /> Migration Intelligence</p>
        <p className="mt-2 text-sm text-muted">Loading U-Haul Growth Index…</p>
      </div></div>
    );
  }
  const rows = data[tab] || [];
  return (
    <div className="mt-14">
      <div role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen((v) => !v)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }} className="card flex w-full cursor-pointer items-start gap-4 p-6 text-left transition hover:border-signal/30">
        <div className="flex-1">
          <p className="kicker mb-2 flex items-center gap-2"><Truck size={13} className="text-signal" /> Migration Intelligence</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">U-Haul Growth Index — {data.year}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Net gain or loss of one-way U-Haul moves (truck, trailer &amp; U-Box) — a directional read on where movers are actually heading. Full-year {data.year} ranking, released {data.released}. The chip shows each market&apos;s movement vs. the prior year. A migration gauge, not Census net migration.
          </p>
        </div>
        <ChevronDown size={20} className={`mt-1 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
      <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {UHAUL_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`mono rounded-md border px-4 py-2 text-[12px] tracking-[0.04em] ${tab === t.key ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}>
            {t.label} <span className="opacity-50">{t.n}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
        {rows.map(([name, prev], i) => {
          const rank = i + 1;
          const mv = moveMeta(prev, rank);
          const c = mv.tone === "muted" ? "#797e85" : toneColor(mv.tone);
          return (
            <div key={name} className="flex items-center gap-3 border-b border-[var(--line)] py-3">
              <span className="mono w-7 shrink-0 text-right text-[13px] text-muted">{rank}</span>
              <span className="flex-1 font-semibold text-ink">{name}</span>
              <span className="mono rounded px-2 py-0.5 text-[11px]" style={{ color: c, backgroundColor: `${c}1a` }}>{mv.label}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        Source: U-Haul Growth Index ({data.year}), compiled from 2.5M+ annual one-way transactions across the U.S. and Canada. U-Haul notes rankings may not correlate directly to population or economic growth. <a href={data.source} target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">uhaul.com/about/migration</a>
      </p>
      </div>
      )}
    </div>
  );
}

const PODS_TABS = [
  { key: "movein", label: "Moving To", n: "Top 20", risingGood: true },
  { key: "moveout", label: "Leaving", n: "Top 20", risingGood: false },
];

function podsMoveMeta(prev, rank, risingGood) {
  if (prev == null) return { label: "NEW", tone: "signal" };
  const d = prev - rank; // > 0 = climbed toward #1
  if (d === 0) return { label: "\u2014", tone: "muted" };
  const arrow = d > 0 ? "\u25B2" : "\u25BC";
  const tone = (d > 0) === risingGood ? "bull" : "bear";
  return { label: `${arrow} ${Math.abs(d)}`, tone };
}

function PodsTrends({ data }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("movein");
  const cfg = PODS_TABS.find((t) => t.key === tab) || PODS_TABS[0];
  if (!data) {
    return (
      <div className="mt-14"><div className="card p-6">
        <p className="kicker flex items-center gap-2"><Package size={13} className="text-signal" /> Migration Intelligence</p>
        <p className="mt-2 text-sm text-muted">Loading PODS Moving Trends…</p>
      </div></div>
    );
  }
  const rows = data[tab] || [];
  return (
    <div className="mt-14">
      <div role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen((v) => !v)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }} className="card flex w-full cursor-pointer items-start gap-4 p-6 text-left transition hover:border-signal/30">
        <div className="flex-1">
          <p className="kicker mb-2 flex items-center gap-2"><Package size={13} className="text-signal" /> Migration Intelligence</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">PODS Moving Trends — {data.year}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            PODS container-move customer data ranking the markets gaining and losing the most movers. {data.year} report, released {data.released}. Movement is vs. the prior year — green means improving (more inflow or lighter outflow), red means worsening; on the Leaving list a higher rank means heavier outflow. A customer-move gauge, not Census net migration.
          </p>
        </div>
        <ChevronDown size={20} className={`mt-1 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
      <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {PODS_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`mono rounded-md border px-4 py-2 text-[12px] tracking-[0.04em] ${tab === t.key ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}>
            {t.label} <span className="opacity-50">{t.n}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
        {rows.map(([name, prev], i) => {
          const rank = i + 1;
          const mv = podsMoveMeta(prev, rank, cfg.risingGood);
          const c = mv.tone === "muted" ? "#797e85" : toneColor(mv.tone);
          return (
            <div key={name} className="flex items-center gap-3 border-b border-[var(--line)] py-3">
              <span className="mono w-7 shrink-0 text-right text-[13px] text-muted">{rank}</span>
              <span className="flex-1 font-semibold text-ink">{name}</span>
              <span className="mono rounded px-2 py-0.5 text-[11px]" style={{ color: c, backgroundColor: `${c}1a` }}>{mv.label}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        Source: PODS Moving Trends Report ({data.year}), based on PODS customer relocations and paired with its Moving Mindset survey. A directional read on container-move customers. <a href={data.source} target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">pods.com/blog/moving-trends</a>
      </p>
      </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="hidden md:block">
      <p className="mono text-[10px] tracking-[0.12em] text-muted">{label}</p>
      <p className="mono mt-1 text-sm" style={{ color: tone ? toneColor(tone) : "#eceeef" }}>{value}</p>
    </div>
  );
}


/* ---------------------------------------------------------------------------
   Industry Exposure Screen — cross-market.

   Pick a sector; see which metros actually depend on it (location quotient) and
   how that sector is performing IN THOSE MARKETS. Deliberately NOT a national
   trend screen: 35% of metro-industry pairs move opposite to their own national
   trend, so "this industry is hot nationally" does not identify a market. What
   identifies a market is exposure crossed with local performance.
--------------------------------------------------------------------------- */
const EXPO_SECTORS = [
  ["manufacturing", "Manufacturing"],
  ["prof_business", "Professional & Business"],
  ["education_health", "Education & Health"],
  ["leisure_hospitality", "Leisure & Hospitality"],
  ["trade_transport", "Trade & Transport"],
  ["information", "Information"],
  ["financial", "Financial"],
  ["mining_construction", "Mining & Construction"],
  ["government", "Government"],
  ["other_services", "Other Services"],
];

function IndustryExposureScreen() {
  const [open, setOpen] = useState(false);
  const [sector, setSector] = useState("manufacturing");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lazy: nothing is fetched until the drawer is opened, so the module costs
  // nothing on a page most visitors scroll past.
  useEffect(() => {
    if (!open) return;
    let on = true;
    setLoading(true); setData(null);
    fetch(`/api/industry-exposure?sector=${sector}`)
      .then((r) => r.json())
      .then((d) => { if (on) { setData(d?.found ? d : null); setLoading(false); } })
      .catch(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [sector, open]);

  const top = data?.markets?.filter((m) => m.lq >= 1.2).slice(0, 12) || [];

  return (
    <div className="mt-14">
      <div
        role="button" tabIndex={0} aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="card flex w-full cursor-pointer items-start gap-4 p-6 text-left transition hover:border-signal/30"
      >
        <div className="flex-1">
          <p className="kicker mb-2 flex items-center gap-2"><Factory size={13} className="text-signal" /> Employment Base Intelligence</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">Industry Exposure Screen</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Which markets <span className="text-ink">depend</span> on a given industry — and whether that industry is actually growing <span className="text-ink">there</span>.
            Concentration is measured by location quotient; performance is always measured locally, never inferred from the national trend.
          </p>
        </div>
        <ChevronDown size={20} className={`mt-1 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="mt-6 rounded-lg border border-[var(--line)] bg-bg2/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="mono text-[12px] tracking-[0.1em] text-muted">SELECT AN INDUSTRY</p>
            {data && (
              <span className="mono text-[9px] text-muted/70">
                {fmtMonth(data.asOf)} \u00b7 BLS CES \u00b7 {data.summary.metros} metros
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXPO_SECTORS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSector(k)}
                className={`mono rounded px-2 py-1 text-[10px] transition ${
                  sector === k ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {loading && <p className="mono mt-3 text-[11px] text-muted">Loading\u2026</p>}
          {data && (
            <>
              <p className="mono mt-3 text-[11px] leading-relaxed text-muted">
                <span className="text-ink">{data.summary.concentrated}</span> of {data.summary.metros} metros are concentrated in{" "}
                {data.sectorLabel} (\u22651.2\u00d7). Of those,{" "}
                <span style={{ color: toneColor("bull") }}>{data.summary.concentratedGrowing} growing</span>
                {" \u00b7 "}
                <span style={{ color: toneColor("bear") }}>{data.summary.concentratedDeclining} declining</span>
                {" locally."}
              </p>
              <div className="mono mt-2 rounded border border-[var(--line)]">
                <div className="grid grid-cols-[1.6fr_auto_auto_auto] gap-2 border-b border-[var(--line)] bg-bg/40 px-3 py-1.5 text-[9px] tracking-[0.08em] text-muted">
                  <span>MARKET</span><span>CONC.</span><span>LOCAL YoY</span><span>READ</span>
                </div>
                {top.map((m) => (
                  <div key={m.cbsa} className="grid grid-cols-[1.6fr_auto_auto_auto] items-center gap-2 border-b border-[var(--line)]/50 px-3 py-1.5 text-[10px]">
                    <span className="text-ink">{m.name}</span>
                    <span className="text-muted">{m.lq}\u00d7</span>
                    <span style={{ color: toneColor((m.yoyPct ?? 0) >= 0 ? "bull" : "bear") }}>
                      {m.yoyPct == null ? "\u2014" : `${m.yoyPct >= 0 ? "+" : ""}${m.yoyPct}%`}
                    </span>
                    <span
                      className="rounded px-1 text-[8px]"
                      style={{ color: toneColor(m.state.tone || "neutral"), background: `${toneColor(m.state.tone || "neutral")}22` }}
                    >
                      {m.state.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mono mt-2 text-[9px] leading-relaxed text-muted/70">
                CONC. is the location quotient \u2014 a metro&apos;s share of the sector against the average metro. Ranked by concentration, not by growth:
                the screen answers who is <span className="text-muted">exposed</span>, then shows whether that exposure is paying off locally.
                Growth is never inferred from the national trend \u2014 35% of metro-industry pairs move the opposite way from theirs.
                A supporting-industries map is deliberately omitted: across all 36 supersector pairs, median correlation of local growth is 0.07, so linkage is not measurable at this grain.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ZipLookup() {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [demo, setDemo] = useState(null); // ZIP-level Census demographics
  const [signals, setSignals] = useState(null); // metro-level signals (jobs, RPP, rent CPI…)
  const [oz, setOz] = useState(null); // Opportunity Zone 2.0 eligibility (tract grain)
  const [inds, setInds] = useState(null); // metro industry employment mix
  const [expo, setExpo] = useState(null); // industry exposure: concentration (LQ) x local growth
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [msg, setMsg] = useState("");
  const [userId, setUserId] = useState(undefined); // undefined = loading; null = signed out
  const [savedZips, setSavedZips] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  // Who's signed in, and which ZIPs are already on their list?
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setUserId(null); return; }
      setUserId(user.id);
      const { data: rows } = await supabase.from("user_zip_codes").select("zip").eq("user_id", user.id);
      if (!active) return;
      setSavedZips(new Set((rows || []).map((r) => r.zip)));
    })();
    return () => { active = false; };
  }, [supabase]);

  const saveZip = async (zip) => {
    if (!userId || savedZips.has(zip)) return;
    setSaving(true);
    // Append to the end of the user's list.
    const { count } = await supabase.from("user_zip_codes").select("zip", { count: "exact", head: true }).eq("user_id", userId);
    await supabase.from("user_zip_codes").upsert({ user_id: userId, zip, position: count || 0 });
    setSavedZips((prev) => new Set(prev).add(zip));
    setSaving(false);
  };

  const search = async () => {
    const v = q.trim();
    if (!v) { setStatus("error"); setMsg("Enter a ZIP code or City, State."); setData(null); return; }
    setStatus("loading"); setMsg(""); setData(null); setDemo(null); setSignals(null); setOz(null); setInds(null); setExpo(null);
    const isZip = /^\d{5}$/.test(v);
    try {
      const [zr, dr, sr] = await Promise.all([
        fetch(`/api/zip?q=${encodeURIComponent(v)}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
        isZip ? fetch(`/api/zip-demographics?zip=${v}`).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
        isZip ? fetch(`/api/metro-signals?zip=${v}`).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
      ]);
      if (!zr.ok) { setStatus("error"); setMsg(zr.d.error || "Lookup failed. Please try again."); return; }
      setData(zr.d);
      if (dr?.found) setDemo(dr);
      let signalRes = sr;
      // City / Metro / County lookups: resolve to the parent metro's signals
      if (!isZip && zr.d?.found && zr.d.code) {
        signalRes = await fetch(`/api/metro-signals?metro=${encodeURIComponent(zr.d.code)}`).then((r) => r.json()).catch(() => null);
      }
      if (signalRes?.found) setSignals(signalRes);
      // OZ 2.0 is tract-grain; the lookup hands back the tightest scope it could
      // resolve (county when known, else CBSA). Fetched separately so a slow or
      // missing OZ read never delays the rent card.
      // Industry mix is metro-grain only; a ZIP/city lookup uses its parent CBSA.
      const cbsaForInds = zr.d?.metroCbsa;
      if (cbsaForInds) {
        fetch(`/api/industries?cbsa=${encodeURIComponent(cbsaForInds)}`)
          .then((r) => r.json())
          .then((o) => { if (o?.found) setInds(o); })
          .catch(() => {});
        // Exposure = how concentrated this metro is in each sector (location
        // quotient), crossed with how that sector is doing LOCALLY.
        fetch(`/api/industry-exposure?cbsa=${encodeURIComponent(cbsaForInds)}`)
          .then((r) => r.json())
          .then((o) => { if (o?.found) setExpo(o); })
          .catch(() => {});
      }
      const scope = zr.d?.ozScope;
      if (scope) {
        fetch(`/api/oz?${scope.kind === "county" ? "county" : "cbsa"}=${encodeURIComponent(scope.code)}`)
          .then((r) => r.json())
          .then((o) => { if (o?.found) setOz({ ...o, scopeLabel: scope.label }); })
          .catch(() => {});
      }
      setStatus("idle");
    } catch {
      setStatus("error"); setMsg("Lookup failed. Please try again.");
    }
  };

  const GRAIN = { zip: "ZIP", city: "CITY", county: "COUNTY", metro: "METRO" };
  const up = data?.found && (data.yoyPct == null || data.yoyPct >= 0);

  return (
    <section className="relative mt-8 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.07] via-bg2/40 to-bg/20 p-6 md:p-7">
      <p className="kicker mb-2 flex items-center gap-2"><Search size={13} className="text-signal" /> Market Lookup</p>
      <h2 className="headline text-2xl text-ink md:text-3xl">Look up any ZIP or city</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Enter a 5-digit ZIP or a City, State. You get the most precise rent read available — and if a ZIP isn&apos;t covered, it rolls up to the city, county, or metro, always clearly labeled.
      </p>

      <div className="mt-5 flex max-w-md gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="ZIP code or City, State"
          className="flex-1 rounded-md border border-[var(--line)] bg-bg2 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-signal/40"
        />
        <button onClick={search} disabled={status === "loading"} className="mono rounded-md bg-signal px-5 py-2.5 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50">
          {status === "loading" ? "…" : "SEARCH"}
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-[12px] text-down">{msg}</p>}

      {data && !data.found && (
        <p className="mt-5 text-sm text-muted">
          {data.kind === "parse"
            ? (data.message || "Couldn't read that. Try a format like \"Austin, TX\".")
            : <>No rent data for <span className="text-ink">{data.query}</span> — Zillow doesn&apos;t cover every area. Try a nearby ZIP or a larger city.</>}
        </p>
      )}

      {data?.found && (
        <div className="mt-5 rounded-xl border border-[var(--line)] bg-bg2/60 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mono flex flex-wrap items-center gap-2 text-[11px] tracking-[0.12em] text-muted">
                <span className="rounded bg-signal/15 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-signal">{GRAIN[data.grain]}</span>
                {data.place && /^\d{5}$/.test(String(data.query || ""))
                  ? `${data.place} · ZIP ${data.query}`
                  : data.label} · OBSERVED RENT
                {data.basis && (
                  <span className="rounded bg-line/60 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-muted">
                    {data.basis === "multifamily" ? "MULTIFAMILY" : "ALL RENTALS"}
                  </span>
                )}
              </p>
              <p className="mt-1.5 text-3xl font-semibold text-ink">${data.rent.toLocaleString()}<span className="ml-1 text-sm text-muted">/mo</span></p>
              <p className="mt-1 text-sm">
                {data.yoyPct == null ? (
                  <span className="text-muted">Not enough history for a year-over-year read yet.</span>
                ) : (
                  <span style={{ color: toneColor(data.yoyPct >= 0 ? "bull" : "bear") }}>{data.yoyPct >= 0 ? "+" : ""}{data.yoyPct}% YoY</span>
                )}
              </p>
              {data.traj && (
                <p className="mono mt-1.5 text-[11px] leading-relaxed tracking-[0.02em] text-muted">
                  <span style={{ color: toneColor(data.traj.tone) }}>
                    {data.traj.direction === "improving" ? "\u2197" : data.traj.direction === "deteriorating" ? "\u2198" : "\u2192"} {data.traj.label}
                  </span>
                  {data.traj.inflection && (
                    <span className="ml-1.5 rounded bg-signal/15 px-1 py-px text-[8px] tracking-[0.08em] text-signal">TURN</span>
                  )}
                  <span className="mt-0.5 block">
                    rent growth{" "}
                    {[data.traj.segments[0].from, ...data.traj.segments.map((sg) => sg.to)].map((v, i, arr) => (
                      <span key={i}>
                        {i > 0 && <span className="px-0.5 text-muted/50">{"\u203a"}</span>}
                        <span className={i === arr.length - 1 ? "text-ink" : ""}>{v >= 0 ? "+" : ""}{v}%</span>
                      </span>
                    ))}
                    <span className="text-muted/70">{" \u00b7 24mo \u203a 12mo \u203a now"}</span>
                  </span>
                  <span className="block text-muted/70">{data.traj.note}</span>
                </p>
              )}
              {data.metroMf && data.metroMf.yoyPct != null && (
                <p className="mono mt-1.5 text-[11px] tracking-[0.02em] text-muted">
                  <span className="rounded bg-signal/15 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-signal">MULTIFAMILY</span>{" "}
                  {data.metroMf.label} metro apartments{" "}
                  <span style={{ color: toneColor(data.metroMf.yoyPct >= 0 ? "bull" : "bear") }}>
                    {data.metroMf.yoyPct >= 0 ? "+" : ""}{data.metroMf.yoyPct}% YoY
                  </span>
                  {data.metroMf.traj && (
                    <span className="text-muted/70">
                      {" \u00b7 "}
                      <span style={{ color: toneColor(data.metroMf.traj.tone) }}>
                        {data.metroMf.traj.direction === "improving" ? "\u2197" : data.metroMf.traj.direction === "deteriorating" ? "\u2198" : "\u2192"} {data.metroMf.traj.label}
                      </span>
                    </span>
                  )}
                </p>
              )}
              {data.metro && data.grain !== "metro" && data.metro.yoyPct != null && data.yoyPct != null && (() => {
                const delta = Math.round((data.yoyPct - data.metro.yoyPct) * 10) / 10;
                const tag = delta < -0.5 ? "softening faster than its metro" : delta > 0.5 ? "outperforming its metro" : "in line with its metro";
                return (
                  <p className="mono mt-1.5 text-[11px] tracking-[0.02em] text-muted">
                    vs <span className="text-ink">{data.metro.label}</span> metro (all rentals){" "}
                    <span style={{ color: toneColor(data.metro.yoyPct >= 0 ? "bull" : "bear") }}>
                      {data.metro.yoyPct >= 0 ? "+" : ""}{data.metro.yoyPct}%
                    </span>{" "}
                    YoY · <span className="text-ink/70">{tag}</span>
                  </p>
                );
              })()}
            </div>
            <div className="flex flex-col items-end gap-3">
              {data.trend?.length > 1 && (
                <Sparkline series={data.trend} color={up ? "#5FB97C" : "#E5634D"} w={170} h={46} />
              )}
              {/^\d{5}$/.test(String(data.query || "")) && (
                userId === null ? (
                  <Link href="/login" className="mono flex items-center gap-2 rounded-md border border-[var(--line-strong)] px-3 py-2 text-[11px] tracking-[0.04em] text-muted hover:text-ink">
                    <Bookmark size={13} /> Sign in to save
                  </Link>
                ) : savedZips.has(data.query) ? (
                  <span className="mono flex items-center gap-2 rounded-md border border-up/40 bg-up/10 px-3 py-2 text-[11px] tracking-[0.04em] text-up">
                    <Check size={13} /> Saved to My Zip Codes
                  </span>
                ) : (
                  <button onClick={() => saveZip(data.query)} disabled={saving || userId === undefined} className="mono flex items-center gap-2 rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-[11px] tracking-[0.04em] text-signal hover:bg-signal/20 disabled:opacity-50">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Bookmark size={13} />} Save to My Zip Codes
                  </button>
                )
              )}
            </div>
          </div>

          {data.rolledUp && (
            <p className="mono mt-3 rounded-md border border-signal/20 bg-signal/[0.06] px-3 py-2 text-[10px] leading-relaxed tracking-[0.04em] text-muted">
              No ZIP-level series for {data.rolledFrom} — showing the closest covered area ({data.label}).
            </p>
          )}

          <p className="mono mt-3 text-[10px] tracking-[0.08em] text-muted">
            Zillow Observed Rent Index · {data.label} · {data.basis === "multifamily" ? "multifamily (5+ units)" : "all rental types (SFR + condo + MF)"} · market asking rent, smoothed &amp; seasonally adjusted · as of {data.asOf}
          </p>
          {inds && inds.industries?.length > 0 && (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="mono text-[12px] tracking-[0.1em] text-muted">
                  INDUSTRY GROWTH · {data.metroLabel || "METRO"} · BLS CES
                </p>
                <span className="mono text-[9px] text-muted/70">
                  {fmtMonth(inds.asOf)} · {inds.totalEmployment.toLocaleString()}k jobs
                </span>
              </div>
              {inds.topByAdds?.length > 0 && (
                <p className="mono mt-1.5 text-[11px] leading-relaxed text-muted">
                  Driving job growth:{" "}
                  <span className="text-ink">{inds.topByAdds.join(" \u00b7 ")}</span>
                </p>
              )}
              {expo?.concentration && (
                <p className="mono mt-1 text-[11px] leading-relaxed text-muted">
                  Most concentrated in{" "}
                  <span className="text-ink">{expo.concentration.topSectorLabel}</span>{" "}
                  <span className="text-muted/70">
                    ({expo.concentration.maxLq}\u00d7 the average metro
                    {expo.concentration.topSectorYoy != null && (
                      <>, <span style={{ color: toneColor(expo.concentration.topSectorYoy >= 0 ? "bull" : "bear") }}>
                        {expo.concentration.topSectorYoy >= 0 ? "+" : ""}{expo.concentration.topSectorYoy}% locally
                      </span></>
                    )})
                  </span>
                  {expo.fragileSectors?.length > 0 && (
                    <>
                      {" \u00b7 "}
                      <span style={{ color: toneColor("bear") }}>
                        fragile: {expo.fragileSectors.join(", ")}
                      </span>
                    </>
                  )}
                </p>
              )}
              <div className="mt-2 rounded border border-[var(--line)]">
                <div className="mono grid grid-cols-[1.4fr_auto_auto_auto_auto] gap-2 border-b border-[var(--line)] bg-bg/40 px-3 py-1.5 text-[9px] tracking-[0.08em] text-muted">
                  <span>INDUSTRY</span><span>JOBS</span><span>YoY</span><span title="Location quotient: this metro's share of the sector vs the average metro. 2.0 = twice as concentrated.">CONC.</span><span>GROWTH PATH (12MO AVG)</span>
                </div>
                {inds.industries.map((r) => (
                  <div key={r.slug} className="mono grid grid-cols-[1.4fr_auto_auto_auto_auto] items-center gap-2 border-b border-[var(--line)]/50 px-3 py-1.5 text-[10px]">
                    <span className="text-ink">
                      {r.name}
                      <span className="ml-1 text-muted/60">{r.share}%</span>
                    </span>
                    <span className="text-muted">{r.employment.toLocaleString()}k</span>
                    <span style={{ color: toneColor(r.yoyPct >= 0 ? "bull" : "bear") }}>
                      {r.yoyPct >= 0 ? "+" : ""}{r.yoyPct}%
                    </span>
                    {(() => {
                      const e = expo?.sectors?.find((x) => `metro_emp_${x.sector}` === r.slug);
                      if (!e) return <span className="text-muted/40">\u2014</span>;
                      // Bold the LQ only where the metro is genuinely specialized;
                      // an LQ near 1.0 is the average and carries no signal.
                      const conc = e.lq >= 1.2;
                      return (
                        <span
                          title={`${e.name}: ${e.lq}\u00d7 the average metro (${e.localSharePct}% of local jobs vs ${e.natlSharePct}% nationally) \u2014 ${e.state.label}`}
                          className="flex items-center gap-1"
                        >
                          <span className={conc ? "text-ink" : "text-muted/60"}>{e.lq}\u00d7</span>
                          {conc && e.state.tone && (
                            <span
                              className="rounded px-1 text-[8px]"
                              style={{
                                color: toneColor(e.state.tone),
                                background: `${toneColor(e.state.tone)}22`,
                              }}
                            >
                              {e.state.key === "fragile" ? "FRAGILE" : e.state.key === "compounding" ? "COMPOUND" : "FLAT"}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                    {r.traj ? (
                      <span
                        className="flex items-center gap-1"
                        title={`${r.traj.label} \u2014 ${r.traj.note}`}
                      >
                        <span className="text-muted/70">
                          {r.traj.segments.map((sg) => `${sg.mean >= 0 ? "+" : ""}${sg.mean}`).join(" \u203a ")}
                        </span>
                        <span style={{ color: toneColor(r.traj.tone) }}>
                          {r.traj.direction === "improving" ? "\u2197" : r.traj.direction === "deteriorating" ? "\u2198" : "\u2192"}
                        </span>
                        {r.traj.inflection && (
                          <span className="rounded bg-signal/15 px-1 text-[8px] text-signal">TURN</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted/50">\u2014</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mono mt-2 text-[9px] leading-relaxed text-muted/70">
                Eleven mutually exclusive supersectors that sum to total nonfarm \u2014 aggregates (Total Private, Goods Producing) and
                sub-components are excluded so nothing double-counts. Share is of metro employment; the path is each industry&apos;s AVERAGE
                year-over-year growth in the prior 12 months versus the most recent 12 \u2014 averages, not endpoints, so a single noisy month cannot flip the read. Not seasonally adjusted, so every read is year-over-year.
                {data.grain !== "metro" && " Industry data is metro-grain: no public source publishes establishment-based industry employment at ZIP or city level."}
                {expo && (
                  <>
                    {" "}CONC. is the location quotient \u2014 this metro&apos;s share of a sector against the average metro; 2.0\u00d7 means twice as concentrated.
                    Growth is always measured <span className="text-muted">locally</span>: across 393 metros, 35% of metro-industry pairs move opposite to their own national trend,
                    so a national trend cannot be used to infer local performance. <span style={{ color: toneColor("bear") }}>FRAGILE</span> marks a sector this market is specialized in and losing.
                  </>
                )}
              </p>
            </div>
          )}

          {oz && oz.summary?.eligible > 0 && (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="mono text-[12px] tracking-[0.1em] text-muted">
                  OPPORTUNITY ZONES · {oz.scopeLabel?.toUpperCase()}
                </p>
                <span className="mono rounded bg-signal/15 px-1.5 py-0.5 text-[8px] tracking-[0.08em] text-signal">
                  NOMINATIONS OPEN
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["OZ 2.0 eligible", oz.summary.eligible, `of ${oz.summary.tracts} tracts · ${oz.summary.eligiblePct}%`],
                  ["Likely designated", `~${oz.summary.likelyDesignated}`, "governors pick ~25%"],
                  ["Also LIHTC QCT", oz.summary.ozAndQct, `stacked · ${oz.lihtcRule.basisBoost}% basis boost`],
                  ["QCT county-wide", oz.summary.qct, "separate program"],
                ].map(([k, v, sub]) => (
                  <div key={k}>
                    <p className="mono text-[9px] tracking-[0.08em] text-muted">{k.toUpperCase()}</p>
                    <p className="headline mt-0.5 text-lg text-ink">{v}</p>
                    <p className="mono text-[9px] text-muted/70">{sub}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 max-h-44 overflow-y-auto rounded border border-[var(--line)]">
                <div className="mono grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-[var(--line)] bg-bg/40 px-3 py-1.5 text-[9px] tracking-[0.08em] text-muted">
                  <span>TRACT</span><span>MFI %</span><span>POV</span><span>PROGRAMS</span>
                </div>
                {oz.tracts.slice(0, 40).map((t) => (
                  <div key={t.fips} className="mono grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-[var(--line)]/50 px-3 py-1.5 text-[10px]">
                    <span className="text-ink">{t.name}</span>
                    <span className="text-muted">{t.mfiPctOfArea != null ? `${t.mfiPctOfArea}%` : "\u2014"}</span>
                    <span className="text-muted">{t.povertyRate != null ? `${t.povertyRate}%` : "\u2014"}</span>
                    <span className="flex gap-1">
                      <span className="rounded bg-signal/15 px-1 text-[8px] text-signal">OZ</span>
                      {t.qct && <span className="rounded bg-up/15 px-1 text-[8px] text-up">QCT</span>}
                    </span>
                  </div>
                ))}
              </div>
              {oz.capital && (
                <div className="mt-3 border-t border-[var(--line)] pt-3">
                  <p className="mono text-[10px] tracking-[0.1em] text-muted">CREDIT ACCESS · CFPB HMDA · 2023</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <span className="mono text-[11px] text-muted">
                      mortgage denial rate{" "}
                      {oz.capital.suppressed ? (
                        <span className="text-muted/60">insufficient sample</span>
                      ) : (
                        <span style={{ color: toneColor(oz.capital.denialRate > 26 ? "bear" : "bull") }}>
                          {oz.capital.denialRate}%
                        </span>
                      )}
                      <span className="text-muted/60"> · US 26.0%</span>
                    </span>
                    <span className="mono text-[11px] text-muted">
                      {oz.capital.applications?.toLocaleString()} applications
                    </span>
                    {oz.capital.origVolume != null && (
                      <span className="mono text-[11px] text-muted">
                        ${(oz.capital.origVolume / 1e9).toFixed(2)}B originated
                      </span>
                    )}
                    {oz.capital.nmdda && <span className="mono rounded bg-up/15 px-1.5 text-[9px] text-up">NON-METRO DDA</span>}
                  </div>
                </div>
              )}
              <p className="mono mt-2 text-[9px] leading-relaxed text-muted/70">
                OZ: Cignal-computed from Census ACS ({oz.rule.vintage}) under the OZ 2.0 test \u2014 <span className="text-muted">not Treasury&apos;s official list</span>.
                Treasury sets the final dataset; governors nominate up to {oz.rule.nominationShare}% of eligible tracts. Designations effective {oz.rule.effective}; OZ 1.0 sunsets {oz.rule.oz1Sunset}.
                Designation confers tax treatment, not an assured return \u2014 research on OZ 1.0 found minimal measurable effect on prices and permitting.
                Listed tracts are OZ-eligible. LIHTC Qualified Census Tracts are a <span className="text-muted">separate federal program</span> \u2014 HUD-designated, redesignated annually
                ({oz.lihtcRule.effective} lists), granting a {oz.lihtcRule.basisBoost}% basis boost to affordable-housing developers rather than capital-gains treatment to investors. Shown here because a tract can carry both.
                HMDA denial rate is suppressed below 50 applications.
              </p>
            </div>
          )}
          {demo && (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <p className="mono text-[12px] tracking-[0.1em] text-muted">ZIP DEMOGRAPHICS · CENSUS ACS · OCCUPIED STOCK</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Median Contract Rent", demo.medianContractRent != null ? `$${demo.medianContractRent.toLocaleString()}` : "—", "excl. utilities"],
                  ["Tenant-Paid Utilities", demo.utilityLoad != null ? `$${Math.round(demo.utilityLoad).toLocaleString()}` : "—", "gross − contract"],
                  ["Median Household Income", demo.medianIncome != null ? `$${demo.medianIncome.toLocaleString()}` : "—", "ACS B19013"],
                  ["Rent Burden", demo.rentBurden != null ? `${demo.rentBurden}%` : "—", "gross rent ÷ income"],
                  ["Renter Share", demo.renterShare != null ? `${demo.renterShare}%` : "—", "of occupied units"],
                  ["MF Stock (5+ units)", demo.mfStockShare != null ? `${demo.mfStockShare}%` : "—", "of housing units"],
                  ["Median Home Value", demo.medianHomeValue != null ? `$${demo.medianHomeValue.toLocaleString()}` : "—", "owner-occupied"],
                ].map(([k, v, sub]) => (
                  <div key={k} className="rounded-lg border border-[var(--line)] bg-bg2/40 p-3">
                    <p className="mono text-[9px] tracking-[0.08em] text-muted">{k.toUpperCase()}</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{v}</p>
                    <p className="mono mt-0.5 text-[9px] tracking-[0.04em] text-muted/70">{sub}</p>
                  </div>
                ))}
              </div>
              <p className="mono mt-3 text-[10px] leading-relaxed tracking-[0.08em] text-muted">
                Census ACS 5-Year · vintage {String(demo.asOf).slice(0, 4)} · <span className="text-ink/70">occupied stock</span>, what sitting tenants pay — not market asking rent. Contract rent is the rent line; utilities are shown separately. Rent burden is published by Census on a <span className="text-ink/70">gross</span> basis only.
              </p>
            </div>
          )}

          {signals && (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <p className="mono text-[12px] tracking-[0.1em] text-muted">
                METRO SIGNALS{signals.metroName ? ` · ${signals.metroName.replace(/ \(Metropolitan.*\)$/, "")}` : ""}
              </p>
              <div className="mt-3 space-y-3">
                {metroSignalRows(signals).map((row) => (
                  <IndicatorRow key={row.name} row={row} />
                ))}
              </div>
              <p className="mono mt-3 text-[10px] tracking-[0.08em] text-muted">Metro level (CBSA) · BLS jobs &amp; unemployment, BEA rent price parity, Apartment List vacancy &amp; days-on-market{signals.signals?.countyGdp ? ` · real GDP is county-level (BEA CAGDP9${signals.countyName ? `, ${signals.countyName}` : ""})` : ""}</p>

              {signals.migration && (
                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <p className="mono text-[10px] tracking-[0.1em] text-muted">MIGRATION · WHO&apos;S MOVING IN</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {signals.migration.inAgi != null && (
                      <div className="rounded-lg border border-[var(--line)] bg-bg2/40 p-3">
                        <p className="mono text-[9px] tracking-[0.08em] text-muted">IN-MIGRANT INCOME</p>
                        <p className="mt-1 text-lg font-semibold text-ink">${signals.migration.inAgi.toLocaleString()}</p>
                        <p className="mono text-[8px] tracking-[0.08em] text-muted">avg AGI of arriving households</p>
                      </div>
                    )}
                    {signals.migration.net != null && (
                      <div className="rounded-lg border border-[var(--line)] bg-bg2/40 p-3">
                        <p className="mono text-[9px] tracking-[0.08em] text-muted">NET MIGRATION</p>
                        <p className="mt-1 text-lg font-semibold" style={{ color: toneColor(signals.migration.net >= 0 ? "bull" : "bear") }}>
                          {signals.migration.net >= 0 ? "+" : "\u2212"}{Math.abs(signals.migration.net).toLocaleString()}
                        </p>
                        <p className="mono text-[8px] tracking-[0.08em] text-muted">households / yr</p>
                      </div>
                    )}
                    {signals.migration.diff != null && (
                      <div className="rounded-lg border border-[var(--line)] bg-bg2/40 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="mono text-[9px] tracking-[0.08em] text-muted">AFFLUENCE TREND</p>
                            <p className="mt-1 text-lg font-semibold" style={{ color: toneColor(signals.migration.diff >= 0 ? "bull" : "bear") }}>
                              {signals.migration.diff >= 0 ? "+" : "\u2212"}${Math.abs(signals.migration.diff).toLocaleString()}
                            </p>
                          </div>
                          {signals.migration.diffTrend?.length > 1 && (
                            <Sparkline series={signals.migration.diffTrend.map((d) => d.v)} color={signals.migration.diff >= 0 ? "#5FB97C" : "#E5634D"} w={64} h={32} />
                          )}
                        </div>
                        <p className="mono text-[8px] tracking-[0.08em] text-muted">in {"\u2212"} out AGI{signals.migration.diffTrend?.length ? ` · ${signals.migration.diffTrend[0].y}\u2013${signals.migration.inAgiYear}` : ""}</p>
                      </div>
                    )}
                  </div>
                  <p className="mono mt-3 text-[10px] tracking-[0.08em] text-muted">IRS SOI tax-return migration · in-migrant income = avg AGI of households that moved in · positive affluence trend = arrivals out-earn leavers (~2-yr lag)</p>
                </div>
              )}
            </div>
          )}

          {!demo && !signals && (
            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <p className="mono text-[10px] tracking-[0.1em] text-muted">COMING NEXT FOR THIS AREA</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">Local job growth, building permits &amp; news at the county/metro level.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
