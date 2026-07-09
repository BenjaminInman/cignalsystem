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

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Compact axis label for a trend point. Annual series -> "2024"; monthly -> "May '25".
function periodLabel(dateStr, annual) {
  const s = String(dateStr);
  const y = s.slice(0, 4);
  if (annual) return y;
  const m = Number(s.slice(5, 7)) - 1;
  return `${MON[m] || ""} '${y.slice(2)}`;
}

// Latest reading + history for a metro indicator, keyed by CBSA (Census metro
// region_code). Returns { value, yoyPct, delta, asOf, trend, periods } — trend
// is the underlying series oldest->newest so the row can chart it like Layer 2/3.
async function metroSignal(slug, cbsa, { annual = false, points = 24 } = {}) {
  const rows = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_code=eq.${cbsa}` +
      `&select=obs_date,value,yoy_change&order=obs_date.desc&limit=${points}`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const v = Number(rows[0].value);
  const yoyAbs = rows[0].yoy_change;
  const prior = yoyAbs != null ? v - Number(yoyAbs) : null;
  const yoyPct = prior && prior !== 0 ? Math.round((yoyAbs / prior) * 1000) / 10 : null;
  const delta = rows.length > 1 ? Math.round((v - Number(rows[1].value)) * 100) / 100 : null;
  const series = rows.slice().reverse(); // oldest -> newest
  const trend = series.map((r) => Math.round(Number(r.value) * 10) / 10);
  const periods = series.map((r) => periodLabel(r.obs_date, annual));
  return { value: v, yoyPct, delta, asOf: rows[0].obs_date, trend, periods };
}

// County real GDP (BEA CAGDP9), keyed by the Zillow-style county label that the
// county region_code carries (e.g. "Harris County, TX"). A ZIP sits in exactly
// one county, so this resolves from the ZIP's county; metro-only lookups span
// multiple counties and return null. Returns latest level + YoY %.
async function countyGdpSignal(countyLabel) {
  if (!countyLabel) return null;
  const enc = encodeURIComponent(countyLabel);
  const rows = await sb(
    `v_indicator_analytics?slug=eq.gdp_county&region_code=eq.${enc}` +
      `&select=obs_date,value,yoy_change&order=obs_date.desc&limit=12`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const v = Number(rows[0].value);
  const yoyAbs = rows[0].yoy_change;
  const prior = yoyAbs != null ? v - Number(yoyAbs) : null;
  const yoyPct = prior && prior !== 0 ? Math.round((yoyAbs / prior) * 1000) / 10 : null;
  const series = rows.slice().reverse();
  const trend = series.map((r) => Math.round(Number(r.value) / 1e3)); // $M for a compact axis
  const periods = series.map((r) => periodLabel(r.obs_date, true));
  return { value: v, yoyPct, asOf: rows[0].obs_date, countyLabel, trend, periods };
}

// IRS SOI migration signals for a metro, looked up by Zillow "City, ST" code
// (bridged from CBSA via cbsa_zillow_xwalk). Returns the in-migrant AGI number,
// net domestic migration, and the 6-year AGI-differential trend.
async function irsMigration(code) {
  const enc = encodeURIComponent(code);
  const [agiRows, netRows, diffRows] = await Promise.all([
    sb(`v_indicator_analytics?slug=eq.irs_inflow_agi&region_code=eq.${enc}&select=obs_date,value&order=obs_date.desc&limit=1`),
    sb(`v_indicator_analytics?slug=eq.irs_net_migration&region_code=eq.${enc}&select=value&order=obs_date.desc&limit=1`),
    sb(`v_indicator_analytics?slug=eq.irs_agi_differential&region_code=eq.${enc}&select=obs_date,value&order=obs_date.asc`),
  ]);
  if (!agiRows?.length && !diffRows?.length) return null;
  const diffTrend = (diffRows || []).map((r) => ({ y: Number(String(r.obs_date).slice(0, 4)), v: Math.round(Number(r.value)) }));
  return {
    inAgi: agiRows?.[0] ? Math.round(Number(agiRows[0].value)) : null,
    inAgiYear: agiRows?.[0] ? Number(String(agiRows[0].obs_date).slice(0, 4)) : null,
    net: netRows?.[0] ? Math.round(Number(netRows[0].value)) : null,
    diff: diffTrend.length ? diffTrend[diffTrend.length - 1].v : null,
    diffTrend,
  };
}

// Metro ZORDI (Zillow rental-market tightness), keyed by the Zillow "City, ST" code.
// The index has no natural zero or fixed scale, so an absolute level is not
// interpretable on its own. We attach the cross-sectional percentile among all
// metros for the same month (v_zordi_metro_rank), which is a pure descriptive rank:
// "13 = 13th percentile of 840 metros" means something; "13" alone does not.
async function zordiSignal(zillowCode) {
  if (!zillowCode) return null;
  const enc = encodeURIComponent(zillowCode);
  const rows = await sb(
    `v_indicator_analytics?slug=eq.zordi_metro&region_code=eq.${enc}` +
      `&select=obs_date,value,yoy_change&order=obs_date.desc&limit=24`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const v = Number(rows[0].value);
  const yoyAbs = rows[0].yoy_change != null ? Number(rows[0].yoy_change) : null;
  const rank = await sb(
    `v_zordi_metro_rank?region_code=eq.${enc}&select=pct_rank,n_metros&limit=1`
  );
  const pctRank = rank?.[0]?.pct_rank ?? null;
  const nMetros = rank?.[0]?.n_metros ?? null;
  const series = rows.slice().reverse();
  return {
    value: v,
    yoyAbs,
    pctRank,
    nMetros,
    asOf: rows[0].obs_date,
    trend: series.map((r) => Math.round(Number(r.value) * 10) / 10),
    periods: series.map((r) => periodLabel(r.obs_date, false)),
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const zip = (searchParams.get("zip") || "").trim();
  const metro = (searchParams.get("metro") || "").trim(); // Zillow "City, ST" (or sub-metro city/county)
  let cbsa = (searchParams.get("cbsa") || "").trim();
  try {
    // resolve a metro handle (from a City/Metro/County lookup) to a CBSA
    if (!cbsa && metro) {
      const enc = encodeURIComponent(metro);
      let xr = await sb(`cbsa_zillow_xwalk?zillow_code=eq.${enc}&select=cbsa&limit=1`);
      if (!xr?.length) {
        // sub-metro city/county -> find its parent metro, then bridge
        let ml = (await sb(`zip_crosswalk?city_label=eq.${enc}&select=metro_label&limit=1`))?.[0]?.metro_label;
        if (!ml) ml = (await sb(`zip_crosswalk?county_label=eq.${enc}&select=metro_label&limit=1`))?.[0]?.metro_label;
        if (ml) xr = await sb(`cbsa_zillow_xwalk?zillow_code=eq.${encodeURIComponent(ml)}&select=cbsa&limit=1`);
      }
      cbsa = xr?.[0]?.cbsa || "";
    }
    if (!cbsa) {
      if (!/^\d{5}$/.test(zip)) return Response.json({ found: false });
      const xw = await sb(
        `zip_cbsa_crosswalk?zip=eq.${zip}&select=cbsa,res_ratio&order=res_ratio.desc&limit=1`
      );
      cbsa = xw?.[0]?.cbsa;
    }
    if (!cbsa) return Response.json({ found: false, zip });

    const reg = await sb(`regions?code=eq.${cbsa}&region_type=eq.metro&select=name&limit=1`);
    const metroName = reg?.[0]?.name || null;

    // Resolve the county the lookup sits in (GDP is county-grain). A ZIP maps to
    // one county via the crosswalk; a direct county search carries it already.
    let countyLabel = null;
    if (/^\d{5}$/.test(zip)) {
      countyLabel = (await sb(`zip_crosswalk?zip=eq.${zip}&select=county_label&limit=1`))?.[0]?.county_label || null;
    } else if (metro) {
      const cr = await sb(`regions?name=eq.${encodeURIComponent(metro)}&region_type=eq.county&select=name&limit=1`);
      countyLabel = cr?.[0]?.name || null;
    }

    // bridge CBSA -> Zillow "City, ST" so we can attach IRS migration signals
    const xw = await sb(`cbsa_zillow_xwalk?cbsa=eq.${cbsa}&select=zillow_code&limit=1`);
    const zillowCode = xw?.[0]?.zillow_code || null;
    const migration = zillowCode ? await irsMigration(zillowCode) : null;

    const [employment, unemployment, rentsRPP, allRPP, cpiRent, vacancy, daysOnMarket, countyGdp] =
      await Promise.all([
        metroSignal("bls_metro_employment", cbsa),
        metroSignal("bls_metro_unemployment", cbsa),
        metroSignal("bea_rpp_rents", cbsa, { annual: true, points: 10 }),
        metroSignal("bea_rpp_all", cbsa, { annual: true, points: 10 }),
        metroSignal("bls_metro_cpi_rent", cbsa),
        metroSignal("apt_vacancy", cbsa),
        metroSignal("apt_time_on_market", cbsa),
        countyGdpSignal(countyLabel),
      ]);

    const zordi = await zordiSignal(zillowCode);

    const signals = { employment, unemployment, rentsRPP, allRPP, cpiRent, vacancy, daysOnMarket, countyGdp, zordi };
    const any = Object.values(signals).some(Boolean);
    return Response.json({ found: any || !!migration, cbsa, metroName, countyName: countyLabel, signals, migration });
  } catch {
    return Response.json({ found: false, zip, error: "Lookup failed." }, { status: 502 });
  }
}
