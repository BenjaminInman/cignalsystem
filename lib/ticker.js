// Ticker overrides for components/Ticker.js — returns a label-keyed map of
// { value, delta, dir, live } overlaid onto the base TICKER list.
//
// HYBRID source strategy:
//   • 10Y TREASURY  → live U.S. Treasury par-yield feed (intraday-fresh).
//     Documented exception to DB-as-source-of-truth: the cycle-relevant
//     reaction to rates wants same-day freshness, so this one bypasses the DB.
//   • everything else → Supabase analytics view (v_indicator_analytics),
//     the single source of truth, kept current by the daily FRED job.
//
// Degrades gracefully: any failed source is simply omitted, and the UI falls
// back to its base sample value for that row.

import { XMLParser } from "fast-xml-parser";
import { yoyPct, signedFixed } from "@/lib/yoy";

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });

/* ---------- 10Y Treasury — live U.S. Treasury par-yield feed (no API key) ---------- */

const tFeed = (yyyymm) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${yyyymm}`;

async function treasuryMonth(yyyymm) {
  const res = await fetch(tFeed(yyyymm), {
    next: { revalidate: 21600 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CignalSystem/1.0)" },
  });
  if (!res.ok) return [];
  const j = parser.parse(await res.text());
  let entries = j?.feed?.entry || [];
  if (!Array.isArray(entries)) entries = [entries];
  return entries.map((e) => e?.content?.properties).filter(Boolean);
}

async function treasury10Y() {
  try {
    const now = new Date();
    const ym = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    let props = await treasuryMonth(ym(now));
    if (props.length < 2) {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      props = [...(await treasuryMonth(ym(prev))), ...props];
    }
    props.sort((a, b) => new Date(a.NEW_DATE) - new Date(b.NEW_DATE));
    const valid = props.filter((p) => Number.isFinite(parseFloat(p.BC_10YEAR)));
    if (!valid.length) return null;
    const latest = parseFloat(valid[valid.length - 1].BC_10YEAR);
    const prior = valid.length > 1 ? parseFloat(valid[valid.length - 2].BC_10YEAR) : latest;
    const bps = Math.round((latest - prior) * 100);
    return {
      value: `${latest.toFixed(2)}%`,
      delta: `${bps > 0 ? "+" : ""}${bps}bps`,
      dir: bps <= 0 ? "up" : "down",
      live: true,
    };
  } catch {
    return null;
  }
}

/* ---------- All other series — Supabase analytics view ---------- */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Newest-first array of numeric values for a national indicator.
async function series(slug, limit) {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const url =
      `${SB_URL}/rest/v1/v_indicator_analytics` +
      `?slug=eq.${slug}&region_type=eq.national&select=obs_date,value` +
      `&order=obs_date.desc&limit=${limit}`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows
      .map((r) => ({ date: r.obs_date, value: parseFloat(r.value) }))
      .filter((r) => Number.isFinite(r.value));
  } catch {
    return null;
  }
}

export async function getTicker() {
  const items = {};

  // 10Y Treasury — live feed (intraday-fresh; documented DB exception)
  const t10 = await treasury10Y();
  if (t10) items["10Y TREASURY"] = t10;

  // Multifamily starts (HOUST5F, thousands SAAR) — value K, delta MoM %
  const s = await series("mf_starts", 2);
  if (s && s.length >= 2) {
    const pct = ((s[0].value - s[1].value) / s[1].value) * 100;
    items["MULTIFAMILY STARTS"] = { value: `${Math.round(s[0].value)}K`, delta: signedFixed(pct, 1, "%"), dir: pct >= 0 ? "up" : "down", live: true };
  }

  // Apartment List median rent (apt_rent_estimate) → AVG RENT GROWTH (national rental increases)
  // value YoY %, delta MoM %; rising rents = up
  const ar = await series("apt_rent_estimate", 15);
  const arYoy = ar ? yoyPct(ar) : null;
  if (ar && ar.length >= 2 && arYoy != null) {
    const mom = ((ar[0].value - ar[1].value) / ar[1].value) * 100;
    items["AVG RENT GROWTH"] = { value: `${signedFixed(arYoy, 1)}% YoY`, delta: signedFixed(mom, 1, "%"), dir: arYoy >= 0 ? "up" : "down", live: true };
  }

  // Apartment List apartment vacancy (apt_vacancy, %, monthly, MF-specific) → NATIONAL VACANCY
  // delta MoM pp; falling vacancy = bullish. Supersedes FRED quarterly rental_vacancy here.
  const av = await series("apt_vacancy", 2);
  if (av && av.length >= 2) {
    const dpp = av[0].value - av[1].value;
    items["NATIONAL VACANCY"] = { value: `${av[0].value.toFixed(1)}%`, delta: signedFixed(dpp, 1, "pp"), dir: dpp <= 0 ? "up" : "down", live: true };
  }

  // Apartment List time on market (apt_time_on_market, days) → DAYS ON MARKET
  // delta MoM days; fewer days = tightening = bullish
  const tom = await series("apt_time_on_market", 2);
  if (tom && tom.length >= 2) {
    const dd = tom[0].value - tom[1].value;
    items["DAYS ON MARKET"] = { value: `${Math.round(tom[0].value)} days`, delta: signedFixed(dd, 1), dir: dd <= 0 ? "up" : "down", live: true };
  }

  // CPI shelter (CUSR0000SAH1, SA index) → YoY %, delta = change in YoY (pp); disinflation = bullish
  const sh = await series("cpi_shelter", 16);
  const shYoy = sh ? yoyPct(sh) : null;
  if (sh && shYoy != null) {
    const prevYoy = yoyPct(sh.slice(1));
    const d = prevYoy == null ? 0 : shYoy - prevYoy;
    items["CPI SHELTER"] = { value: `${signedFixed(shYoy, 1)}%`, delta: signedFixed(d, 1, "pp"), dir: d <= 0 ? "up" : "down", live: true };
  }

  // Employment (PAYEMS, thousands) → YoY %, delta MoM %
  const p = await series("employment", 15);
  const pYoy = p ? yoyPct(p) : null;
  if (p && p.length >= 2 && pYoy != null) {
    const mom = ((p[0].value - p[1].value) / p[1].value) * 100;
    items["EMPLOYMENT GROWTH"] = { value: `${signedFixed(pYoy, 1)}%`, delta: signedFixed(mom, 1, "%"), dir: pYoy >= 0 ? "up" : "down", live: true };
  }

  // Cap rate (national avg) — manually maintained monthly indicator in the DB.
  // Reads live from the analytics view like everything else, so future manual
  // updates propagate here with no code change. Single point until history
  // accrues; a bps delta is only shown once ≥2 points exist. Rising cap rate is
  // bearish (dir "down"/red), falling is bullish (dir "up"/green).
  // Only surface cap rate once it is a real series. With a single hand-entered
  // observation there is no delta, no trend, and no upstream pipeline — showing
  // it under the LIVE FEED dot misrepresents a manual placeholder as market
  // data. Hard Signals stay attributable; this one is not yet one.
  const cr = await series("cap_rate", 2);
  if (cr && cr.length >= 2) {
    const bps = Math.round((cr[0].value - cr[1].value) * 100);
    items["CAP RATE (NATAVG)"] = {
      value: `${cr[0].value.toFixed(2)}%`,
      delta: `${bps >= 0 ? "+" : ""}${bps}bps`,
      dir: bps <= 0 ? "up" : "down",
      live: true,
    };
  }

  return items;
}
