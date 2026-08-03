export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

// Every rankable factor is keyed by CBSA, so the whole metro universe joins on
// regions.code. higher=true means a bigger value ranks higher; false flips it.
const FACTORS = {
  job_growth:     { slug: "bls_metro_employment",  yoy: true,  higher: true,  label: "Job Growth",             source: "BLS",            lead: true },
  wage_growth:    { slug: "metro_wages",            yoy: true,  higher: true,  label: "Wage Growth",            source: "BLS QCEW" },
  rent_growth:    { slug: "apt_rent_estimate",      yoy: true,  higher: true,  label: "Rent Growth",            source: "Apartment List" },
  vacancy:        { slug: "apt_vacancy",            yoy: false, higher: false, label: "Vacancy",                source: "Apartment List" },
  unemployment:   { slug: "bls_metro_unemployment", yoy: false, higher: false, label: "Unemployment",           source: "BLS LAUS" },
  affordability:  { slug: "bea_rpp_rents",          yoy: false, higher: false, label: "Affordability",          source: "BEA RPP" },
  aimi:           { slug: "aimi",                   yoy: false, higher: true,  label: "Investment Index (AIMI)", source: "Freddie Mac",   lead: true },
  time_on_market: { slug: "apt_time_on_market",     yoy: false, higher: false, label: "Time on Market",         source: "Apartment List" },
  supply_pressure:{ slug: "permits_5plus_metro",    yoy: false, higher: false, label: "Supply Pressure",        source: "Census BPS / ACS", lead: true, normalizeBy: "acs_mf_units_5plus" },
};

// Latest reading per metro for one factor -> { asOf, map{cbsa: value} }.
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
      map[key] = Math.round((Number(r.yoy_change) / prior) * 1000) / 10;
    } else {
      map[key] = Math.round(v * 100) / 100;
    }
    if (!asOf) asOf = r.obs_date;
  }
  return { asOf, map };
}

function pct(val, pop, higher) {
  if (val == null || !pop.length) return null;
  const below = pop.filter((x) => (higher ? x < val : x > val)).length;
  return Math.round((below / pop.length) * 100);
}

// One factor's metro map. For factors with `normalizeBy`, divide the base
// series by a denominator series (e.g. new permits per 1,000 existing 5+ units)
// so the value is comparable across metros of any size.
async function factorSection(k) {
  const f = FACTORS[k];
  const base = await crossSection(f.slug, { yoy: f.yoy });
  if (!f.normalizeBy) return base;
  const denom = await crossSection(f.normalizeBy);
  const map = {};
  for (const c of Object.keys(base.map)) {
    const d = denom.map[c];
    if (d && d > 0) map[c] = Math.round((base.map[c] / d) * 1000 * 10) / 10; // per 1,000 units
  }
  return { asOf: base.asOf, map };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let keys = (searchParams.get("factors") || "").split(",").map((s) => s.trim()).filter((k) => FACTORS[k]);
  if (!keys.length) keys = ["job_growth", "rent_growth", "vacancy"];
  const rawW = (searchParams.get("weights") || "").split(",").map((s) => Number(s.trim()));
  let weights = keys.map((_, i) => (Number.isFinite(rawW[i]) && rawW[i] > 0 ? rawW[i] : 1));
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  weights = weights.map((w) => w / sumW);

  const mode = searchParams.get("mode") === "watchlist" ? "watchlist" : "universe";
  const topN = Math.min(Math.max(Number(searchParams.get("topN")) || 25, 1), 100);
  const wlCbsas = (searchParams.get("cbsas") || "").split(",").map((s) => s.trim()).filter(Boolean);

  try {
    const sections = await Promise.all(keys.map((k) => factorSection(k)));

    // Eligible universe: metros with a meaningful multifamily base. Excludes
    // micro-metros (e.g. zero-development markets that authorize no new 5+ units)
    // which would otherwise tie at the top of supply-side factors and distort
    // every factor's percentile. Percentiles are computed against this set so
    // real markets rank against real markets.
    const MIN_MF_STOCK = 20000;
    const stock = await crossSection("acs_mf_units_5plus");
    const eligible = new Set(Object.keys(stock.map).filter((c) => stock.map[c] >= MIN_MF_STOCK));

    const pops = sections.map((s) => Object.entries(s.map).filter(([c]) => eligible.has(c)).map(([, v]) => v));

    let candidates;
    if (mode === "watchlist") {
      candidates = wlCbsas;
    } else {
      candidates = Object.keys(sections[0].map).filter((c) => eligible.has(c) && sections.every((s) => s.map[c] !== undefined));
    }

    const scored = candidates.map((c) => {
      const factors = [];
      let num = 0, den = 0;
      keys.forEach((k, i) => {
        const f = FACTORS[k];
        const v = sections[i].map[c];
        if (v === undefined) { factors.push({ key: k, label: f.label, value: null, pct: null, source: f.source, lead: !!f.lead }); return; }
        const p = pct(v, pops[i], f.higher);
        num += weights[i] * p; den += weights[i];
        factors.push({ key: k, label: f.label, value: v, pct: p, source: f.source, lead: !!f.lead, yoy: f.yoy });
      });
      const score = den ? Math.round(num / den) : null;
      return { cbsa: c, score, scoreTone: score == null ? "neutral" : score >= 70 ? "bull" : score >= 45 ? "neutral" : "bear", factors };
    }).filter((m) => m.score != null);

    scored.sort((a, b) => b.score - a.score);
    const out = mode === "watchlist" ? scored : scored.slice(0, topN);

    const codes = out.map((m) => m.cbsa);
    if (codes.length) {
      const regs = await sb(`regions?region_type=eq.metro&code=in.(${codes.join(",")})&select=code,name`);
      const nameMap = {};
      for (const r of regs || []) nameMap[r.code] = r.name;
      out.forEach((m, i) => { m.rank = i + 1; m.name = nameMap[m.cbsa] || m.cbsa; });
    }

    return Response.json({
      mode,
      weights: keys.map((k, i) => ({ key: k, label: FACTORS[k].label, pct: Math.round(weights[i] * 100), source: FACTORS[k].source, lead: !!FACTORS[k].lead })),
      eligible: scored.length,
      universe: pops[0]?.length || 0,
      asOf: Object.fromEntries(keys.map((k, i) => [k, sections[i].asOf])),
      results: out,
    });
  } catch {
    return Response.json({ results: [], error: "Ranking unavailable." }, { status: 502 });
  }
}
