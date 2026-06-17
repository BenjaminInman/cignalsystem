// Ticker overrides — sourced from Supabase (single source of truth).
// Reads the analytics view (v_indicator_analytics) via PostgREST and returns a
// label-keyed map of { value, delta, dir, live } that components/Ticker.js
// overlays onto the base TICKER list. Same formatting/direction conventions as
// the previous live-FRED implementation; only the data source changed.
//
// Falls back to an empty map (→ sample values in the UI) if the Supabase env
// vars are missing or a query fails, so the ticker degrades gracefully.

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
    return rows.map((r) => parseFloat(r.value)).filter((v) => Number.isFinite(v));
  } catch {
    return null;
  }
}

export async function getTicker() {
  const items = {};

  // 10Y Treasury (DGS10) — value %, delta bps; falling rates = bullish for RE
  const t = await series("treasury_10y", 2);
  if (t && t.length >= 2) {
    const bps = Math.round((t[0] - t[1]) * 100);
    items["10Y TREASURY"] = { value: `${t[0].toFixed(2)}%`, delta: `${bps > 0 ? "+" : ""}${bps}bps`, dir: bps <= 0 ? "up" : "down", live: true };
  }

  // Multifamily starts (HOUST5F, thousands SAAR) — value K, delta MoM %
  const s = await series("mf_starts", 2);
  if (s && s.length >= 2) {
    const pct = ((s[0] - s[1]) / s[1]) * 100;
    items["MULTIFAMILY STARTS"] = { value: `${Math.round(s[0])}K`, delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, dir: pct >= 0 ? "up" : "down", live: true };
  }

  // Rental vacancy (RRVRUSQ156N, %) — value %, delta pp; falling vacancy = bullish
  const v = await series("rental_vacancy", 2);
  if (v && v.length >= 2) {
    const dpp = v[0] - v[1];
    items["NATIONAL VACANCY"] = { value: `${v[0].toFixed(1)}%`, delta: `${dpp >= 0 ? "+" : ""}${dpp.toFixed(1)}pp`, dir: dpp <= 0 ? "up" : "down", live: true };
  }

  // CPI shelter (CUSR0000SAH1, SA index) → YoY %, delta = change in YoY (pp); disinflation = bullish
  const sh = await series("cpi_shelter", 14);
  if (sh && sh.length >= 13) {
    const yoy = (sh[0] / sh[12] - 1) * 100;
    const prevYoy = sh.length >= 14 ? (sh[1] / sh[13] - 1) * 100 : yoy;
    const d = yoy - prevYoy;
    items["CPI SHELTER"] = { value: `+${yoy.toFixed(1)}%`, delta: `${d >= 0 ? "+" : ""}${d.toFixed(1)}pp`, dir: d <= 0 ? "up" : "down", live: true };
  }

  // Employment (PAYEMS, thousands) → YoY %, delta MoM %
  const p = await series("employment", 14);
  if (p && p.length >= 13) {
    const yoy = (p[0] / p[12] - 1) * 100;
    const mom = ((p[0] - p[1]) / p[1]) * 100;
    items["EMPLOYMENT GROWTH"] = { value: `+${yoy.toFixed(1)}%`, delta: `${mom >= 0 ? "+" : ""}${mom.toFixed(1)}%`, dir: yoy >= 0 ? "up" : "down", live: true };
  }

  return items;
}
