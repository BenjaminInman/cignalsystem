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

const pct = (n, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;
const signed = (n, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

function toneFor(diff, goodWhenUp) {
  if (diff > 0) return goodWhenUp ? "bull" : "bear";
  if (diff < 0) return goodWhenUp ? "bear" : "bull";
  return "neutral";
}

// Year-over-year % from a monthly level series (newest-first).
function yoyFrom(vals, points = 9) {
  if (!vals || vals.length < points + 13) return null;
  const yoy = (i) => (vals[i] / vals[i + 12] - 1) * 100;
  const trend = [];
  for (let i = points - 1; i >= 0; i--) trend.push(+yoy(i).toFixed(2));
  return { latest: yoy(0), prior: yoy(1), trend };
}

const last9 = (vals, d = 1) => vals.slice(0, 9).reverse().map((v) => +v.toFixed(d));

export async function getLiveIndicators() {
  const out = {};
  if (!process.env.FRED_API_KEY) return out;

  const [ahe, pay, gdp, pce, umc, cpi, ff, dom] = await Promise.all([
    fred("CES0500000003", 40), // Avg hourly earnings, total private (monthly)
    fred("PAYEMS", 13),        // All employees, total nonfarm (thousands)
    fred("A191RL1Q225SBEA", 12), // Real GDP, % change annualized (quarterly)
    fred("PCEC96", 40),        // Real personal consumption expenditures (monthly)
    fred("UMCSENT", 12),       // U. Michigan consumer sentiment (monthly)
    fred("CPIAUCSL", 40),      // CPI all urban consumers (monthly)
    fred("FEDFUNDS", 12),      // Effective federal funds rate (monthly)
    fred("MEDDAYONMAR", 27),   // Median days on market, national (monthly)
  ]);

  // Wage Growth — YoY of average hourly earnings
  const w = yoyFrom(ahe);
  if (w) {
    const d = w.latest - w.prior;
    out["Wage Growth"] = {
      value: pct(w.latest), unit: "YoY", change: `${signed(d)}% MoM`,
      note: "Avg hourly earnings, total private", tone: toneFor(d, true),
      trend: w.trend, live: true,
    };
  }

  // Job Growth — monthly net change in nonfarm payrolls (thousands)
  if (pay && pay.length >= 11) {
    const diffs = [];
    for (let i = 0; i < 10; i++) diffs.push(pay[i] - pay[i + 1]);
    const latest = diffs[0], chg = diffs[0] - diffs[1];
    out["Job Growth"] = {
      value: `${latest >= 0 ? "+" : ""}${Math.round(latest)}K`, unit: "nonfarm, MoM",
      change: `${chg >= 0 ? "+" : ""}${Math.round(chg)}K vs prior`,
      note: "Net new nonfarm payrolls", tone: toneFor(chg, true),
      trend: diffs.slice(0, 9).reverse().map((v) => Math.round(v)), live: true,
    };
  }

  // Gross Domestic Product — real, annualized % (quarterly)
  if (gdp && gdp.length >= 2) {
    const d = gdp[0] - gdp[1];
    out["Gross Domestic Product"] = {
      value: pct(gdp[0]), unit: "real, annualized", change: `${signed(d)}% QoQ`,
      note: "Real GDP, annualized rate", tone: toneFor(d, true),
      trend: last9(gdp), live: true,
    };
  }

  // Real Consumer Spending — YoY of real PCE
  const p = yoyFrom(pce);
  if (p) {
    const d = p.latest - p.prior;
    out["Real Consumer Spending"] = {
      value: pct(p.latest), unit: "YoY real", change: `${signed(d)}% MoM`,
      note: "Real personal consumption (PCE)", tone: toneFor(d, true),
      trend: p.trend, live: true,
    };
  }

  // Consumer Confidence — U. Michigan sentiment (free proxy for Conference Board)
  if (umc && umc.length >= 2) {
    const d = umc[0] - umc[1];
    out["Consumer Confidence Index"] = {
      value: umc[0].toFixed(1), unit: "UMich sentiment", change: `${signed(d)} MoM`,
      note: "Univ. of Michigan sentiment (proxy)", tone: toneFor(d, true),
      trend: last9(umc), live: true,
    };
  }

  // Inflation — YoY CPI
  const c = yoyFrom(cpi);
  if (c) {
    const d = c.latest - c.prior;
    out["Inflation"] = {
      value: pct(c.latest), unit: "CPI YoY", change: `${signed(d)}% MoM`,
      note: "CPI, all urban consumers", tone: toneFor(d, false),
      trend: c.trend, live: true,
    };
  }

  // Interest Rates — effective federal funds rate
  if (ff && ff.length >= 2) {
    const bps = Math.round((ff[0] - ff[1]) * 100);
    out["Interest Rates"] = {
      value: `${ff[0].toFixed(2)}%`, unit: "Fed funds rate", change: `${bps >= 0 ? "+" : ""}${bps} bps`,
      note: "Effective federal funds rate", tone: toneFor(ff[0] - ff[1], false),
      trend: last9(ff, 2), live: true,
    };
  }

  // Days On Market — Realtor.com national median (quarterly-sampled trend)
  if (dom && dom.length >= 2) {
    const diff = Math.round(dom[0] - dom[1]);
    const yoy = dom.length >= 13 ? Math.round(dom[0] - dom[12]) : null;
    const q = [];
    for (let i = 0; i < dom.length && q.length < 9; i += 3) q.push(dom[i]);
    out["Days On Market"] = {
      value: `${Math.round(dom[0])}`, unit: "median days",
      change: `${diff >= 0 ? "+" : ""}${diff} days MoM`,
      note: yoy != null ? `${yoy >= 0 ? "+" : ""}${yoy} days YoY · Realtor.com` : "Realtor.com national median",
      tone: diff > 0 ? "bear" : diff < 0 ? "bull" : "neutral",
      trend: q.reverse(), live: true,
    };
  }

  return out;
}
