"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import IndicatorRow from "@/components/IndicatorRow";

const GRAIN = { zip: "ZIP", city: "CITY", county: "COUNTY", metro: "METRO" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Monthly axis labels ending at asOf, for the ZORI anchor series (which arrives
// as values without dates).
function monthLabels(asOf, count) {
  const [y, m] = String(asOf).split("-").map(Number);
  let sy = y, sm = m - (count - 1);
  while (sm <= 0) { sm += 12; sy -= 1; }
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(`${MON[sm - 1]} '${String(sy).slice(2)}`);
    sm++; if (sm > 12) { sm = 1; sy++; }
  }
  return out;
}

// Build the Indicators-tab row shape from a metro-signals payload + the ZORI
// anchor read. Only present signals produce rows; each carries its own grain
// label and, where history exists, a trend series charted like Layer 2/3.
// Local series use a range-based (non-zero) axis so tight ranges read clearly.
function buildRows(zip, sig, place) {
  const rows = [];
  const asOfOf = (o) => (o?.asOf ? String(o.asOf) : "");
  const pctStr = (p) => (p == null ? null : `${p >= 0 ? "+" : ""}${p}%`);

  // Anchor: observed rent (ZORI) at the best available grain — carries a real trend.
  if (place?.found && place.rent != null) {
    const trend = Array.isArray(place.trend) ? place.trend : null;
    rows.push({
      name: "Observed Rent (ZORI)",
      cat: "PERFORMANCE",
      type: "TRAILING",
      value: `$${place.rent.toLocaleString()}`,
      unit: `/mo · ${GRAIN[place.grain] || "LOCAL"}`,
      tone: place.yoyPct == null ? "neutral" : place.yoyPct >= 0 ? "bull" : "bear",
      change: place.yoyPct == null ? "—" : `${pctStr(place.yoyPct)} YoY`,
      note: `${place.label} · Zillow · as of ${place.asOf}`,
      trend,
      periods: trend && place.asOf ? monthLabels(place.asOf, trend.length) : null,
      zeroBased: false,
      measures:
        "Zillow Observed Rent Index for the tightest geography that covers your search — the same rent read as the national industry layer, brought down to your submarket.",
      impact:
        "Your actual rent basis. Compare its trajectory against the national rent line to see whether this submarket is leading or lagging the cycle.",
    });
  }

  const s = sig?.signals || {};

  if (s.employment) {
    const yp = s.employment.yoyPct;
    rows.push({
      name: "Local Job Growth",
      cat: "DEMAND",
      type: "LEADING",
      value: yp != null ? pctStr(yp) : `${Math.round(s.employment.value)}K`,
      unit: yp != null ? "jobs YoY" : "total (K)",
      tone: yp != null ? (yp >= 0 ? "bull" : "bear") : "neutral",
      change: yp != null ? `${pctStr(yp)} YoY` : "—",
      note: `Metro · BLS · as of ${asOfOf(s.employment)}`,
      trend: s.employment.trend, periods: s.employment.periods, zeroBased: false,
      measures: "Total nonfarm employment for the metro (CBSA). The clearest leading read on local rental demand.",
      impact: "Jobs move first. Accelerating metro employment precedes absorption and rent growth; a rollover is your earliest warning.",
    });
  }

  if (s.countyGdp) {
    const b = s.countyGdp.value / 1e6;
    const lvl = b >= 1 ? `$${b.toFixed(1)}B` : `$${Math.round(s.countyGdp.value / 1e3)}M`;
    const yp = s.countyGdp.yoyPct;
    rows.push({
      name: "Real GDP (County)",
      cat: "MACRO",
      type: "TRAILING",
      value: lvl,
      unit: "real, chained 2017$",
      tone: yp != null ? (yp >= 0 ? "bull" : "bear") : "neutral",
      change: yp != null ? `${pctStr(yp)} YoY` : "real GDP",
      note: `County${sig?.countyName ? ` · ${sig.countyName}` : ""} · BEA · as of ${asOfOf(s.countyGdp)}`,
      trend: s.countyGdp.trend, periods: s.countyGdp.periods, zeroBased: false,
      measures: "Inflation-adjusted county output (BEA CAGDP9). The broadest measure of the local economy's size and direction.",
      impact: "A rising local economy underwrites durable demand. Confirms — rather than leads — what the labor signals are already telling you.",
    });
  }

  if (s.unemployment) {
    rows.push({
      name: "Unemployment Rate",
      cat: "MACRO",
      type: "TRAILING",
      value: `${s.unemployment.value}%`,
      unit: "metro rate",
      tone: "neutral",
      change: s.unemployment.delta != null ? `${s.unemployment.delta >= 0 ? "+" : ""}${s.unemployment.delta} MoM` : "—",
      note: `Metro · BLS LAUS · as of ${asOfOf(s.unemployment)}`,
      trend: s.unemployment.trend, periods: s.unemployment.periods, zeroBased: false,
      measures: "Metro unemployment rate (BLS LAUS). A lagging confirmation of labor-market health.",
      impact: "Low and falling supports household formation and rent-paying capacity; a rising rate confirms softening that leading signals flagged earlier.",
    });
  }

  if (s.rentsRPP) {
    rows.push({
      name: "Rent Price Level",
      cat: "PERFORMANCE",
      type: "TRAILING",
      value: `${Math.round(s.rentsRPP.value)}`,
      unit: "US = 100",
      tone: "neutral",
      change: "vs US avg",
      note: `Metro · BEA RPP · as of ${asOfOf(s.rentsRPP)}`,
      trend: s.rentsRPP.trend, periods: s.rentsRPP.periods, zeroBased: false,
      measures: "Regional price parity for rents (BEA). How expensive this metro's rents are relative to the national average (100).",
      impact: "Frames affordability headroom. High levels can cap further rent growth; low levels can signal room to run as demand arrives.",
    });
  }

  if (s.cpiRent) {
    const yp = s.cpiRent.yoyPct;
    rows.push({
      name: "Rent CPI",
      cat: "PERFORMANCE",
      type: "TRAILING",
      value: yp != null ? pctStr(yp) : `${Math.round(s.cpiRent.value)}`,
      unit: "rent CPI YoY",
      tone: yp != null ? (yp >= 0 ? "bull" : "bear") : "neutral",
      change: yp != null ? `${pctStr(yp)} YoY` : "—",
      note: `Metro · BLS · as of ${asOfOf(s.cpiRent)}`,
      trend: s.cpiRent.trend, periods: s.cpiRent.periods, zeroBased: false,
      measures: "Consumer price index for rent of primary residence in the metro. A slower-moving, survey-based rent gauge.",
      impact: "Cross-check on the ZORI rent read. Divergence between the two is a cue to look closer at what's driving local pricing.",
    });
  }

  if (s.vacancy) {
    rows.push({
      name: "Apartment Vacancy",
      cat: "PERFORMANCE",
      type: "TRAILING",
      value: `${Number(s.vacancy.value).toFixed(1)}%`,
      unit: "apt vacancy",
      tone: "neutral",
      change: "—",
      note: `Metro · Apartment List · as of ${asOfOf(s.vacancy)}`,
      trend: s.vacancy.trend, periods: s.vacancy.periods, zeroBased: false,
      measures: "Apartment vacancy index for the metro (Apartment List). The balance of supply and demand right now.",
      impact: "Tightening vacancy precedes pricing power; rising vacancy alongside new deliveries is the classic hypersupply tell.",
    });
  }

  if (s.daysOnMarket) {
    rows.push({
      name: "Rental Days on Market",
      cat: "DEMAND",
      type: "LEADING",
      value: `${Math.round(s.daysOnMarket.value)}`,
      unit: "days to lease",
      tone: "neutral",
      change: "avg lease-up",
      note: `Metro · Apartment List · as of ${asOfOf(s.daysOnMarket)}`,
      trend: s.daysOnMarket.trend, periods: s.daysOnMarket.periods, zeroBased: false,
      measures: "Average time a listed apartment takes to lease (Apartment List). A fast, real-time demand pulse.",
      impact: "Shrinking days-on-market signals demand outrunning supply — often the earliest local sign of firming rents.",
    });
  }

  const m = sig?.migration;
  if (m?.inAgi != null) {
    rows.push({
      name: "In-Migrant Income",
      cat: "DEMAND",
      type: "LEADING",
      value: `$${m.inAgi.toLocaleString()}`,
      unit: "avg in-migrant AGI",
      tone: "neutral",
      change: m.inAgiYear ? `${m.inAgiYear}` : "IRS SOI",
      note: "Metro · IRS SOI tax-return migration",
      measures: "Average adjusted gross income of households moving into the metro (IRS SOI). Who is arriving, by income.",
      impact: "Higher-income arrivals expand the top of the rent ladder and support Class A/B demand over the medium term.",
    });
  }
  if (m?.net != null) {
    rows.push({
      name: "Net Migration",
      cat: "DEMAND",
      type: "LEADING",
      value: `${m.net >= 0 ? "+" : "\u2212"}${Math.abs(m.net).toLocaleString()}`,
      unit: "households / yr",
      tone: m.net >= 0 ? "bull" : "bear",
      change: m.net >= 0 ? "net inflow" : "net outflow",
      note: "Metro · IRS SOI tax-return migration",
      measures: "Net domestic household migration into or out of the metro (IRS SOI). The raw direction of population flow.",
      impact: "Sustained inflow is a leading tailwind for absorption; outflow erodes demand well before it shows up in vacancy.",
    });
  }
  if (m?.diff != null) {
    rows.push({
      name: "Affluence Trend",
      cat: "DEMAND",
      type: "LEADING",
      value: `${m.diff >= 0 ? "+" : "\u2212"}$${Math.abs(m.diff).toLocaleString()}`,
      unit: "in \u2212 out AGI",
      tone: m.diff >= 0 ? "bull" : "bear",
      change: m.diff >= 0 ? "arrivals out-earn" : "arrivals under-earn",
      note: "Metro · IRS SOI · ~2-yr lag",
      trend: Array.isArray(m.diffTrend) ? m.diffTrend.map((d) => d.v) : null,
      periods: Array.isArray(m.diffTrend) ? m.diffTrend.map((d) => String(d.y)) : null,
      zeroBased: false,
      measures: "AGI differential between households moving in versus out (IRS SOI). Whether the metro is trading up or down over time.",
      impact: "A rising differential means the income base is strengthening — a slow but powerful leading signal for long-run rent growth.",
    });
  }

  return rows;
}

export default function SubmarketLookup() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [msg, setMsg] = useState("");
  const [place, setPlace] = useState(null);
  const [rows, setRows] = useState(null);

  const search = async () => {
    const v = q.trim();
    if (!v) { setStatus("error"); setMsg("Enter a ZIP code or City, State."); return; }
    setStatus("loading"); setMsg(""); setPlace(null); setRows(null);
    const isZip = /^\d{5}$/.test(v);
    try {
      const [zr, sr] = await Promise.all([
        fetch(`/api/zip?q=${encodeURIComponent(v)}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
        isZip ? fetch(`/api/metro-signals?zip=${v}`).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
      ]);
      if (!zr.ok) { setStatus("error"); setMsg(zr.d?.error || "Lookup failed. Please try again."); return; }

      let signalRes = sr;
      if (!isZip && zr.d?.found && zr.d.code) {
        signalRes = await fetch(`/api/metro-signals?metro=${encodeURIComponent(zr.d.code)}`).then((r) => r.json()).catch(() => null);
      }

      const built = buildRows(v, signalRes?.found ? signalRes : null, zr.d?.found ? zr.d : null);
      if (!built.length) {
        setStatus("idle");
        setPlace(zr.d?.found ? zr.d : null);
        setRows([]);
        if (!zr.d?.found) setMsg("");
        return;
      }
      setPlace(zr.d?.found ? zr.d : null);
      setRows(built);
      setStatus("idle");
    } catch {
      setStatus("error"); setMsg("Lookup failed. Please try again.");
    }
  };

  return (
    <div className="mt-10">
      <div className="card p-6">
        <p className="kicker mb-2 flex items-center gap-2"><Search size={13} className="text-signal" /> Layer 1 · Submarket</p>
        <h2 className="headline text-2xl text-ink">Bring the read down to your market</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Enter a 5-digit ZIP or a City, State. The national indicators above, localized to the tightest
          geography we cover — each signal labeled with its grain.
        </p>
        <div className="mt-5 flex max-w-md gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="ZIP code or City, State"
            className="flex-1 rounded-md border border-[var(--line)] bg-bg2 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-signal/40"
          />
          <button
            onClick={search}
            disabled={status === "loading"}
            className="mono rounded-md bg-signal px-5 py-2.5 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "loading" ? "…" : "SEARCH"}
          </button>
        </div>
        {status === "error" && <p className="mt-2 text-[12px] text-down">{msg}</p>}
        {rows && rows.length === 0 && (
          <p className="mt-4 text-sm text-muted">
            No local coverage for <span className="text-ink">{q.trim()}</span> yet — try a nearby ZIP or a larger city.
          </p>
        )}
      </div>

      {place && (
        <p className="mono mt-6 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.12em] text-muted">
          <span className="rounded bg-signal/15 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-signal">{GRAIN[place.grain] || "LOCAL"}</span>
          {place.label} · SUBMARKET SIGNALS
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-4 space-y-4">
          {rows.map((r) => <IndicatorRow key={r.name} row={r} />)}
        </div>
      )}
    </div>
  );
}
