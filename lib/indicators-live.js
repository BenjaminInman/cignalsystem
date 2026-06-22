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

  const [ahe, pay, gdp, pce, umc, cpi, ff, dom, perm, vac, rent, ys, ic, cl, cap, abs, dsc, mig, fc, e2024, e2534, rd, cre, rentmf] = await Promise.all([
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
    series("zori_national", 40),
    series("yield_spread", 30),
    series("initial_claims", 14),
    series("cli_oecd", 13),
    series("cap_rate", 13),
    series("absorption", 9),
    series("dscr", 9),
    series("migration", 13),
    series("foreclosure", 9),
    series("emp_2024", 14),
    series("emp_2534", 14),
    series("renter_delinquency", 13),
    series("cre_delinquency", 13),
    series("zori_national_mf", 40),
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
    out["Consumer Sentiment (UMich)"] = { value: umc[0].value.toFixed(1), unit: "UMich sentiment", change: `${signed(d)} MoM`, note: "University of Michigan Consumer Sentiment", tone: toneFor(d, true), trend, periods, live: true };
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
    out["Market Rent Growth"] = { value: pct(rr.latest), unit: "ZORI, YoY", change: `${signed(d)}% MoM`, note: "Zillow Observed Rent Index — all rental types, incl. single-family, condo & multifamily", tone: "neutral", trend: rr.trend, periods: rr.periods, live: true };
  }

  const rrm = yoyFrom(rentmf);
  if (rrm) {
    const d = rrm.latest - rrm.prior;
    out["Market Rent Growth (Multifamily)"] = { value: pct(rrm.latest), unit: "ZORI, YoY", change: `${signed(d)}% MoM`, note: "Zillow Observed Rent Index — national multifamily (5+ unit) asking rents", tone: "neutral", trend: rrm.trend, periods: rrm.periods, live: true };
  }

  if (ys && ys.length >= 2) {
    const d = ys[0].value - ys[1].value;
    const tone = ys[0].value < 0 ? "bear" : ys[0].value >= 0.25 ? "bull" : "neutral";
    const { trend, periods } = lastN(ys, 9, 2);
    out["Yield Curve Spread"] = { value: `${ys[0].value.toFixed(2)}pp`, unit: "10Y minus 3M", change: `${signed(d, 2)}pp`, note: "10-year minus 3-month Treasury spread", tone, trend, periods, live: true };
  }

  if (ic && ic.length >= 2) {
    const d = Math.round((ic[0].value - ic[1].value) / 1000);
    const { trend, periods } = lastN(ic.map((o) => ({ date: o.date, value: o.value / 1000 })), 9, 0);
    out["Initial Jobless Claims"] = { value: `${Math.round(ic[0].value / 1000)}K`, unit: "weekly", change: `${d >= 0 ? "+" : ""}${d}K WoW`, note: "Initial unemployment claims, seasonally adj.", tone: toneFor(d, false), trend, periods, live: true };
  }

  if (cl && cl.length >= 2) {
    const d = cl[0].value - cl[1].value;
    const tone = cl[0].value >= 100 && d > 0 ? "bull" : cl[0].value < 100 && d < 0 ? "bear" : "neutral";
    const { trend, periods } = lastN(cl, 9, 1);
    out["Leading Indicator (OECD)"] = { value: cl[0].value.toFixed(1), unit: "index, 100 = trend", change: `${signed(d, 1)} MoM`, note: "OECD composite leading indicator, US", tone, trend, periods, live: true };
  }

  // Manual indicators — go live the moment a value is provided.
  if (cap && cap.length >= 1) {
    const d = cap.length >= 2 ? cap[0].value - cap[1].value : null;
    const { trend, periods } = lastN(cap, 9, 2);
    out["Cap Rate (National Avg)"] = { value: `${cap[0].value.toFixed(2)}%`, unit: "blended", change: d == null ? "new" : `${signed(d, 2)}% MoM`, note: "Manually maintained — national blended cap rate", tone: d == null ? "neutral" : toneFor(d, false), trend, periods, live: true };
  }
  if (abs && abs.length >= 1) {
    const d = abs.length >= 2 ? abs[0].value - abs[1].value : null;
    const { trend, periods } = lastN(abs, 9, 1, quartLab);
    out["Net Absorption Rate"] = { value: `${abs[0].value.toFixed(1)}%`, unit: "of new supply", change: d == null ? "new" : `${signed(d, 1)}% QoQ`, note: "Manually maintained — share of new supply leased", tone: d == null ? "neutral" : toneFor(d, true), trend, periods, live: true };
  }
  if (dsc && dsc.length >= 1) {
    const d = dsc.length >= 2 ? dsc[0].value - dsc[1].value : null;
    const { trend, periods } = lastN(dsc, 9, 2, quartLab);
    out["Debt Service Coverage"] = { value: `${dsc[0].value.toFixed(2)}x`, unit: "portfolio avg", change: d == null ? "new" : `${signed(d, 2)} QoQ`, note: "Manually maintained — blended DSCR", tone: d == null ? "neutral" : toneFor(d, true), trend, periods, live: true };
  }
  if (mig && mig.length >= 1) {
    const d = mig.length >= 2 ? mig[0].value - mig[1].value : null;
    const { trend, periods } = lastN(mig, 9, 0);
    out["Net Renter Migration Index"] = { value: `${Math.round(mig[0].value)}`, unit: "index", change: d == null ? "new" : `${d >= 0 ? "+" : ""}${Math.round(d)}pts`, note: "Manually maintained — net renter in-migration", tone: d == null ? "neutral" : toneFor(d, true), trend, periods, live: true };
  }

  if (fc && fc.length >= 1) {
    const d = fc.length >= 2 ? fc[0].value - fc[1].value : null;
    const { trend, periods } = lastN(fc, 9, 2, quartLab);
    out["National Foreclosure Rate"] = { value: `${fc[0].value.toFixed(2)}%`, unit: "of mortgages", change: d == null ? "new" : `${signed(d, 2)}% QoQ`, note: "Manually maintained — national foreclosure rate", tone: d == null ? "neutral" : toneFor(d, false), trend, periods, live: true };
  }

  // Renter-age employment: 20–34 = sum of the 20–24 and 25–34 cohorts (BLS).
  if (e2024 && e2534 && e2024.length && e2534.length) {
    const byDate = new Map(e2534.map((o) => [o.date, o.value]));
    const merged = e2024.filter((o) => byDate.has(o.date)).map((o) => ({ date: o.date, value: o.value + byDate.get(o.date) }));
    if (merged.length >= 13) {
      const latest = merged[0].value, prevM = merged[1].value, yearAgo = merged[12].value;
      const yoy = ((latest - yearAgo) / yearAgo) * 100;
      const mom = ((latest - prevM) / prevM) * 100;
      const { trend, periods } = lastN(merged, 9, 0);
      out["Renter-Age Employment (18-34)"] = { value: `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%`, unit: "YoY, ages 20–34", change: `${mom >= 0 ? "+" : ""}${mom.toFixed(1)}% MoM`, note: "Employment, ages 20–34 (BLS) — core renter cohort", tone: yoy >= 0 ? "bull" : "bear", trend, periods, live: true };
    }
  }

  if (rd && rd.length >= 1) {
    const d = rd.length >= 2 ? rd[0].value - rd[1].value : null;
    const { trend, periods } = lastN(rd, 9, 1);
    out["Renter Delinquency Rate"] = { value: `${rd[0].value.toFixed(1)}%`, unit: "of renters", change: d == null ? "CFPB data" : `${signed(d, 1)}pp`, note: "Manually maintained — share of renters behind on rent (CFPB)", tone: d == null ? "bear" : toneFor(d, false), trend, periods, live: true };
  }

  if (cre && cre.length >= 2) {
    const d = cre[0].value - cre[1].value;
    const { trend, periods } = lastN(cre, 9, 2, quartLab);
    out["CRE Loan Delinquency Rate"] = { value: `${cre[0].value.toFixed(2)}%`, unit: "of CRE loans", change: `${signed(d, 2)}pp QoQ`, note: "Fed CRE bank-loan delinquency (incl. multifamily)", tone: toneFor(d, false), trend, periods, live: true };
  }

  return out;
}
