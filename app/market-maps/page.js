"use client";

import { useState } from "react";
import { MapPin, Building2, ChevronDown, Truck } from "lucide-react";
import { toneColor } from "@/components/ui";
import { useContent, useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import { UHAUL } from "@/lib/uhaul";

function BarChart({ all }) {
  const w = 1100, h = 230, pad = 30;
  const vals = all.map((m) => parseFloat(m.rent));
  const max = Math.max(...vals, 6), min = Math.min(...vals, -2);
  const span = max - min || 1;
  const bw = (w - pad * 2) / Math.max(all.length, 1);
  const zeroY = pad + ((max - 0) / span) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full">
      <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {all.map((m, i) => {
        const v = parseFloat(m.rent);
        const x = pad + i * bw + bw * 0.18;
        const bwInner = bw * 0.64;
        const y = pad + ((max - Math.max(v, 0)) / span) * (h - pad * 2);
        const hgt = Math.abs((v / span) * (h - pad * 2));
        const showLabel = all.length <= 12 || i % 2 === 0;
        return (
          <g key={m.city}>
            <rect x={x} y={v >= 0 ? y : zeroY} width={bwInner} height={hgt} rx="3" fill={toneColor(m.tone)} opacity="0.85" />
            {showLabel && (
              <text x={x + bwInner / 2} y={h + 14} textAnchor="middle" fontSize="11" fill="#797e85" fontFamily="IBM Plex Mono">{m.city.split(",")[0]}</text>
            )}
          </g>
        );
      })}
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
  const labels = COPY.mmMetrics || ["Rent Growth", "Vacancy", "Cap Rate", "NOI Growth"];
  const filters = ["All", ...MARKET_GROUPS.map((g) => g.region)];
  const groups = MARKET_GROUPS.filter((g) => f === "All" || g.region === f);
  const all = MARKET_GROUPS.flatMap((g) => g.markets).sort((a, b) => parseFloat(b.rent) - parseFloat(a.rent));

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Market Maps</h1>
      <p className="mt-3 max-w-2xl text-muted">{COPY.mmSubtitle || "Fundamentals scored and ranked across top U.S. metros."}</p>

      <div className="card mt-8 p-6">
        <h2 className="mb-4 font-semibold text-ink">{labels[0]} Comparison — Top Markets</h2>
        <BarChart all={all} />
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
                <Metric label={labels[0]} value={m.rent} tone={m.tone} />
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

      <MigrationTrends />
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

function MigrationTrends() {
  const [tab, setTab] = useState("metros");
  const rows = UHAUL[tab] || [];
  return (
    <div className="mt-14">
      <p className="kicker mb-2 flex items-center gap-2"><Truck size={13} className="text-signal" /> Migration Intelligence</p>
      <h2 className="headline text-2xl text-ink md:text-3xl">U-Haul Growth Index — {UHAUL.year}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Net gain or loss of one-way U-Haul moves (truck, trailer &amp; U-Box) — a directional read on where movers are actually heading. Full-year {UHAUL.year} ranking, released {UHAUL.released}. The chip shows each market&apos;s movement vs. the prior year. A migration gauge, not Census net migration.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
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
        Source: U-Haul Growth Index ({UHAUL.year}), compiled from 2.5M+ annual one-way transactions across the U.S. and Canada. U-Haul notes rankings may not correlate directly to population or economic growth. <a href={UHAUL.source} target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">uhaul.com/about/migration</a>
      </p>
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
