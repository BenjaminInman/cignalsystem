"use client";

import { useState } from "react";
import { MapPin, Building2, ChevronDown } from "lucide-react";
import { toneColor } from "@/components/ui";
import { useContent, useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";

const FILTERS = ["All", "Sun Belt", "Mountain West", "Gateway"];

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
        return (
          <g key={m.city}>
            <rect x={x} y={v >= 0 ? y : zeroY} width={bwInner} height={hgt} rx="3" fill={toneColor(m.tone)} opacity="0.85" />
            <text x={x + bwInner / 2} y={h + 14} textAnchor="middle" fontSize="11" fill="#797e85" fontFamily="IBM Plex Mono">{m.city.split(",")[0]}</text>
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
  const groups = MARKET_GROUPS.filter((g) => f === "All" || g.region === f.toUpperCase());
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
        {FILTERS.map((x) => (
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
