// Ticker overrides. 10Y Treasury stays on the live U.S. Treasury par-yield feed
// (same-day freshness — intentional exception to DB-as-source-of-truth). All
// other series read from Supabase (v_indicator_analytics) so the displayed
// numbers, analytics, and signals share one source. Returns a label-keyed map
// of { value, delta, dir, live } that components/Ticker.js overlays onto the
// base TICKER list; degrades gracefully to sample values on any failure.

import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });

/* ---------- 10Y Treasury — U.S. Treasury par-yield feed (live, ~daily, no key) ---------- */

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
    return { value: `${latest.toFixed(2)}%`, delta: `${bps > 0 ? "+" : ""}${bps}bps`, dir: bps <= 0 ? "up" : "down", live: true };
  } catch {
    return null;
  }
}

/* ---------- All other series — Supabase (single source of truth) ---------- */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    return rows.map((r) => parseFloat(r.value)).filter((v) => Number.isFinite(v));
  } catch {
    return null;
  }
}

export async function getTicker() {
  const items = {};

  // 10Y Treasury — LIVE feed (intentional same-day-freshness exception)
  const t10 = await treasury10Y();
  if (t10) items["10Y TREASURY"] = t10;

  // Multifamily starts (HOUST5F) — value K, delta MoM %
  const s = await series("mf_starts", 2);
  if (s && s.length >= 2) {
    const pct = ((s[0] - s[1]) / s[1]) * 100;
    items["MULTIFAMILY STARTS"] = { value: `${Math.round(s[0])}K`, delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, dir: pct >= 0 ? "up" : "down", live: true };
  }

  // Rental vacancy (RRVRUSQ156N) — value %, delta pp; falling vacancy = bullish
  const v = await series("rental_vacancy", 2);
  if (v && v.length >= 2) {
    const dpp = v[0] - v[1];
    items["NATIONAL VACANCY"] = { value: `${v[0].toFixed(1)}%`, delta: `${dpp >= 0 ? "+" : ""}${dpp.toFixed(1)}pp`, dir: dpp <= 0 ? "up" : "down", live: true };
  }

  // CPI shelter (CUSR0000SAH1) — YoY %, delta = change in YoY (pp); disinflation = bullish
  const sh = await series("cpi_shelter", 14);
  if (sh && sh.length >= 13) {
    const yoy = (sh[0] / sh[12] - 1) * 100;
    const prevYoy = sh.length >= 14 ? (sh[1] / sh[13] - 1) * 100 : yoy;
    const d = yoy - prevYoy;
    items["CPI SHELTER"] = { value: `+${yoy.toFixed(1)}%`, delta: `${d >= 0 ? "+" : ""}${d.toFixed(1)}pp`, dir: d <= 0 ? "up" : "down", live: true };
  }

  // Employment (PAYEMS) — YoY %, delta MoM %
  const p = await series("employment", 14);
  if (p && p.length >= 13) {
    const yoy = (p[0] / p[12] - 1) * 100;
    const mom = ((p[0] - p[1]) / p[1]) * 100;
    items["EMPLOYMENT GROWTH"] = { value: `+${yoy.toFixed(1)}%`, delta: `${mom >= 0 ? "+" : ""}${mom.toFixed(1)}%`, dir: yoy >= 0 ? "up" : "down", live: true };
  }

  return items;
}
