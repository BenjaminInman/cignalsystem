// Live indicator overrides sourced from FRED. Returns a map keyed by the
// indicator `name` used in lib/data.js INDICATORS. When FRED_API_KEY is unset
// (or a fetch fails) the map is empty and the page falls back to sample values.
// Each override also returns `periods` — real x-axis labels derived from the
// FRED observation dates, aligned (oldest -> newest) with `trend`.

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
const monthLab = (d) => `${MON[+d.split("-")[1] - 1]} '${d.slice(2, 4)}`;
const quartLab = (d) => `Q${Math.floor((+d.split("-")[1] - 1) / 3) + 1} '${d.slice(2, 4)}`;

const pct = (n, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;
const signed = (n, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

function toneFor(diff, goodWhenUp) {
  if (diff > 0) return goodWhenUp ? "bull" : "bear";
  if (diff < 0) return goodWhenUp ? "bear" : "bull";
  return "neutral";
}

// Year-over-year % from a monthly level series of {date,value} (newest-first).
function yoyFrom(obs, points = 9) {
  if (!obs || obs.length < points + 13) return null;
  const v = obs.map((o) => o.value);
  const yoy = (i) => (v[i] / v[i + 12] - 1) * 100;
  const trend = [], periods = [];
  for (let i = points - 1; i >= 0; i--) { trend.push(+yoy(i).toFixed(2)); periods.push(monthLab(obs[i].date)); }
  return { latest: yoy(0), prior: yoy(1), trend, periods };
}

const lastN = (obs, n = 9, d = 1, lab = monthLab) => ({
  trend: obs.slice(0, n).reverse().map((o) => +o.value.toFixed(d)),
  periods: obs.slice(0, n).reverse().map((o) => lab(o.date)),
});

export async function getLiveIndicators() {
  const out = {};
  if (!process.env.FRED_API_KEY) return out;

  const [ahe, pay, gdp, pce, umc, cpi, ff, dom] = await Promise.all([
    fred("CES0500000003", 40),
    fred("PAYEMS", 13),
    fred("A191RL1Q225SBEA", 12),
    fred("PCEC96", 40),
    fred("UMCSENT", 12),
    fred("CPIAUCSL", 40),
    fred("FEDFUNDS", 12),
    fred("MEDDAYONMAR", 27),
  ]);

  const w = yoyFrom(ahe);
  if (w) {
    const d = w.latest - w.prior;
    out["Wage Growth"] = { value: pct(w.latest), unit: "YoY", change: `${signed(d)}% MoM`, note: "Avg hourly earnings, total private", tone: toneFor(d, true), trend: w.trend, periods: w.periods, live: true };
  }

  if (pay && pay.length >= 11) {
    const diffs = [];
    for (let i = 0; i < 10; i++) diffs.push(pay[i].value - pay[i + 1].value);
    const latest = diffs[0], chg = diffs[0] - diffs[1];
    out["Job Growth"] = {
      value: `${latest >= 0 ? "+" : ""}${Math.round(latest)}K`, unit: "nonfarm, MoM",
      change: `${chg >= 0 ? "+" : ""}${Math.round(chg)}K vs prior`, note: "Net new nonfarm payrolls",
      tone: toneFor(chg, true),
      trend: diffs.slice(0, 9).reverse().map((v) => Math.round(v)),
      periods: pay.slice(0, 9).reverse().map((o) => monthLab(o.date)),
      live: true,
    };
  }

  if (gdp && gdp.length >= 2) {
    const d = gdp[0].value - gdp[1].value;
    const { trend, periods } = lastN(gdp, 9, 1, quartLab);
    out["Gross Domestic Product"] = { value: pct(gdp[0].value), unit: "real, annualized", change: `${signed(d)}% QoQ`, note: "Real GDP, annualized rate", tone: toneFor(d, true), trend, periods, live: true };
  }

  const p = yoyFrom(pce);
  if (p) {
    const d = p.latest - p.prior;
    out["Real Consumer Spending"] = { value: pct(p.latest), unit: "YoY real", change: `${signed(d)}% MoM`, note: "Real personal consumption (PCE)", tone: toneFor(d, true), trend: p.trend, periods: p.periods, live: true };
  }

  if (umc && umc.length >= 2) {
    const d = umc[0].value - umc[1].value;
    const { trend, periods } = lastN(umc, 9, 1);
    out["Consumer Confidence Index"] = { value: umc[0].value.toFixed(1), unit: "UMich sentiment", change: `${signed(d)} MoM`, note: "Univ. of Michigan sentiment (proxy)", tone: toneFor(d, true), trend, periods, live: true };
  }

  const c = yoyFrom(cpi);
  if (c) {
    const d = c.latest - c.prior;
    out["Inflation"] = { value: pct(c.latest), unit: "CPI YoY", change: `${signed(d)}% MoM`, note: "CPI, all urban consumers", tone: toneFor(d, false), trend: c.trend, periods: c.periods, live: true };
  }

  if (ff && ff.length >= 2) {
    const bps = Math.round((ff[0].value - ff[1].value) * 100);
    const { trend, periods } = lastN(ff, 9, 2);
    out["Interest Rates"] = { value: `${ff[0].value.toFixed(2)}%`, unit: "Fed funds rate", change: `${bps >= 0 ? "+" : ""}${bps} bps`, note: "Effective federal funds rate", tone: toneFor(ff[0].value - ff[1].value, false), trend, periods, live: true };
  }

  if (dom && dom.length >= 2) {
    const diff = Math.round(dom[0].value - dom[1].value);
    const yoy = dom.length >= 13 ? Math.round(dom[0].value - dom[12].value) : null;
    const q = [];
    for (let i = 0; i < dom.length && q.length < 9; i += 3) q.push(dom[i]);
    q.reverse();
    out["Days On Market"] = {
      value: `${Math.round(dom[0].value)}`, unit: "median days",
      change: `${diff >= 0 ? "+" : ""}${diff} days MoM`,
      note: yoy != null ? `${yoy >= 0 ? "+" : ""}${yoy} days YoY · Realtor.com` : "Realtor.com national median",
      tone: diff > 0 ? "bear" : diff < 0 ? "bull" : "neutral",
      trend: q.map((o) => Math.round(o.value)),
      periods: q.map((o) => monthLab(o.date)),
      live: true,
    };
  }

  return out;
}
