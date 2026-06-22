"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ChevronDown, MapPin } from "lucide-react";
import { toneColor } from "@/components/ui";

const fmtUSD = (n) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US")}`);
const fmtM = (n) => (n == null ? "—" : `$${Number(n).toFixed(1)}M`);
const pct = (n) => (n == null ? "—" : `${n > 0 ? "+" : ""}${Number(n).toFixed(1)}%`);
const bpsTxt = (n) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n} bps`);

// returns a tone key vs a benchmark ("bull" better / "bear" worse / "neutral")
const toneVs = (val, bench, higherBetter = true) => {
  if (val == null || bench == null) return "neutral";
  if (Math.abs(val - bench) < 1e-9) return "neutral";
  const better = higherBetter ? val > bench : val < bench;
  return better ? "bull" : "bear";
};

function Stat({ label, value, tone, sub }) {
  return (
    <div>
      <p className="mono text-[10px] tracking-[0.12em] text-muted">{label}</p>
      <p className="mono mt-1 text-sm" style={{ color: tone ? toneColor(tone) : "#ECEDEF" }}>{value}</p>
      {sub && <p className="mono mt-0.5 text-[10px] tracking-[0.06em] text-muted">{sub}</p>}
    </div>
  );
}

function Bench({ label, value, sub }) {
  return (
    <div>
      <p className="mono text-[10px] tracking-[0.12em] text-muted">{label}</p>
      <p className="mono mt-1 text-sm text-ink">{value}</p>
      {sub && <p className="mono mt-0.5 text-[10px] tracking-[0.06em] text-muted">{sub}</p>}
    </div>
  );
}

function MarketRow({ m, b }) {
  const [open, setOpen] = useState(false);
  const occTone = m.occupancy_change_bps > 0 ? "bull" : m.occupancy_change_bps < 0 ? "bear" : "neutral";
  return (
    <div className="border-b border-[var(--line)]">
      <div
        role="button" tabIndex={0} aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="grid cursor-pointer grid-cols-2 items-center gap-4 px-1 py-4 transition hover:bg-white/[0.015] md:grid-cols-[auto_1.5fr_repeat(4,1fr)_auto]"
      >
        <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-md bg-signal/15 text-[13px] font-bold text-signal">{m.rank}</span>
        <p className="flex min-w-0 items-center gap-2 font-semibold text-ink">
          <MapPin size={14} className="shrink-0 text-muted" />
          <span className="truncate">{m.city}, {m.state}</span>
        </p>
        <Stat label="Price / Unit" value={fmtUSD(m.price_per_unit)} sub={`${pct(m.price_growth_yoy)} YoY`} />
        <Stat label="Occupancy" value={`${Number(m.occupancy).toFixed(1)}%`} tone={toneVs(m.occupancy, b?.occupancy)} sub={bpsTxt(m.occupancy_change_bps)} />
        <Stat label="Emp. Growth" value={pct(m.employment_growth_yoy)} tone={toneVs(m.employment_growth_yoy, b?.employment_growth_yoy)} sub="YoY" />
        <Stat label="Sales Vol." value={fmtM(m.sales_volume_musd)} sub={`${Number(m.deliveries_units).toLocaleString()} delivered`} />
        <ChevronDown size={16} className={`hidden shrink-0 text-muted transition-transform md:block ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="grid gap-4 px-1 pb-5 pt-1 sm:grid-cols-3">
          <Stat
            label="Deliveries (% of stock)"
            value={`${Number(m.deliveries_pct_stock).toFixed(1)}%`}
            tone={toneVs(m.deliveries_pct_stock, b?.delivery_pct_stock)}
            sub={`${Number(m.deliveries_units).toLocaleString()} units`}
          />
          <Stat label="Under Construction" value={`${Number(m.under_construction_units).toLocaleString()} units`} />
          <Stat label="Price Growth YoY" value={pct(m.price_growth_yoy)} tone={toneVs(m.price_growth_yoy, b?.price_growth_yoy)} />
          <p className="text-[13px] leading-relaxed text-muted sm:col-span-3">{m.primary_drivers}</p>
        </div>
      )}
    </div>
  );
}

export default function EmergingMarkets() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/emerging-markets").then((r) => r.json()).then(setData).catch(() => setData({ markets: [] }));
  }, []);

  if (!data) {
    return (
      <div className="mt-14"><div className="card p-6">
        <p className="kicker flex items-center gap-2"><TrendingUp size={13} className="text-signal" /> Emerging Markets</p>
        <p className="mt-2 text-sm text-muted">Decrypting market signals…</p>
      </div></div>
    );
  }

  const { markets = [], benchmark: b, year } = data;
  if (!markets.length) return null;

  return (
    <div className="mt-14">
      <div
        role="button" tabIndex={0} aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="card flex w-full cursor-pointer items-start gap-4 p-6 text-left transition hover:border-signal/30"
      >
        <div className="flex-1">
          <p className="kicker mb-2 flex items-center gap-2"><TrendingUp size={13} className="text-signal" /> Emerging Markets Intelligence</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">Top 10 Emerging Markets — {year}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Sub-1M-population metros that outperformed on employment, supply discipline, occupancy and investment momentum — where the next cycle is forming before it shows up in the headline data. Metrics are color-coded against the national benchmark line. Ranked from Yardi Matrix data.
          </p>
        </div>
        <ChevronDown size={20} className={`mt-1 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="mt-6">
          {b && (
            <div className="card mb-6 grid grid-cols-2 gap-4 p-5 sm:grid-cols-5">
              <Bench label="Nat'l Occupancy" value={`${b.occupancy}%`} sub={bpsTxt(b.occupancy_change_bps)} />
              <Bench label="Nat'l Emp. Growth" value={pct(b.employment_growth_yoy)} sub="YoY" />
              <Bench label="Nat'l Price / Unit" value={fmtUSD(b.price_per_unit)} sub={`${pct(b.price_growth_yoy)} YoY`} />
              <Bench label="Nat'l Delivery Rate" value={`${b.delivery_pct_stock}%`} sub="of stock" />
              <Bench label="2026 Forecast Rent" value={pct(b.forecast_rent_growth_yoy)} sub="advertised" />
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-bg2 px-5">
            {markets.map((m) => <MarketRow key={m.rank} m={m} b={b} />)}
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-muted">
            Source: Multi-Housing News &ldquo;Top 10 Emerging Multifamily Markets of {year},&rdquo; built on Yardi Matrix data; published Mar 2026. Markets filtered to metros under 1M residents. Tap any market for its supply pipeline and demand drivers. Outsized price-per-unit growth in thin-sales markets reflects transaction mix, not pure appreciation. <a href="https://www.multihousingnews.com/top-emerging-multifamily-markets/" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">multihousingnews.com</a>
          </p>
        </div>
      )}
    </div>
  );
}
