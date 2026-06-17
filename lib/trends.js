// National 12-month performance trends — sourced from Supabase (single source
// of truth, first-print values), kept current by the daily FRED job.
//   rent    = CPI Rent of Primary Residence, YoY %   (slug: cpi_rent)
//   shelter = CPI Shelter, YoY %                      (slug: cpi_shelter)
//   vac     = Rental Vacancy Rate, % (quarterly,      (slug: rental_vacancy)
//             carried forward to each month)
// Returns null when the Supabase env vars are unset (or data is insufficient)
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

// 12 points of YoY % (oldest -> newest) from a monthly index series (newest-first).
function yoy12(obs) {
  if (!obs || obs.length < 24) return null;
  const out = [];
  for (let i = 11; i >= 0; i--) out.push(+((obs[i].value / obs[i + 12].value - 1) * 100).toFixed(2));
  return out;
}

export async function getTrends() {
  if (!SB_URL || !SB_KEY) return null;

  const [rent, shelter, vac] = await Promise.all([
    series("cpi_rent", 30),
    series("cpi_shelter", 30),
    series("rental_vacancy", 16),
  ]);

  if (!rent || rent.length < 24) return null;

  const months = [];
  for (let i = 11; i >= 0; i--) months.push(monthLabel(rent[i].date));

  // vacancy: for each of the 12 target months, take the latest quarterly obs as of that month
  let vacSeries = null;
  if (vac && vac.length) {
    vacSeries = [];
    for (let i = 11; i >= 0; i--) {
      const target = rent[i].date;
      const found = vac.find((o) => o.date <= target) || vac[vac.length - 1];
      vacSeries.push(+found.value.toFixed(2));
    }
  }

  return {
    live: true,
    asOf: monthLabel(rent[0].date),
    months,
    rent: yoy12(rent),
    shelter: yoy12(shelter),
    vac: vacSeries,
  };
}
