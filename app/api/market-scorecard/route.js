export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verticalFromRequest } from "@/lib/vertical-request";
import { rentMetroSlug } from "@/lib/vertical-signals";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

// Latest reading PER METRO (data arrives staggered, so a single global-latest
// date misses most metros). Pull recent rows newest-first and keep the first
// row seen for each region_code. Returns { asOf, map } where map[key] = metric.
// key is region_code (CBSA for BLS/BEA/AptList; "City, ST" for Zillow ZORI).
async function crossSection(slug, { yoy = false } = {}) {
  const rows = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_type=eq.metro` +
      `&select=region_code,obs_date,value,yoy_change&order=obs_date.desc&limit=1000`
  );
  const map = {};
  let asOf = null;
  for (const r of rows || []) {
    const key = r.region_code;
    if (key == null || map[key] !== undefined) continue;
    const v = Number(r.value);
    if (yoy) {
      if (r.yoy_change == null) continue;
      const prior = v - Number(r.yoy_change);
      if (!prior) continue;
      map[key] = Math.round((Number(r.yoy_change) / prior) * 1000) / 10; // YoY %
    } else {
      map[key] = Math.round(v * 100) / 100;
    }
    if (!asOf) asOf = r.obs_date;
  }
  return { asOf, map };
}

// Percentile rank (0–100) of `val` within the population. higherBetter=false
// flips it (vacancy, unemployment — lower ranks higher).
function pct(val, pop, higherBetter = true) {
  if (val == null || !pop.length) return null;
  const below = pop.filter((x) => (higherBetter ? x < val : x > val)).length;
  return Math.round((below / pop.length) * 100);
}

// Box-level extras for a small set of CBSAs (latest per metro), one query each.
async function extras(slug, cbsas, { yoy = false } = {}) {
  if (!cbsas.length) return {};
  const inList = `(${cbsas.join(",")})`;
  const rows = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_code=in.${inList}` +
      `&select=region_code,obs_date,value,yoy_change&order=obs_date.desc&limit=600`
  );
  const out = {};
  for (const r of rows || []) {
    if (out[r.region_code]) continue;
    const v = Number(r.value);
    let yoyPct = null;
    if (yoy && r.yoy_change != null) {
      const prior = v - Number(r.yoy_change);
      yoyPct = prior ? Math.round((Number(r.yoy_change) / prior) * 1000) / 10 : null;
    }
    out[r.region_code] = { value: Math.round(v * 100) / 100, yoyPct, asOf: r.obs_date };
  }
  return out;
}

// Weighted national-percentile score. Employment (the only leading metro signal
// carried) is double-weighted; weights of any missing signal are redistributed.
function compositeScore(parts) {
  const W = { emp: 0.35, rent: 0.25, vac: 0.2, unemp: 0.2 };
  let num = 0, den = 0;
  for (const k of Object.keys(W)) {
    if (parts[k] != null) { num += W[k] * parts[k]; den += W[k]; }
  }
  return den ? Math.round(num / den) : null;
}

// Level + YoY per metro (latest), keyed by region_code. For ZHVI (name-keyed).
async function crossSectionFull(slug) {
  const rows = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_type=eq.metro` +
      `&select=region_code,obs_date,value,yoy_change&order=obs_date.desc&limit=1000`
  );
  const map = {};
  for (const r of rows || []) {
    const k = r.region_code;
    if (k == null || map[k] !== undefined) continue;
    const v = Number(r.value);
    let yoyPct = null;
    if (r.yoy_change != null) {
      const prior = v - Number(r.yoy_change);
      yoyPct = prior ? Math.round((Number(r.yoy_change) / prior) * 1000) / 10 : null;
    }
    map[k] = { value: Math.round(v), yoyPct };
  }
  return map;
}

// Last two annual permit prints per CBSA -> latest + YoY delta (supply trend).
async function permitsTrend(cbsas) {
  if (!cbsas.length) return {};
  const rows = await sb(
    `v_indicator_analytics?slug=eq.permits_5plus_metro&region_code=in.(${cbsas.join(",")})` +
      `&select=region_code,obs_date,value&order=obs_date.desc&limit=600`
  );
  const byC = {};
  for (const r of rows || []) (byC[r.region_code] ||= []).push(r);
  const out = {};
  for (const c of Object.keys(byC)) {
    const arr = byC[c];
    const lv = Number(arr[0].value);
    const pv = arr[1] ? Number(arr[1].value) : null;
    out[c] = { v: lv, year: String(arr[0].obs_date).slice(0, 4), deltaPct: pv ? Math.round(((lv - pv) / pv) * 1000) / 10 : null };
  }
  return out;
}

export async function GET(req) {
  const RENT = rentMetroSlug(verticalFromRequest(req));
  const { searchParams } = new URL(req.url);
  const cbsas = (searchParams.get("cbsas") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const names = (searchParams.get("names") || "").split("|").map((s) => s.trim());
  try {
    const [emp, rent, vac, unemp, rpp, aimi, zhvi, permits] = await Promise.all([
      crossSection("bls_metro_employment", { yoy: true }), // leading, by CBSA
      crossSection(RENT, { yoy: true }),                    // Zillow rent (MF-only on multifamily), by NAME
      crossSection("apt_vacancy"),                          // Apartment List, by CBSA
      crossSection("bls_metro_unemployment"),               // BLS LAUS, by CBSA
      extras("bea_rpp_rents", cbsas),                       // affordability (box)
      extras("aimi", cbsas, { yoy: true }),                 // Freddie Mac (box, ~24 metros)
      crossSectionFull("zhvi_metro"),                       // home values, by NAME (box)
      permitsTrend(cbsas),                                  // MF supply pipeline, by CBSA (box)
    ]);

    const empPop = Object.values(emp.map);
    const rentPop = Object.values(rent.map);
    const vacPop = Object.values(vac.map);
    const unempPop = Object.values(unemp.map);

    const markets = {};
    cbsas.forEach((c, i) => {
      const nm = names[i] || "";
      const empV = emp.map[c], rentV = rent.map[nm], vacV = vac.map[c], unempV = unemp.map[c];
      const empPct = pct(empV, empPop, true);
      const rentPct = pct(rentV, rentPop, true);
      const vacPct = pct(vacV, vacPop, false);
      const unempPct = pct(unempV, unempPop, false);
      const score = compositeScore({ emp: empPct, rent: rentPct, vac: vacPct, unemp: unempPct });

      markets[c] = {
        score,
        scoreTone: score == null ? "neutral" : score >= 70 ? "bull" : score >= 45 ? "neutral" : "bear",
        cols: {
          rent: rentV == null ? null : { v: rentV, pct: rentPct, src: "Zillow ZORI" },
          employment: empV == null ? null : { v: empV, pct: empPct, src: "BLS", lead: true },
          vacancy: vacV == null ? null : { v: vacV, pct: vacPct, src: "Apartment List" },
          unemployment: unempV == null ? null : { v: unempV, pct: unempPct, src: "BLS LAUS" },
        },
        box: {
          rppRents: rpp[c] ? { v: rpp[c].value, src: "BEA RPP", asOf: rpp[c].asOf } : null,
          aimi: aimi[c] ? { v: aimi[c].value, yoyPct: aimi[c].yoyPct, src: "Freddie Mac AIMI", lead: true, asOf: aimi[c].asOf } : null,
          homeValue: zhvi[nm] ? { v: zhvi[nm].value, yoyPct: zhvi[nm].yoyPct, src: "Zillow ZHVI" } : null,
          permits: permits[c] ? { v: permits[c].v, year: permits[c].year, deltaPct: permits[c].deltaPct, src: "Census BPS", lead: true } : null,
        },
      };
    });

    return Response.json({
      asOf: { employment: emp.asOf, rent: rent.asOf, vacancy: vac.asOf, unemployment: unemp.asOf },
      population: { metros: empPop.length },
      markets,
    });
  } catch {
    return Response.json({ markets: {}, error: "Scorecard unavailable." }, { status: 502 });
  }
}
