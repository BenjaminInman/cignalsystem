// Live indicator overrides — sourced from Supabase (single source of truth,
// first-print values), kept current by the daily FRED job. Returns a map keyed
// by the indicator `name` used in lib/data.js INDICATORS. When the Supabase env
// vars are unset (or a fetch fails) the map is empty and the page falls back to
// sample values. Each override also returns `periods` — real x-axis labels
// derived from the observation dates, aligned (oldest -> newest) with `trend`.

import { yoyPct, yoyAbs, yearAgo } from "@/lib/yoy";

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
const dayLab = (d) => `${MON[+d.split("-")[1] - 1]} ${+d.split("-")[2]}`;
const yearLab = (d) => d.slice(0, 4);

const pct = (n, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;
const signed = (n, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

function toneFor(diff, goodWhenUp) {
  if (diff > 0) return goodWhenUp ? "bull" : "bear";
  if (diff < 0) return goodWhenUp ? "bear" : "bull";
  return "neutral";
}

// Year-over-year % from a monthly level series of {date,value} (newest-first).
// Anchored on the observation dated exactly one year earlier rather than on
// index i+12 — CPI-family series are missing 2025-10 (never published), so
// positional indexing silently produced a 13-month change.
function yoyFrom(obs, points = 9) {
  if (!obs || obs.length < points + 1) return null;
  const yoy = (i) => yoyPct(obs.slice(i));
  const latest = yoy(0);
  if (latest == null) return null;
  const trend = [], periods = [];
  for (let i = points - 1; i >= 0; i--) {
    const y = yoy(i);
    if (y == null) continue;
    trend.push(+y.toFixed(2));
    periods.push(monthLab(obs[i].date));
  }
  return { latest, prior: yoy(1), trend, periods };
}

const lastN = (obs, n = 9, d = 1, lab = monthLab) => ({
  trend: obs.slice(0, n).reverse().map((o) => +o.value.toFixed(d)),
  periods: obs.slice(0, n).reverse().map((o) => lab(o.date)),
});

export async function getLiveIndicators() {
  const out = {};
  if (!SB_URL || !SB_KEY) return out;

  const [ahe, aher, pay, gdp, pce, umc, cpi, ff, dom, perm, vac, rent, ys, ic, cl, cap, un, abs, zrd, dsc, mig, fc, e2024, e2534, rd, cre, rentmf, hvn, t2y, baa, hyo, sfr, mls, jo, jq, aim, aimr, aimv, ehs, rb, mgr, mhi, mhv, ro, ou, atom, ppi, pcei] = await Promise.all([
    series("wage_growth", 40),
    series("wage_growth_real", 40),
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
    series("unemployment", 13),
    series("absorption", 13),
    series("zordi", 25),
    series("dscr", 9),
    series("migration", 13),
    series("foreclosure", 9),
    series("emp_2024", 14),
    series("emp_2534", 14),
    series("renter_delinquency", 13),
    series("cre_delinquency", 13),
    series("zori_national_mf", 40),
    series("zhvi_national", 40),
    series("treasury_2y", 30),
    series("baa_spread", 30),
    series("hy_oas", 30),
    series("sofr", 30),
    series("mf_lending_standards", 12),
    series("jolts_openings", 13),
    series("jolts_quits", 13),
    series("aimi", 13),
    series("aimi_rent_index", 13),
    series("aimi_value_index", 13),
    series("existing_home_sales", 13),
    series("acs_rent_burden", 15),
    series("acs_median_gross_rent", 15),
    series("acs_median_hh_income", 15),
    series("acs_median_home_value", 15),
    series("acs_renter_occupied", 15),
    series("acs_occupied_units", 15),
    series("apt_time_on_market", 13),
    series("ppi", 40),
    series("pce_inflation", 40),
  ]);

  const w = yoyFrom(ahe);
  if (w) {
    const d = w.latest - w.prior;
    out["Wage Growth"] = { value: pct(w.latest), unit: "YoY", change: `${signed(d)}% MoM`, note: "Avg hourly earnings, total private", tone: toneFor(d, true), trend: w.trend, periods: w.periods, live: true };
  }

  // Real wage growth: same construct, inflation-adjusted. Tone keys off the
  // sign of the level, not the month-over-month wiggle -- negative real growth
  // means pay is losing to prices no matter which way it moved this month.
  const wr = yoyFrom(aher);
  if (wr) {
    const d = wr.latest - wr.prior;
    const note = wr.latest < 0 ? "Pay losing to prices" : "Pay outpacing prices";
    out["Real Wage Growth"] = { value: pct(wr.latest), unit: "YoY", change: `${signed(d)}pp MoM`, note, tone: wr.latest < 0 ? "bear" : wr.latest < 0.5 ? "neutral" : "bull", trend: wr.trend, periods: wr.periods, live: true };
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
    const d = c.prior == null ? 0 : c.latest - c.prior;
    out["CPI (All Urban)"] = { value: pct(c.latest), unit: "CPI YoY", change: `${signed(d)}% MoM`, note: "CPI, all urban consumers (BLS)", tone: toneFor(d, false), trend: c.trend, periods: c.periods, live: true };
  }

  // PPI and PCE are their own indicators, each named for the series it is and
  // attributed to its own source. They are never averaged into a single
  // "inflation" number: PPI measures producer prices (and leads), CPI measures
  // a fixed consumer basket, PCE measures a substituting basket the Fed
  // targets. Three constructs, three readings — the gaps between them are
  // themselves signal.
  const pp = yoyFrom(ppi);
  if (pp) {
    const d = pp.prior == null ? 0 : pp.latest - pp.prior;
    out["PPI (Final Demand)"] = { value: pct(pp.latest), unit: "PPI YoY", change: `${signed(d)}% MoM`, note: "Producer prices, final demand (BLS) — upstream of CPI", tone: toneFor(d, false), trend: pp.trend, periods: pp.periods, live: true };
  }

  const pi = yoyFrom(pcei);
  if (pi) {
    const d = pi.prior == null ? 0 : pi.latest - pi.prior;
    out["PCE Price Index"] = { value: pct(pi.latest), unit: "PCE YoY", change: `${signed(d)}% MoM`, note: "PCE price index (BEA) — the Fed's preferred gauge", tone: toneFor(d, false), trend: pi.trend, periods: pi.periods, live: true };
  }

  if (ff && ff.length >= 2) {
    const bps = Math.round((ff[0].value - ff[1].value) * 100);
    const { trend, periods } = lastN(ff, 9, 2);
    out["Interest Rates"] = { value: `${ff[0].value.toFixed(2)}%`, unit: "Fed funds rate", change: `${bps >= 0 ? "+" : ""}${bps} bps`, note: "Effective federal funds rate", tone: toneFor(ff[0].value - ff[1].value, false), trend, periods, live: true };
  }

  if (dom && dom.length >= 2) {
    const diff = Math.round(dom[0].value - dom[1].value);
    const domAbs = yoyAbs(dom);
    const yoy = domAbs == null ? null : Math.round(domAbs);
    const q = [];
    for (let i = 0; i < dom.length && q.length < 9; i += 3) q.push(dom[i]);
    q.reverse();
    out["Days On Market (For-Sale Homes)"] = {
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
    out["Market Rent Growth (All Rentals)"] = { value: pct(rr.latest), unit: "ZORI, YoY", change: `${signed(d)}% MoM`, note: "Zillow Observed Rent Index — all rental types, incl. single-family, condo & multifamily", tone: "neutral", trend: rr.trend, periods: rr.periods, live: true };
  }

  const rrm = yoyFrom(rentmf);
  if (rrm) {
    const d = rrm.latest - rrm.prior;
    out["Market Rent Growth (Multifamily)"] = { value: pct(rrm.latest), unit: "ZORI, YoY", change: `${signed(d)}% MoM`, note: "Zillow Observed Rent Index — national multifamily (5+ unit) asking rents", tone: "neutral", trend: rrm.trend, periods: rrm.periods, live: true };
  }

  const hv = yoyFrom(hvn);
  if (hv) {
    const d = hv.latest - hv.prior;
    out["Home Value Index"] = { value: pct(hv.latest), unit: "ZHVI, YoY", change: `${signed(d)}% MoM`, note: "Zillow Home Value Index — national, all homes", tone: "neutral", trend: hv.trend, periods: hv.periods, live: true };
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
  if (un && un.length >= 13 && yearAgo(un)) {
    // Locked bands (shared with the Cycle Wheel): 2.5-4.5% green; <2.5% or 4.5-5% yellow; >5% red.
    const v = un[0].value;
    const yoy = yoyAbs(un);
    const tone = v > 5 ? "bear" : v >= 4.5 || v < 2.5 ? "neutral" : "bull";
    const { trend, periods } = lastN(un, 9, 1);
    out["Unemployment Rate"] = {
      value: `${v.toFixed(1)}%`, unit: "U-3, SA",
      change: `${signed(yoy, 1)}pp YoY`,
      note: v > 5 ? "Above the 5% stress line" : v >= 4.5 ? "Above the healthy band" : v < 2.5 ? "Unusually tight" : "Within the healthy 2.5\u20134.5% band",
      tone, trend, periods, live: true,
    };
  }
  if (abs && abs.length >= 4) {
    // SOMA absorption is strongly seasonal: Q2 averages 59.1% and Q4 51.3%, a 7.8pp
    // swing that equals the series' own standard deviation. Banding the raw quarterly
    // print would flag "stress" nearly every Q4 for calendar reasons. So the headline
    // and the color both come from the trailing 4-quarter average, where seasonality
    // cancels; the raw print rides alongside it so the two can never disagree.
    const avg4 = (a, i) => (a[i].value + a[i + 1].value + a[i + 2].value + a[i + 3].value) / 4;
    const t4 = avg4(abs, 0);
    const t4Prev = abs.length >= 5 ? avg4(abs, 1) : null;
    const d = t4Prev == null ? null : t4 - t4Prev;
    // Pre-2020 (normal-regime) trailing-4Q mean = 55.3%, stdev 1.91pp. The 50% line is
    // the industry's conventional stress threshold; it never fired pre-2020.
    const NORMAL = 55.3;
    const tone = t4 >= 53 ? "bull" : t4 >= 50 ? "neutral" : "bear";
    const { trend, periods } = lastN(abs, 9, 1, quartLab);
    out["Absorption Rate (3-Mo)"] = {
      value: `${t4.toFixed(1)}%`, unit: "4-qtr avg",
      sub: `latest print ${abs[0].value.toFixed(0)}% · ${quartLab(abs[0].date)}`,
      change: `${signed(t4 - NORMAL, 1)}pp vs normal`,
      note: `New apartments leased within 3 months of completion — Census SOMA. Normal ≈ ${NORMAL}%; below 50% is supply stress.`,
      tone, trend, periods, live: true,
    };
  }
  if (zrd && zrd.length >= 13 && yoyAbs(zrd) != null) {
    // Unitless engagement index: the honest read is YoY change, not the level.
    const yoy = yoyAbs(zrd);
    const prevYoy = yoyAbs(zrd.slice(1));
    const d = yoy == null || prevYoy == null ? null : yoy - prevYoy;
    const { trend, periods } = lastN(zrd, 13, 0);
    out["Renter Demand Index (ZORDI)"] = {
      value: `${signed(yoy, 0)}`, unit: "pts YoY",
      change: d == null ? "new" : `${signed(d, 0)} vs prior mo`,
      note: "Zillow rental-market tightness — renter engagement vs. available supply. Directional index; read the trend, not the level.",
      tone: toneFor(yoy, true), trend, periods, live: true,
    };
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
    if (merged.length >= 13 && yoyPct(merged) != null) {
      const latest = merged[0].value, prevM = merged[1].value;
      const yoy = yoyPct(merged);
      const mom = ((latest - prevM) / prevM) * 100;
      const { trend, periods } = lastN(merged, 9, 0);
      out["Renter-Age Employment (20-34)"] = { value: `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%`, unit: "YoY, ages 20–34", change: `${mom >= 0 ? "+" : ""}${mom.toFixed(1)}% MoM`, note: "Employment, ages 20–34 (BLS) — core renter cohort", tone: yoy >= 0 ? "bull" : "bear", trend, periods, live: true };
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


  // --- Capital markets (Layer 3 macro) -------------------------------------
  // Daily series: label by day, otherwise nine points all read "Jul '26".
  if (t2y && t2y.length >= 2) {
    const d = t2y[0].value - t2y[1].value;
    const { trend, periods } = lastN(t2y, 9, 2, dayLab);
    out["2-Year Treasury"] = { value: `${t2y[0].value.toFixed(2)}%`, unit: "DGS2", change: `${signed(d, 2)}pp`, note: "Market's read on Fed policy", tone: toneFor(d, false), trend, periods, live: true };
  }

  if (baa && baa.length >= 2) {
    const d = baa[0].value - baa[1].value;
    const { trend, periods } = lastN(baa, 9, 2, dayLab);
    out["Corporate Credit Spread (BAA)"] = { value: `${baa[0].value.toFixed(2)}pp`, unit: "BAA minus 10Y", change: `${signed(d, 2)}pp`, note: "Investment-grade risk premium", tone: toneFor(d, false), trend, periods, live: true };
  }

  if (hyo && hyo.length >= 2) {
    const d = hyo[0].value - hyo[1].value;
    const { trend, periods } = lastN(hyo, 9, 2, dayLab);
    out["High-Yield Credit Spread"] = { value: `${hyo[0].value.toFixed(2)}pp`, unit: "ICE BofA HY OAS", change: `${signed(d, 2)}pp`, note: "Risk appetite, earliest stress read", tone: toneFor(d, false), trend, periods, live: true };
  }

  if (sfr && sfr.length >= 2) {
    const d = sfr[0].value - sfr[1].value;
    const { trend, periods } = lastN(sfr, 9, 2, dayLab);
    out["SOFR (Overnight Rate)"] = { value: `${sfr[0].value.toFixed(2)}%`, unit: "secured overnight", change: `${signed(d, 2)}pp`, note: "Floating-rate debt benchmark", tone: toneFor(d, false), trend, periods, live: true };
  }

  // SLOOS is the multifamily credit spigot (Layer 2). Positive = net tightening,
  // so higher is worse; zero is the neutral line, not a missing value.
  if (mls && mls.length >= 2) {
    const d = mls[0].value - mls[1].value;
    const lvl = mls[0].value;
    const tone = lvl > 5 ? "bear" : lvl < -5 ? "bull" : "neutral";
    const { trend, periods } = lastN(mls, 8, 1, quartLab);
    out["MF Lending Standards (SLOOS)"] = { value: `${lvl > 0 ? "+" : ""}${lvl.toFixed(1)}`, unit: "net % tightening", change: `${signed(d, 1)}pts QoQ`, note: "Fed survey — multifamily credit spigot", tone, trend, periods, live: true };
  }

  if (jo && jo.length >= 2) {
    const d = Math.round(jo[0].value - jo[1].value);
    const { trend, periods } = lastN(jo, 9, 0);
    out["Job Openings (JOLTS)"] = { value: `${Math.round(jo[0].value).toLocaleString()}K`, unit: "openings", change: `${d >= 0 ? "+" : ""}${d.toLocaleString()}K MoM`, note: "Labor demand, ahead of payrolls", tone: toneFor(d, true), trend, periods, live: true };
  }

  if (jq && jq.length >= 2) {
    const d = jq[0].value - jq[1].value;
    const { trend, periods } = lastN(jq, 9, 1);
    out["Quits Rate (JOLTS)"] = { value: `${jq[0].value.toFixed(1)}%`, unit: "of employment", change: Math.abs(d) < 0.05 ? "flat MoM" : `${signed(d, 1)}pts MoM`, note: "Worker confidence gauge", tone: toneFor(d, true), trend, periods, live: true };
  }


  // --- Freddie Mac AIMI (Layer 2) + for-sale throughput ---------------------
  if (aim && aim.length >= 2) {
    const d = aim[0].value - aim[1].value;
    const { trend, periods } = lastN(aim, 9, 1, quartLab);
    out["Apartment Investment Index (AIMI)"] = { value: aim[0].value.toFixed(1), unit: "Freddie Mac, index", change: `${signed(d, 1)} QoQ`, note: "Relative value of buying apartments today", tone: toneFor(d, true), trend, periods, live: true };
  }
  if (aimr && aimr.length >= 2) {
    const d = aimr[0].value - aimr[1].value;
    const { trend, periods } = lastN(aimr, 9, 1, quartLab);
    out["AIMI Rent Component"] = { value: aimr[0].value.toFixed(1), unit: "Freddie Mac, index", change: `${signed(d, 1)} QoQ`, note: "NOI growth inside AIMI", tone: toneFor(d, true), trend, periods, live: true };
  }
  if (aimv && aimv.length >= 2) {
    const d = aimv[0].value - aimv[1].value;
    const { trend, periods } = lastN(aimv, 9, 1, quartLab);
    out["AIMI Value Component"] = { value: aimv[0].value.toFixed(1), unit: "Freddie Mac, index", change: `${signed(d, 1)} QoQ`, note: "Property prices inside AIMI", tone: "neutral", trend, periods, live: true };
  }
  // FRED reports this in units (SAAR), not millions -- scale before formatting.
  if (ehs && ehs.length >= 2) {
    const m = ehs.map((o) => ({ date: o.date, value: o.value / 1e6 }));
    const d = m[0].value - m[1].value;
    const { trend, periods } = lastN(m, 9, 2);
    out["Existing Home Sales"] = { value: `${m[0].value.toFixed(2)}M`, unit: "annualized", change: `${signed(d, 2)}M MoM`, note: "For-sale market throughput", tone: toneFor(d, true), trend, periods, live: true };
  }

  // --- Census ACS (annual, 2010+) ------------------------------------------
  // Yearly cadence: label by year, and read change year-over-year, not MoM.
  if (rb && rb.length >= 2) {
    const d = rb[0].value - rb[1].value;
    const { trend, periods } = lastN(rb, 9, 1, yearLab);
    out["Rent Burden"] = { value: `${rb[0].value.toFixed(1)}%`, unit: "renters >30% of income", change: `${signed(d, 1)}pp YoY`, note: "Census ACS — affordability ceiling", tone: toneFor(d, false), trend, periods, live: true };
  }
  if (mgr && mgr.length >= 2) {
    const d = 100 * (mgr[0].value - mgr[1].value) / mgr[1].value;
    const { trend, periods } = lastN(mgr, 9, 0, yearLab);
    out["Median Gross Rent"] = { value: `$${Math.round(mgr[0].value).toLocaleString()}`, unit: "Census ACS, monthly", change: `${pct(d)} YoY`, note: "Rent incl. utilities, all renters", tone: "neutral", trend, periods, live: true };
  }
  if (mhi && mhi.length >= 2) {
    const d = 100 * (mhi[0].value - mhi[1].value) / mhi[1].value;
    const { trend, periods } = lastN(mhi, 9, 0, yearLab);
    out["Median Household Income"] = { value: `$${Math.round(mhi[0].value).toLocaleString()}`, unit: "Census ACS, annual", change: `${pct(d)} YoY`, note: "Affordability denominator", tone: toneFor(d, true), trend, periods, live: true };
  }
  if (mhv && mhv.length >= 2) {
    const d = 100 * (mhv[0].value - mhv[1].value) / mhv[1].value;
    const { trend, periods } = lastN(mhv, 9, 0, yearLab);
    out["Median Home Value"] = { value: `$${Math.round(mhv[0].value).toLocaleString()}`, unit: "Census ACS", change: `${pct(d)} YoY`, note: "Rent-vs-buy reference", tone: "neutral", trend, periods, live: true };
  }
  // Derived: rentership rate = renter-occupied / occupied. Neither raw count is
  // meaningful on its own; the ratio is the structural size of the renter pool.
  if (ro && ou && ro.length >= 2 && ou.length >= 2) {
    const byDate = new Map(ou.map((o) => [o.date, o.value]));
    const rate = ro
      .filter((o) => byDate.get(o.date) > 0)
      .map((o) => ({ date: o.date, value: (100 * o.value) / byDate.get(o.date) }));
    if (rate.length >= 2) {
      const d = rate[0].value - rate[1].value;
      const { trend, periods } = lastN(rate, 9, 1, yearLab);
      out["Rentership Rate"] = { value: `${rate[0].value.toFixed(1)}%`, unit: "of occupied units", change: `${signed(d, 1)}pp YoY`, note: "Census ACS — renter share of households", tone: toneFor(d, true), trend, periods, live: true };
    }
  }


  // Apartment lease-up velocity. Deliberately NOT the same series as
  // "Days On Market (For-Sale Homes)" (Realtor.com, homes) -- different market,
  // different construct. Kept side by side, never blended.
  if (atom && atom.length >= 2) {
    const d = atom[0].value - atom[1].value;
    const { trend, periods } = lastN(atom, 9, 1);
    out["Days to Lease (Apartments)"] = { value: `${Math.round(atom[0].value)}`, unit: "median days", change: `${signed(d, 1)} days MoM`, note: "Apartment List — how long a UNIT sits before lease", tone: toneFor(d, false), trend, periods, live: true };
  }

  return out;
}
