"use client";

import { useState, useEffect } from "react";
import { MapPin, Building2, ChevronDown, Truck, Package, Search } from "lucide-react";
import { toneColor, Sparkline } from "@/components/ui";
import { useContent, useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import EmergingMarkets from "@/components/EmergingMarkets";

function fmtMonth(d) {
  if (!d) return "";
  const x = new Date(d + "T00:00:00Z");
  return x.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function BarChart({ all }) {
  const [hi, setHi] = useState(null);
  const w = 1100, h = 230, pad = 30;
  const vals = all.map((m) => m.rentVal);
  const max = Math.max(...vals, 6), min = Math.min(...vals, -2);
  const span = max - min || 1;
  const bw = (w - pad * 2) / Math.max(all.length, 1);
  const yOf = (v) => pad + ((max - v) / span) * (h - pad * 2);
  const zeroY = yOf(0);
  const showLabels = all.length <= 12;

  return (
    <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full" onMouseLeave={() => setHi(null)}>
      <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {all.map((m, i) => {
        const v = m.rentVal;
        const x = pad + i * bw + bw * 0.18;
        const bwInner = bw * 0.64;
        const y = v >= 0 ? yOf(v) : zeroY;
        const hgt = Math.max(Math.abs(yOf(v) - zeroY), 1);
        const isHi = hi === i;
        const showLabel = (showLabels || i % 2 === 0) && !isHi;
        return (
          <g key={m.city} onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }}>
            <rect x={pad + i * bw} y={pad} width={bw} height={h - pad} fill="transparent" />
            <rect
              x={x} y={y} width={bwInner} height={hgt} rx="3"
              fill={toneColor(m.rentTone || m.tone)} opacity={isHi ? 1 : 0.85}
              style={{
                transition: "transform .18s ease, opacity .18s ease",
                transformBox: "fill-box",
                transformOrigin: v >= 0 ? "center bottom" : "center top",
                transform: isHi ? "scaleY(1.09)" : "none",
              }}
            />
            {showLabel && (
              <text x={x + bwInner / 2} y={h + 14} textAnchor="middle" fontSize="11" fill="#797e85" fontFamily="IBM Plex Mono">{m.city.split(",")[0]}</text>
            )}
          </g>
        );
      })}
      {hi != null && all[hi] && (() => {
        const m = all[hi];
        const v = m.rentVal;
        const cx = pad + hi * bw + bw * 0.5;
        const pctTxt = `${v >= 0 ? "+" : ""}${v}%`;
        const label = `${m.city}   ${pctTxt}`;
        const tw = label.length * 6.6 + 22;
        const tx = Math.max(pad, Math.min(cx - tw / 2, w - pad - tw));
        const ty = Math.max(yOf(Math.max(v, 0)) - 40, 2);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={tw} height={28} rx="6" fill="#0E0F11" stroke="rgba(245,181,68,0.55)" strokeWidth="1" />
            <text x={tx + tw / 2} y={ty + 18} textAnchor="middle" fontSize="12.5" fontFamily="IBM Plex Mono">
              <tspan fill="#ECEDEF">{m.city}</tspan>
              <tspan fill={toneColor(m.rentTone || m.tone)}>{"   " + pctTxt}</tspan>
            </text>
          </g>
        );
      })()}
    </svg>
  );
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
  useEffect(() => {
    fetch("/api/migration").then((r) => r.json()).then(setMig).catch(() => setMig({}));
    fetch("/api/metro-growth").then((r) => r.json()).then(setGrowth).catch(() => setGrowth({ growth: {} }));
  }, []);
  const labels = COPY.mmMetrics || ["Rent Growth", "Vacancy", "Cap Rate", "NOI Growth"];
  const gmap = growth?.growth || {};
  const loaded = growth != null;
  const withLive = (m) => {
    const g = gmap[m.city];
    if (g == null) return { ...m, rentVal: parseFloat(m.rent), rentTone: m.tone, live: false };
    const rentTone = g > 0.15 ? "bull" : g < -0.15 ? "bear" : "neutral";
    return { ...m, rent: `${g >= 0 ? "+" : ""}${g}%`, rentVal: g, rentTone, live: true };
  };
  const groupsAll = MARKET_GROUPS.map((g) => ({ ...g, markets: g.markets.map(withLive) }));
  const filters = ["All", ...MARKET_GROUPS.map((g) => g.region)];
  const groups = groupsAll.filter((g) => f === "All" || g.region === f);
  const flat = groupsAll.flatMap((g) => g.markets);
  // Rent Growth Comparison chart shows positive-growth markets only (prefers live ZORI data).
  const all = flat.filter((m) => (loaded ? m.live : true) && m.rentVal > 0).sort((a, b) => b.rentVal - a.rentVal);

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Market Maps</h1>
      <p className="mt-3 max-w-2xl text-muted">{COPY.mmSubtitle || "Fundamentals scored and ranked across top U.S. metros."}</p>

      <ZipLookup />

      <div className="card mt-8 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">{labels[0]} Comparison — Top Markets</h2>
          <span className="mono text-[10px] tracking-[0.08em] text-muted">
            {growth?.asOf ? <><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-up align-middle" />LIVE · ZORI YoY · as of {fmtMonth(growth.asOf)}</> : "Loading live data…"}
          </span>
        </div>
        <BarChart all={all} />
        <p className="mono mt-2 text-[10px] tracking-[0.06em] text-muted">Hover a bar for the metro and its year-over-year rent growth · sorted high to low.</p>
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
              <div key={m.city} className={`grid grid-cols-2 items-center gap-4 px-6 py-5 md:grid-cols-[1.4fr_repeat(4,1fr)_auto] bg-bg2 ${i ? "border-t border-[var(--line)]" : ""}`}>
                <p className="flex items-center gap-2 font-semibold text-ink"><MapPin size={14} className="text-muted" /> {m.city}</p>
                <Metric label={labels[0]} value={m.rent} tone={m.rentTone} />
                <Metric label={labels[1]} value={m.vac} />
                <Metric label={labels[2]} value={m.cap} />
                <Metric label={labels[3]} value={m.noi} tone={m.tone} />
                <div className="flex items-center justify-end gap-3">
                  <span className="mono rounded px-2.5 py-1 text-[12px]" style={{ color: toneColor(m.tone), backgroundColor: `${toneColor(m.tone)}1a` }}>{m.score}</span>
                  <ChevronDown size={16} className="hidden text-muted md:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <MigrationTrends data={mig?.uhaul} />
      <PodsTrends data={mig?.pods} />
      <EmergingMarkets />
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

function ZipLookup() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [msg, setMsg] = useState("");

  const search = async () => {
    const v = q.trim();
    if (!v) { setStatus("error"); setMsg("Enter a ZIP code or City, State."); setData(null); return; }
    setStatus("loading"); setMsg(""); setData(null);
    try {
      const r = await fetch(`/api/zip?q=${encodeURIComponent(v)}`);
      const d = await r.json();
      if (!r.ok) { setStatus("error"); setMsg(d.error || "Lookup failed. Please try again."); return; }
      setData(d); setStatus("idle");
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
                {data.label} · OBSERVED RENT
              </p>
              <p className="mt-1.5 text-3xl font-semibold text-ink">${data.rent.toLocaleString()}<span className="ml-1 text-sm text-muted">/mo</span></p>
              <p className="mt-1 text-sm">
                {data.yoyPct == null ? (
                  <span className="text-muted">Not enough history for a year-over-year read yet.</span>
                ) : (
                  <span style={{ color: toneColor(data.yoyPct >= 0 ? "bull" : "bear") }}>{data.yoyPct >= 0 ? "+" : ""}{data.yoyPct}% YoY</span>
                )}
              </p>
            </div>
            {data.trend?.length > 1 && (
              <Sparkline series={data.trend} color={up ? "#5FB97C" : "#E5634D"} w={170} h={46} />
            )}
          </div>

          {data.rolledUp && (
            <p className="mono mt-3 rounded-md border border-signal/20 bg-signal/[0.06] px-3 py-2 text-[10px] leading-relaxed tracking-[0.04em] text-muted">
              No ZIP-level series for {data.rolledFrom} — showing the closest covered area ({data.label}).
            </p>
          )}

          <p className="mono mt-3 text-[10px] tracking-[0.08em] text-muted">As of {data.asOf} · Zillow Observed Rent Index (all rental types, smoothed)</p>
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="mono text-[10px] tracking-[0.1em] text-muted">COMING NEXT FOR THIS AREA</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">Renter share, occupancy &amp; vacancy, median income and household counts (Census ACS) · local job growth, building permits &amp; news at the county/metro level.</p>
          </div>
        </div>
      )}
    </section>
  );
}
