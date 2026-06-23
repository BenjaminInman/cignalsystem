// National 12-month performance trends — sourced from Supabase (single source
// of truth, first-print values), kept current by the daily FRED job.
//   rent    = CPI Rent of Primary Residence, YoY %   (slug: cpi_rent)
//   shelter = CPI Shelter, YoY %                      (slug: cpi_shelter)
//   vac     = Rental Vacancy Rate, % (quarterly,      (slug: rental_vacancy)
//             carried forward to each month)
//
// YoY is computed by DATE (each month vs the same month a year earlier), not by
// array position, so an upstream gap — e.g. the suspended Oct-2025 CPI release —
// never shifts the comparison. Months with no year-ago value are skipped rather
// than mis-compared. Returns null when env vars are unset or data is too thin,
// so the component falls back to sample data.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Newest-first [{date, value}] for a national indicator, read from the view.
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
      .filter((o) => Number.isFinite(o.value));
  } catch {
    return null;
  }
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (d) => `${MON[+d.split("-")[1] - 1]} '${d.slice(2, 4)}`;
const yearAgo = (d) => `${+d.slice(0, 4) - 1}${d.slice(4)}`; // 2026-05-01 -> 2025-05-01

export async function getTrends() {
  if (!SB_URL || !SB_KEY) return null;

  const [rentObs, shelterObs, vac] = await Promise.all([
    series("cpi_rent", 30),
    series("cpi_shelter", 30),
    series("rental_vacancy", 16),
  ]);
  if (!rentObs || rentObs.length < 13) return null;

  const rentMap = Object.fromEntries(rentObs.map((o) => [o.date, o.value]));
  const shelterMap = shelterObs ? Object.fromEntries(shelterObs.map((o) => [o.date, o.value])) : {};

  // Spine = the 12 most-recent rent months that actually have a year-ago value,
  // so every plotted point is a true YoY (the Oct-gap month drops out naturally).
  const spine = [];
  for (const o of rentObs) {
    if (rentMap[yearAgo(o.date)] != null) spine.push(o.date);
    if (spine.length === 12) break;
  }
  if (spine.length < 2) return null;
  spine.reverse(); // oldest -> newest

  const yoyAt = (map, d) => {
    const cur = map[d];
    const prev = map[yearAgo(d)];
    return cur != null && prev ? +((cur / prev - 1) * 100).toFixed(2) : null;
  };

  const months = spine.map(monthLabel);
  const rent = spine.map((d) => yoyAt(rentMap, d));
  const shelterArr = spine.map((d) => yoyAt(shelterMap, d));
  const shelter = shelterArr.every((v) => v != null) ? shelterArr : null;

  // Vacancy: latest quarterly observation as of each spine month.
  let vacSeries = null;
  if (vac && vac.length) {
    vacSeries = spine.map((d) => {
      const found = vac.find((o) => o.date <= d) || vac[vac.length - 1];
      return +found.value.toFixed(2);
    });
  }

  return {
    live: true,
    asOf: monthLabel(spine[spine.length - 1]),
    months,
    rent,
    shelter,
    vac: vacSeries,
  };
}
