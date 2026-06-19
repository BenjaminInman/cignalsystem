// Live indicator overrides — sourced from Supabase (single source of truth,
// first-print values), kept current by the daily FRED job. Returns a map keyed
// by the indicator `name` used in lib/data.js INDICATORS. When the Supabase env
// vars are unset (or a fetch fails) the map is empty and the page falls back to
// sample values. Each override also returns `periods` — real x-axis labels
// derived from the observation dates, aligned (oldest -> newest) with `trend`.

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
      .map((o) => ({ date: o.obs_date, value: parseFloat(o.value) }))
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
  if (!SB_URL || !SB_KEY) return out;

  const [ahe, pay, gdp, pce, umc, cpi, ff, dom, perm, vac, rent] = await Promise.all([
    series("wage_growth", 40),
    series("employment", 13),
    series("gdp", 12),
    series("real_pce", 40),
    series("consumer_sentiment", 12),
    series("cpi_headline", 40),
    series("fed_funds", 12),
    series("days_on_market", 27),
    series("permits_5plus", 13),
    series("rental_vacancy", 9),
    series("cpi_rent", 40),
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

  if (perm && perm.length >= 2) {
    const d = Math.round(perm[0].value - perm[1].value);
    const { trend, periods } = lastN(perm, 9, 0);
    out["Multifamily Building Permits"] = { value: `${Math.round(perm[0].value)}K`, unit: "5+ units, SAAR", change: `${d >= 0 ? "+" : ""}${d}K MoM`, note: "Census building permits, 5+ unit structures", tone: toneFor(d, false), trend, periods, live: true };
  }

  if (vac && vac.length >= 2) {
    const d = +(vac[0].value - vac[1].value).toFixed(1);
    const { trend, periods } = lastN(vac, 9, 1, quartLab);
    out["National Vacancy Rate"] = { value: `${vac[0].value.toFixed(1)}%`, unit: "national avg", change: `${d >= 0 ? "+" : ""}${d}pp QoQ`, note: "Census rental vacancy rate", tone: toneFor(d, false), trend, periods, live: true };
  }

  const rr = yoyFrom(rent);
  if (rr) {
    const d = rr.latest - rr.prior;
    out["Effective Rent Growth"] = { value: pct(rr.latest), unit: "CPI rent, YoY", change: `${signed(d)}% MoM`, note: "CPI rent of primary residence (proxy)", tone: "neutral", trend: rr.trend, periods: rr.periods, live: true };
  }

  return out;
}
