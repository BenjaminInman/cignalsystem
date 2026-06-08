// Live indicator overrides sourced from FRED. Returns a map keyed by the
// indicator `name` used in lib/data.js INDICATORS. When FRED_API_KEY is unset
// (or a fetch fails) the map is empty and the page falls back to sample values.

async function fred(seriesId, limit) {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.observations || [])
      .map((o) => parseFloat(o.value))
      .filter((v) => Number.isFinite(v));
  } catch {
    return null;
  }
}

export async function getLiveIndicators() {
  const out = {};
  if (!process.env.FRED_API_KEY) return out;

  // Days On Market — Realtor.com Median Days on Market, national (monthly).
  // FRED series: MEDDAYONMAR.
  const dom = await fred("MEDDAYONMAR", 27);
  if (dom && dom.length >= 2) {
    const latest = dom[0];
    const prior = dom[1];
    const diff = Math.round(latest - prior);
    const yoy = dom.length >= 13 ? Math.round(latest - dom[12]) : null;

    // Quarterly-spaced 9-point trend (every 3rd monthly obs), oldest -> newest.
    const q = [];
    for (let i = 0; i < dom.length && q.length < 9; i += 3) q.push(dom[i]);
    const trend = q.reverse();

    out["Days On Market"] = {
      value: `${Math.round(latest)}`,
      unit: "median days",
      change: `${diff >= 0 ? "+" : ""}${diff} days MoM`,
      note: yoy != null ? `${yoy >= 0 ? "+" : ""}${yoy} days YoY · Realtor.com` : "Realtor.com national median",
      tone: diff > 0 ? "bear" : diff < 0 ? "bull" : "neutral",
      trend,
      live: true,
    };
  }

  return out;
}
