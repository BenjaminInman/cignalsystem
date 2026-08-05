// Shared builder for the expandable submarket indicator rows (IndicatorRow
// shape) used by BOTH the Onion Framework submarket lookup (Indicators tab) and
// the Market Maps ZIP/city lookup — so the trend charts and direction reads
// stay identical in both places. Each metro-signal carries its 24-month `trend`
// + `periods` so the row can chart it and read its direction.

export const GRAIN = { zip: "ZIP", city: "CITY", county: "COUNTY", metro: "METRO" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Monthly axis labels ending at asOf, for the ZORI anchor series (values only).
export function monthLabels(asOf, count) {
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

const pctStr = (p) => (p == null ? null : `${p >= 0 ? "+" : ""}${p}%`);
const asOfOf = (o) => (o?.asOf ? String(o.asOf) : "");

// The ZORI rent anchor row (from the /api/zip payload). Optional — Market Maps
// shows rent in its own card, so it passes this by choice.
export function rentAnchorRow(place) {
  if (!place?.found || place.rent == null) return null;
  const trend = Array.isArray(place.trend) ? place.trend : null;
  return {
    // Name states the basis, because the row silently changes meaning by grain:
    // Zillow publishes a multifamily-only cut at METRO grain only, so a ZIP or
    // city lookup is all-rental-types (SFR + condo + MF). Showing both under one
    // label made a $1,665 metro-MF figure look like a $2,097 ZIP figure's peer.
    name: place.basis === "multifamily"
      ? "Observed Rent (ZORI, multifamily)"
      : "Observed Rent (ZORI, all rental types)",
    traj: place.traj,
    cat: "PERFORMANCE",
    type: "TRAILING",
    value: `$${place.rent.toLocaleString()}`,
    unit: `/mo · ${GRAIN[place.grain] || "LOCAL"}${place.rolledUp ? " (rolled up)" : ""}`,
    tone: place.yoyPct == null ? "neutral" : place.yoyPct >= 0 ? "bull" : "bear",
    change: place.yoyPct == null ? "—" : `${pctStr(place.yoyPct)} YoY`,
    note: place.rolledUp
      ? `\u26a0 NO ZIP-LEVEL SERIES for ${place.rolledFrom || "this ZIP"} \u2014 showing ${place.label}, a WIDER area. ${place.basis === "multifamily" ? "Multifamily (5+ units)" : "All rental types"} \u00b7 Zillow \u00b7 as of ${place.asOf}`
      : `${place.label} \u00b7 ${place.basis === "multifamily" ? "multifamily (5+ units)" : "all rental types"} \u00b7 Zillow \u00b7 as of ${place.asOf}`,
    goodUp: true,
    trend,
    periods: trend && place.asOf ? monthLabels(place.asOf, trend.length) : null,
    zeroBased: false,
    measures:
      "Zillow Observed Rent Index for the tightest geography that covers your search \u2014 the same rent read as the national industry layer, brought down to your submarket. This is market ASKING rent on currently listed units, not the rent sitting tenants pay, and it excludes utilities. Zillow publishes a multifamily-only cut at metro grain only; ZIP, city and county rungs are all-rental-types (SFR + condo + MF).",
    impact:
      "Your actual rent basis. Compare its trajectory against the national rent line to see whether this submarket is leading or lagging the cycle. Do not compare it against the ACS contract rent on the same screen \u2014 that figure measures occupied stock at a different vintage, and the two answer different questions.",
  };
}

// The metro-derived signal rows (jobs, GDP, unemployment, RPP, rent CPI,
// vacancy, days-on-market). This is what Market Maps reuses.
export function metroSignalRows(sig) {
  const rows = [];
  const s = sig?.signals || {};

  if (s.employment) {
    const yp = s.employment.yoyPct;
    rows.push({
      name: "Local Job Growth", cat: "DEMAND", type: "LEADING",
      value: yp != null ? pctStr(yp) : `${Math.round(s.employment.value)}K`,
      unit: yp != null ? "jobs YoY" : "total (K)",
      tone: yp != null ? (yp >= 0 ? "bull" : "bear") : "neutral",
      change: yp != null ? `${pctStr(yp)} YoY` : "—",
      note: `Metro · BLS · as of ${asOfOf(s.employment)}`,
      goodUp: true, trend: s.employment.trend, periods: s.employment.periods, traj: s.employment.traj, zeroBased: false,
      measures: "Total nonfarm employment for the metro (CBSA). The clearest leading read on local rental demand.",
      impact: "Jobs move first. Accelerating metro employment precedes absorption and rent growth; a rollover is your earliest warning.",
    });
  }

  if (s.metroWages) {
    const yp = s.metroWages.yoyPct;
    rows.push({
      name: "Wage Growth (Metro)", cat: "MACRO", type: "COINCIDENT",
      value: `$${Math.round(s.metroWages.value).toLocaleString()}`, unit: "avg weekly wage",
      tone: yp != null ? (yp >= 0 ? "bull" : "bear") : "neutral",
      change: yp != null ? `${pctStr(yp)} YoY` : "\u2014",
      note: `Metro \u00b7 BLS QCEW \u00b7 as of ${asOfOf(s.metroWages)}`,
      goodUp: true, trend: s.metroWages.trend, periods: s.metroWages.periods, zeroBased: false, traj: s.metroWages.traj,
      measures: "Average weekly wage across all industries and ownerships in the metro, from the BLS Quarterly Census of Employment and Wages \u2014 a near-census of wage-and-salary jobs, not a survey sample.",
      impact: "Wages set the ceiling on rent-paying capacity. Rent growth that outruns wage growth for long compresses affordability and eventually shows up as concessions, longer lease-up and rising delinquency.",
    });
  }

  // Sits immediately after nominal wages: the two are only meaningful together.
  // Nominal wage growth of +3.8% reads healthy until you see inflation took
  // +3.5% of it. Real wage growth is what actually moves rent-paying capacity,
  // and it is the number that turns negative first when a market rolls over.
  if (s.realWages) {
    const rp = s.realWages.pct;
    rows.push({
      name: "Real Wage Growth (Metro)", cat: "MACRO", type: "COINCIDENT",
      value: `${rp >= 0 ? "+" : ""}${rp.toFixed(1)}%`, unit: "YoY, inflation-adjusted",
      tone: rp >= 0 ? "bull" : "bear",
      change: `${pctStr(s.realWages.nominalPct)} nominal less ${pctStr(s.realWages.cpiPct)} CPI`,
      note: `Metro \u00b7 BLS QCEW less national CPI \u00b7 as of ${asOfOf(s.realWages)}`,
      goodUp: true, zeroBased: true,
      measures: "Metro nominal wage growth less national CPI over the same period. Local CPI is not used because BLS publishes it for only a couple of dozen metros \u2014 national CPI is the standard deflator when local prices are unavailable, and the periods are matched so the wage change is never deflated by inflation from a quarter it did not experience.",
      impact: "The real number is the one that matters for rent. Nominal wage growth can look healthy while inflation takes all of it, leaving tenants no additional capacity to absorb a rent increase. Real wage growth turning negative is an early affordability warning \u2014 it precedes concessions and delinquency rather than confirming them.",
    });
  }

  if (s.countyUnemp) {
    const v = s.countyUnemp.value;
    const d = s.countyUnemp.yoyAbs;
    // Locked bands: 2.5-4.5% green; <2.5% or 4.5-5% yellow; >5% red.
    const tone = v > 5 ? "bear" : v >= 4.5 || v < 2.5 ? "neutral" : "bull";
    rows.push({
      name: "Unemployment Rate (County)", cat: "MACRO", type: "TRAILING",
      value: `${v.toFixed(1)}%`, unit: "NSA",
      tone,
      change: d != null ? `${d > 0 ? "+" : ""}${d.toFixed(1)}pp YoY` : "\u2014",
      note: `County${sig?.countyName ? ` \u00b7 ${sig.countyName}` : ""} \u00b7 BLS LAUS \u00b7 as of ${asOfOf(s.countyUnemp)}`,
      goodUp: false, trend: s.countyUnemp.trend, periods: s.countyUnemp.periods, traj: s.countyUnemp.traj, zeroBased: false,
      measures: "Share of the county labor force actively seeking work (not seasonally adjusted, so compare year-over-year rather than month-to-month). Where job growth counts jobs added, this measures how much slack is left.",
      impact: "A trailing confirmation rather than an early warning \u2014 unemployment turns after hiring does. Rising local unemployment erodes household formation and rent-paying capacity; sustained readings above 5% have coincided with rent-growth stalls.",
    });
  }

  if (s.zordi) {
    const z = s.zordi;
    const p = z.pctRank;
    // The level is not interpretable on its own (no natural zero, no fixed ceiling),
    // so the percentile among peer metros is the headline and the raw index rides
    // alongside it. Tone is set by the rank, not the level.
    const tone = p == null ? "neutral" : p >= 60 ? "bull" : p >= 30 ? "neutral" : "bear";
    const ord = p == null ? null : `${p}${p % 10 === 1 && p !== 11 ? "st" : p % 10 === 2 && p !== 12 ? "nd" : p % 10 === 3 && p !== 13 ? "rd" : "th"}`;
    rows.push({
      name: "Renter Demand Index (ZORDI)", cat: "DEMAND", type: "COINCIDENT",
      value: ord ? `${ord}` : `${Math.round(z.value)}`,
      unit: ord ? `pctile of ${z.nMetros} metros` : "index",
      sub: ord ? `index ${Math.round(z.value)}${z.yoyAbs != null ? ` \u00b7 ${z.yoyAbs > 0 ? "+" : ""}${Math.round(z.yoyAbs)} YoY` : ""}` : null,
      tone,
      change: z.yoyAbs != null ? `${z.yoyAbs > 0 ? "+" : ""}${Math.round(z.yoyAbs)} pts YoY` : "\u2014",
      note: `Metro \u00b7 Zillow \u00b7 as of ${asOfOf(z)}`,
      goodUp: true, trend: z.trend, periods: z.periods, zeroBased: false,
      measures: "Rental-market tightness \u2014 renter engagement with Zillow listings measured against available supply. Zillow describes it as a tightness gauge rather than pure demand: high means renters compete for units, low means units compete for renters. The index has no natural zero or fixed scale, so it is shown as a percentile against every other metro this month; the raw index sits beside it.",
      impact: "Tracks vacancy almost one-for-one and runs about a month ahead of time-on-market, so treat it as a fast confirmation of slack rather than an early warning. Its edge is timeliness \u2014 monthly and current, where vacancy is quarterly and revised. A bottom-decile rank means this market is far looser than its peers right now.",
    });
  }

  if (s.countyGdp) {
    const b = s.countyGdp.value / 1e6;
    const lvl = b >= 1 ? `$${b.toFixed(1)}B` : `$${Math.round(s.countyGdp.value / 1e3)}M`;
    const yp = s.countyGdp.yoyPct;
    rows.push({
      name: "Real GDP (County)", cat: "MACRO", type: "TRAILING",
      value: lvl, unit: "real, chained 2017$",
      tone: yp != null ? (yp >= 0 ? "bull" : "bear") : "neutral",
      change: yp != null ? `${pctStr(yp)} YoY` : "real GDP",
      note: `County${sig?.countyName ? ` · ${sig.countyName}` : ""} · BEA · as of ${asOfOf(s.countyGdp)}`,
      goodUp: true, trend: s.countyGdp.trend, periods: s.countyGdp.periods, zeroBased: false,
      measures: "Inflation-adjusted county output (BEA CAGDP9). The broadest measure of the local economy's size and direction.",
      impact: "A rising local economy underwrites durable demand. Confirms — rather than leads — what the labor signals are already telling you.",
    });
  }

  if (s.unemployment) {
    rows.push({
      name: "Unemployment Rate", cat: "MACRO", type: "TRAILING",
      value: `${s.unemployment.value}%`, unit: "metro rate", tone: "neutral",
      change: s.unemployment.delta != null ? `${s.unemployment.delta >= 0 ? "+" : ""}${s.unemployment.delta} MoM` : "—",
      note: `Metro · BLS LAUS · as of ${asOfOf(s.unemployment)}`,
      goodUp: false, trend: s.unemployment.trend, periods: s.unemployment.periods, traj: s.unemployment.traj, zeroBased: false,
      measures: "Metro unemployment rate (BLS LAUS). A lagging confirmation of labor-market health.",
      impact: "Low and falling supports household formation and rent-paying capacity; a rising rate confirms softening that leading signals flagged earlier.",
    });
  }

  if (s.rentsRPP) {
    rows.push({
      name: "Rent Price Level", cat: "PERFORMANCE", type: "TRAILING",
      value: `${Math.round(s.rentsRPP.value)}`, unit: "US = 100", tone: "neutral", change: "vs US avg",
      note: `Metro · BEA RPP · as of ${asOfOf(s.rentsRPP)}`,
      trend: s.rentsRPP.trend, periods: s.rentsRPP.periods, zeroBased: false,
      measures: "Regional price parity for rents (BEA). How expensive this metro's rents are relative to the national average (100).",
      impact: "Frames affordability headroom. High levels can cap further rent growth; low levels can signal room to run as demand arrives.",
    });
  }

  if (s.cpiRent) {
    const yp = s.cpiRent.yoyPct;
    rows.push({
      name: "Rent CPI", cat: "PERFORMANCE", type: "TRAILING",
      value: yp != null ? pctStr(yp) : `${Math.round(s.cpiRent.value)}`, unit: "rent CPI YoY",
      tone: yp != null ? (yp >= 0 ? "bull" : "bear") : "neutral",
      change: yp != null ? `${pctStr(yp)} YoY` : "—",
      note: `Metro · BLS · as of ${asOfOf(s.cpiRent)}`,
      goodUp: true, trend: s.cpiRent.trend, periods: s.cpiRent.periods, traj: s.cpiRent.traj, zeroBased: false,
      measures: "Consumer price index for rent of primary residence in the metro. A slower-moving, survey-based rent gauge.",
      impact: "Cross-check on the ZORI rent read. Divergence between the two is a cue to look closer at what's driving local pricing.",
    });
  }

  if (s.vacancy) {
    rows.push({
      name: "Apartment Vacancy", cat: "PERFORMANCE", type: "TRAILING",
      value: `${Number(s.vacancy.value).toFixed(1)}%`, unit: "apt vacancy", tone: "neutral", change: "—",
      note: `Metro · Apartment List · as of ${asOfOf(s.vacancy)}`,
      goodUp: false, trend: s.vacancy.trend, periods: s.vacancy.periods, traj: s.vacancy.traj, zeroBased: false,
      measures: "Apartment vacancy index for the metro (Apartment List). The balance of supply and demand right now.",
      impact: "Tightening vacancy precedes pricing power; rising vacancy alongside new deliveries is the classic hypersupply tell.",
    });
  }

  if (s.daysOnMarket) {
    rows.push({
      name: "Days On Market (All Rentals)", cat: "DEMAND", type: "LEADING",
      value: `${Math.round(s.daysOnMarket.value)}`, unit: "days to lease", tone: "neutral", change: "avg lease-up",
      note: `Metro · Apartment List · as of ${asOfOf(s.daysOnMarket)}`,
      goodUp: false, trend: s.daysOnMarket.trend, periods: s.daysOnMarket.periods, traj: s.daysOnMarket.traj, zeroBased: false,
      measures: "Average time a listed unit takes to lease across the broad rental market (Apartment List) — single-family, condo and multifamily listings together, not an MF-only cut. A fast, real-time demand pulse. Shown beside the multifamily-only read so the two universes stay distinct.",
      impact: "Shrinking days-on-market signals demand outrunning supply — often the earliest local sign of firming rents.",
    });
  }

  return rows;
}

// HelloData rows (licensed, Pro+). These are the three reads no free source can
// produce: what tenants ACTUALLY pay, how much of the asking rent is being given
// back to get the lease signed, and how long units sit.
//
// Every figure here comes from HelloData alone — asking and effective share one
// source and one universe (50+ unit properties), so the concession spread between
// them is internal to that source. Never compute it against ZORI: ZORI is an
// asking-rent index on a different universe, and the difference would be
// measuring two things at once.
//
// YoY is computed here from the series rather than read from the materialized
// view, because mv_indicator_analytics stores yoy_change as an ABSOLUTE change
// (dollars/days), not a percentage.
function hdSeries(hd, slug) {
  const s = hd?.series?.[slug];
  return Array.isArray(s) && s.length ? s : null;
}

function yoyPctOf(series) {
  if (!series || series.length < 13) return null;
  const last = series[series.length - 1];
  const prior = series[series.length - 13];
  if (!last?.value || !prior?.value) return null;
  return Number((100 * (last.value / prior.value - 1)).toFixed(1));
}

const HD_WINDOW = 24; // trailing months charted, matching the other rows

function hdTrend(series) {
  const tail = series.slice(-HD_WINDOW);
  return {
    trend: tail.map((p) => p.value),
    periods: tail.length && tail[tail.length - 1].date
      ? monthLabels(String(tail[tail.length - 1].date).slice(0, 7), tail.length)
      : null,
  };
}

export function hellodataRows(hd) {
  if (!hd || hd.gated || !hd.series) return [];
  const rows = [];
  const grain = hd.regionType === "zip" ? "ZIP" : "METRO";
  const src = `${grain === "ZIP" ? "ZIP" : "Metro"} \u00b7 HelloData \u00b7 as of ${hd.asOf || "\u2014"}`;

  const eff = hdSeries(hd, "hd_effective_rent");
  if (eff) {
    const yp = yoyPctOf(eff);
    const last = eff[eff.length - 1];
    const { trend, periods } = hdTrend(eff);
    rows.push({
      name: "Effective Rent", cat: "PERFORMANCE", type: "COINCIDENT",
      value: `$${Math.round(last.value).toLocaleString()}`,
      unit: `/mo \u00b7 net of concessions \u00b7 ${grain}`,
      tone: yp == null ? "neutral" : yp >= 0 ? "bull" : "bear",
      change: yp == null ? "\u2014" : `${pctStr(yp)} YoY`,
      note: src, goodUp: true, trend, periods, zeroBased: false,
      measures:
        "Average rent actually collected on newly signed leases across multifamily properties of 50+ units, after free months, waived fees and other concessions are subtracted from the asking rent. Aggregated from observed listings, not a survey or a model.",
      impact:
        "This is the number that underwrites a deal. Asking rent is what a property hopes for; effective rent is what shows up in the rent roll. When the two diverge, every valuation built on asking rent is overstated. Read it against the ZORI row above only when that row is ZIP-grain: ZORI ZIP is asking rent across all rental types, so it should sit ABOVE this figure once concessions are removed and BELOW the HelloData asking rent. If the ZORI row says metro, the two describe different geographies and the comparison means nothing.",
    });
  }

  const load = Array.isArray(hd.concessionLoad) ? hd.concessionLoad : null;
  if (load && load.length) {
    const cur = load[load.length - 1];
    const prior = load.length >= 13 ? load[load.length - 13] : null;
    const dpp = prior ? Number((cur.pct - prior.pct).toFixed(1)) : null;
    const tail = load.slice(-HD_WINDOW);
    // Rising concessions = softening, so tone inverts against the usual reading.
    const tone = cur.pct >= 6 ? "bear" : cur.pct >= 3 ? "neutral" : "bull";
    rows.push({
      name: "Concession Load", cat: "PERFORMANCE", type: "LEADING",
      value: `${cur.pct.toFixed(1)}%`, unit: `of asking rent \u00b7 ${grain}`,
      tone,
      change: dpp == null ? "\u2014" : `${dpp > 0 ? "+" : ""}${dpp}pp YoY`,
      note: src, goodUp: false,
      trend: tail.map((p) => p.pct),
      periods: tail.length ? monthLabels(String(tail[tail.length - 1].date).slice(0, 7), tail.length) : null,
      zeroBased: true,
      measures:
        "The share of asking rent being given back to sign a lease \u2014 the gap between asking and effective rent, expressed as a percentage. Both sides come from the same HelloData universe, so this is a like-for-like spread rather than a comparison across sources.",
      impact:
        "The earliest honest read on softening. Operators cut concessions before they cut asking rent, because a headline rent reduction resets the whole rent roll while a month free does not. A rising load alongside flat or rising asking rent means the market is weaker than the posted numbers suggest.",
    });
  }

  const dom = hdSeries(hd, "hd_dom");
  if (dom) {
    const last = dom[dom.length - 1];
    const yp = yoyPctOf(dom);
    const { trend, periods } = hdTrend(dom);
    rows.push({
      name: "Days On Market (MF)", cat: "DEMAND", type: "LEADING",
      value: `${Math.round(last.value)}`, unit: `days to lease \u00b7 ${grain}`,
      tone: yp == null ? "neutral" : yp <= 0 ? "bull" : "bear",
      change: yp == null ? "\u2014" : `${pctStr(yp)} YoY`,
      note: src, goodUp: false, trend, periods, zeroBased: false,
      measures:
        "Average days a listed unit sits before leasing, across 50+ unit multifamily properties only (HelloData). Distinct from the Days On Market (All Rentals) row above (Apartment List), which covers the broader single-family + condo + multifamily universe \u2014 the two are shown side by side rather than blended.",
      impact:
        "Absorption speed. Read it against concession load: falling days-on-market with rising concessions means velocity is being bought rather than earned, which is a hypersupply signature rather than a recovery.",
    });
  }

  return rows;
}

// Migration rows (IRS SOI) — used by the Onion submarket lookup only.
export function migrationRows(sig) {
  const rows = [];
  const m = sig?.migration;
  if (!m) return rows;
  if (m.inAgi != null) {
    rows.push({
      name: "In-Migrant Income", cat: "DEMAND", type: "LEADING",
      value: `$${m.inAgi.toLocaleString()}`, unit: "avg in-migrant AGI", tone: "neutral",
      change: m.inAgiYear ? `${m.inAgiYear}` : "IRS SOI", note: "Metro · IRS SOI tax-return migration",
      measures: "Average adjusted gross income of households moving into the metro (IRS SOI). Who is arriving, by income.",
      impact: "Higher-income arrivals expand the top of the rent ladder and support Class A/B demand over the medium term.",
    });
  }
  if (m.net != null) {
    rows.push({
      name: "Net Migration", cat: "DEMAND", type: "LEADING",
      value: `${m.net >= 0 ? "+" : "\u2212"}${Math.abs(m.net).toLocaleString()}`, unit: "households / yr",
      tone: m.net >= 0 ? "bull" : "bear", change: m.net >= 0 ? "net inflow" : "net outflow",
      note: "Metro · IRS SOI tax-return migration",
      measures: "Net domestic household migration into or out of the metro (IRS SOI). The raw direction of population flow.",
      impact: "Sustained inflow is a leading tailwind for absorption; outflow erodes demand well before it shows up in vacancy.",
    });
  }
  if (m.diff != null) {
    rows.push({
      name: "Affluence Trend", cat: "DEMAND", type: "LEADING",
      value: `${m.diff >= 0 ? "+" : "\u2212"}$${Math.abs(m.diff).toLocaleString()}`, unit: "in \u2212 out AGI",
      tone: m.diff >= 0 ? "bull" : "bear", change: m.diff >= 0 ? "arrivals out-earn" : "arrivals under-earn",
      note: "Metro · IRS SOI · ~2-yr lag",
      goodUp: true,
      trend: Array.isArray(m.diffTrend) ? m.diffTrend.map((d) => d.v) : null,
      periods: Array.isArray(m.diffTrend) ? m.diffTrend.map((d) => String(d.y)) : null,
      zeroBased: false,
      measures: "AGI differential between households moving in versus out (IRS SOI). Whether the metro is trading up or down over time.",
      impact: "A rising differential means the income base is strengthening — a slow but powerful leading signal for long-run rent growth.",
    });
  }
  return rows;
}

// Full Onion submarket lookup row set: rent anchor + metro signals + migration.
// `hd` is the optional /api/hellodata payload (Pro+ only; null or gated for
// free users, in which case no HelloData rows are produced). It sits directly
// after the ZORI anchor because the two answer the same question — asking rent
// versus what is actually collected — and the comparison only lands when they
// are adjacent.
export function buildRows(zip, sig, place, hd) {
  const rows = [];
  const rent = rentAnchorRow(place);
  if (rent) rows.push(rent);
  rows.push(...hellodataRows(hd));

  // Lease-economics grouping (mirrors the Market Maps layout): the All-Rentals
  // days-on-market, apartment vacancy and rent price-level reads sit with the
  // HelloData lease rows rather than down in the macro block. All-Rentals DOM
  // leads so it lands directly beneath Days On Market (MF); the rest of the
  // metro signals follow as the macro-driver block.
  const metro = metroSignalRows(sig);
  const LEASE_MOVE = ["Days On Market (All Rentals)", "Apartment Vacancy", "Rent Price Level"];
  const leaseFree = LEASE_MOVE.map((n) => metro.find((r) => r.name === n)).filter(Boolean);
  const metroMacro = metro.filter((r) => !LEASE_MOVE.includes(r.name));
  rows.push(...leaseFree);
  rows.push(...metroMacro);

  rows.push(...migrationRows(sig));
  return rows;
}
