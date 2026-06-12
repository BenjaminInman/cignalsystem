// National 12-month performance trends from FRED (monthly, auto-advancing).
//  rent    = CPI Rent of Primary Residence, YoY %   (CUSR0000SEHA)
//  shelter = CPI Shelter, YoY %                      (CUSR0000SAH1)
//  vac     = Rental Vacancy Rate, % (quarterly,      (RRVRUSQ156N)
//            carried forward to each month)
// Returns null when FRED_API_KEY is unset so the component shows sample data.

async function fred(seriesId, limit) {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.observations || [])
      .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
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
  if (!process.env.FRED_API_KEY) return null;

  const [rent, shelter, vac] = await Promise.all([
    fred("CUSR0000SEHA", 30),
    fred("CUSR0000SAH1", 30),
    fred("RRVRUSQ156N", 16),
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
