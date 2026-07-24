// ============================================================================
//  SIGNALS ENGINE — the dynamic layer for the reworked Signals tab.
// ----------------------------------------------------------------------------
//  Everything keys off the z-score of each indicator's YEAR-OVER-YEAR CHANGE,
//  not its raw level. Raw-level z is meaningless for trending series (a rising
//  index is always "high"); the YoY change oscillates and mean-reverts, so its
//  z measures "how unusual is the current move vs this series' own norm." That
//  single, consistent transform drives all three national pieces:
//    • The Tell   — leading vs lagging composites (oriented, averaged) + the gap
//    • Anomalies  — indicators ranked by |z| of their latest YoY move
//    • Events     — the month each signal last crossed its own trend (sign flip)
// ============================================================================

import { signalUniverse } from "@/lib/vertical-signals";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const stdev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};
const ym = (d) => String(d).slice(0, 7); // YYYY-MM

// Polarity: higher oriented value = more expansionary. null rates read bearish
// when rising, so treat null as "higher is worse".
const polarity = (hib) => (hib === false || hib == null ? -1 : 1);

// Friendly labels for the national slugs we surface.
const LABEL = {
  employment: "Job Growth", initial_claims: "Jobless Claims", permits_5plus: "MF Permits",
  mf_starts: "MF Starts", consumer_sentiment: "Consumer Sentiment", cli_oecd: "OECD Leading Index",
  treasury_10y: "10Y Treasury", mortgage_30y: "30Y Mortgage", fed_funds: "Fed Funds",
  yield_spread: "Yield Curve", ppi: "PPI", equities_mktval: "Equity Market Cap", aimi: "AIMI",
  days_on_market: "Days on Market", absorption: "Absorption (3-Mo)", zordi: "Renter Demand (ZORDI)", emp_2024: "Employment 20-24",
  emp_2534: "Employment 25-34",
  cpi_headline: "CPI", cpi_shelter: "Shelter CPI", pce_inflation: "PCE Inflation",
  real_pce: "Real PCE", gdp: "GDP", rental_vacancy: "Rental Vacancy", wage_growth: "Wage Growth",
  cre_delinquency: "CRE Delinquency", cap_rate: "Cap Rate", foreclosure: "Foreclosures",
};
const nameOf = (slug) => LABEL[slug] || slug.replace(/_/g, " ");

// Pull YoY-change history for a set of slugs at US.
//
// One combined request does NOT work here: PostgREST caps responses at 1000 rows
// regardless of `limit`, and the daily series (treasury_10y, yield_spread) alone
// consume most of that budget. With `order=asc` the cap silently returns the
// OLDEST rows, so every series ended ~17 months stale and forward-fill flat-lined
// the whole Tell. Fetch per slug, newest-first, and downsample to one point per
// month (the month's latest observation) so daily and monthly series cost the same.
async function fetchYoY(slugs, months = 30) {
  const since = new Date();
  since.setMonth(since.getMonth() - months - 1);
  const sinceStr = since.toISOString().slice(0, 10);
  const pairs = await Promise.all(
    slugs.map(async (slug) => {
      const rows = await sb(
        `v_indicator_analytics?region_code=eq.US&slug=eq.${slug}` +
          `&obs_date=gte.${sinceStr}&yoy_change=not.is.null` +
          `&select=obs_date,yoy_change&order=obs_date.desc&limit=1000`
      );
      const seen = new Set();
      const out = [];
      for (const r of rows || []) {
        if (r.yoy_change == null) continue;
        const m = ym(r.obs_date);
        if (seen.has(m)) continue; // desc => first hit is the month's latest print
        seen.add(m);
        out.push({ m, v: Number(r.yoy_change) });
      }
      out.reverse(); // ascending
      return [slug, out];
    })
  );
  return Object.fromEntries(pairs);
}

// Build a monthly timeline (last N months) and forward-fill each series onto it.
function timeline(months = 24) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const t = new Date(d);
    t.setMonth(t.getMonth() - i);
    out.push(t.toISOString().slice(0, 7));
  }
  return out;
}
// Forward-fill each series onto the timeline, but only for MAX_CARRY months past
// its last real print. Quarterly series (GDP, absorption, rental vacancy) publish
// with a lag and legitimately carry for a few months; a series that has not
// printed in over a year is dead and must drop out of the composite rather than
// anchor it forever.
const MAX_CARRY = 12;
function align(series, tl, maxCarry = MAX_CARRY) {
  const out = new Array(tl.length).fill(null);
  let j = 0, last = null, age = 0;
  for (let i = 0; i < tl.length; i++) {
    let fresh = false;
    while (j < series.length && series[j].m <= tl[i]) { last = series[j].v; j++; fresh = true; }
    if (fresh) age = 0; else if (last != null) age++;
    out[i] = last != null && age <= maxCarry ? last : null;
  }
  return out;
}

// The national cycle universe is per-vertical; see lib/vertical-signals.js

export async function nationalIntel(vertical) {
  const { leading: NAT_LEADING, lagging: NAT_LAGGING } = signalUniverse(vertical);
  const universe = [...NAT_LEADING, ...NAT_LAGGING];
  const meta = await sb(`indicators?select=slug,higher_is_better&slug=in.(${universe.join(",")})`);
  const polBy = Object.fromEntries((meta || []).map((m) => [m.slug, m.higher_is_better]));
  const classOf = (s) => (NAT_LEADING.includes(s) ? "leading" : "trailing");
  const metaBy = Object.fromEntries(universe.map((s) => [s, { classification: classOf(s), higher_is_better: polBy[s] }]));
  const slugs = universe;
  const yoy = await fetchYoY(slugs);
  const tl = timeline(24);

  // Per-indicator: aligned YoY, standardized over the window, oriented.
  const zSeries = {}; // slug -> [z per month] (oriented)
  const zLatest = {}; // slug -> { z, oriented, dirImproving }
  for (const slug of slugs) {
    const raw = yoy[slug];
    if (!raw || raw.length < 8) continue;
    const a = align(raw, tl).filter((x) => x != null);
    const full = align(raw, tl);
    const m = mean(a), s = stdev(a);
    if (!s) continue;
    const pol = polarity(metaBy[slug].higher_is_better);
    const z = full.map((v) => (v == null ? null : ((v - m) / s) * pol));
    zSeries[slug] = z;
    // latest non-null
    let li = z.length - 1;
    while (li >= 0 && z[li] == null) li--;
    if (li >= 0) {
      const prev = li >= 3 ? z[li - 3] : z[0];
      zLatest[slug] = {
        z: Math.round((z[li] / pol) * 100) / 100, // raw magnitude (sign = actual move)
        oriented: Math.round(z[li] * 100) / 100,
        improving: prev != null ? z[li] > prev : false,
      };
    }
  }

  // Composites.
  const leadSlugs = slugs.filter((s) => metaBy[s].classification === "leading" && zSeries[s]);
  const lagSlugs = slugs.filter((s) => metaBy[s].classification === "trailing" && zSeries[s]);
  const compose = (group) =>
    tl.map((_, i) => {
      const vals = group.map((s) => zSeries[s][i]).filter((x) => x != null);
      return vals.length ? Math.round(mean(vals) * 1000) / 1000 : null;
    });
  const leading = compose(leadSlugs);
  const lagging = compose(lagSlugs);
  const gap = tl.map((_, i) =>
    leading[i] != null && lagging[i] != null ? Math.round((leading[i] - lagging[i]) * 1000) / 1000 : null
  );

  const gapVals = gap.filter((x) => x != null);
  const gapNow = gapVals[gapVals.length - 1] ?? 0;
  const gapStd = stdev(gapVals) || 1;
  const gapSigma = Math.round((gapNow / gapStd) * 10) / 10;
  const sorted = [...gapVals].sort((a, b) => a - b);
  const pct = Math.round((sorted.filter((x) => x <= gapNow).length / sorted.length) * 100);
  const gap3 = gapVals.length > 3 ? gapVals[gapVals.length - 4] : gapVals[0];
  const widening = Math.abs(gapNow) > Math.abs(gap3);
  const tell = {
    months: tl,
    leading,
    lagging,
    gap,
    gapNow,
    gapSigma,
    percentile: pct,
    widening,
    // Verdict: leading below lagging (gap<0) = softening tell.
    read:
      gapNow < -0.25
        ? "leading_below"
        : gapNow > 0.25
        ? "leading_above"
        : "in_agreement",
  };

  // Anomalies — rank by |latest z|.
  const anomalies = Object.entries(zLatest)
    .map(([slug, d]) => ({
      slug, name: nameOf(slug), class: metaBy[slug].classification,
      z: d.oriented, mag: Math.abs(d.oriented),
      tone: d.oriented > 0.4 ? "bull" : d.oriented < -0.4 ? "bear" : "neutral",
    }))
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 7);

  // Events — most recent oriented-z zero-crossing per indicator (trend flip).
  // Each event carries `spark`: the trailing z-score history (the series measured
  // against its own 12-month trend, so 0 = on-trend). This is what the home-page
  // trendline draws -- the divergence itself, centred on zero, not a raw value
  // wiggle. `mf` flags multifamily-relevant series so the home section can lead
  // with those under "The Multifamily Trendline".
  const MF_SLUGS = new Set([
    "mf_starts", "permits_5plus", "rental_vacancy", "zori_national_mf",
    "zori_metro_mf", "cap_rate", "absorption", "apt_vacancy", "apt_rent_estimate",
    "days_to_lease", "zordi", "mf_lending_standards", "aimi", "aimi_rent_index",
    "aimi_value_index", "renter_delinquency", "cpi_rent", "cpi_shelter",
  ]);
  const events = [];
  for (const slug of slugs) {
    const z = zSeries[slug];
    if (!z) continue;
    for (let i = tl.length - 1; i >= 1; i--) {
      if (z[i] == null || z[i - 1] == null) continue;
      if (Math.sign(z[i]) !== Math.sign(z[i - 1]) && z[i] !== 0) {
        const up = z[i] > 0;
        // Trailing z-history up to and including the crossing (max 12 points).
        const start = Math.max(0, i - 11);
        const spark = z.slice(start, i + 1).map((v) => (v == null ? null : Number(v.toFixed(2))));
        events.push({
          month: tl[i], slug, name: nameOf(slug), class: metaBy[slug].classification,
          tone: up ? "bull" : "bear",
          mf: MF_SLUGS.has(slug),
          spark,
          text: up
            ? `${nameOf(slug)} crossed back above its trend`
            : `${nameOf(slug)} rolled below its trend`,
        });
        break;
      }
    }
  }
  events.sort((a, b) => (a.month < b.month ? 1 : -1));

  return { tell, anomalies, events: events.slice(0, 9), asOf: tl[tl.length - 1] };
}

export { sb, nameOf, polarity, mean, stdev };
