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

// Latest reading for a metro indicator, keyed by CBSA (Census metro region_code).
// Returns { value, yoyPct, delta, asOf } — yoyPct from the view's yoy_change,
// delta = month-over-month change (for level series like unemployment).
async function metroSignal(slug, cbsa) {
  const rows = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_code=eq.${cbsa}` +
      `&select=obs_date,value,yoy_change&order=obs_date.desc&limit=2`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const v = Number(rows[0].value);
  const yoyAbs = rows[0].yoy_change;
  const prior = yoyAbs != null ? v - Number(yoyAbs) : null;
  const yoyPct = prior && prior !== 0 ? Math.round((yoyAbs / prior) * 1000) / 10 : null;
  const delta = rows.length > 1 ? Math.round((v - Number(rows[1].value)) * 100) / 100 : null;
  return { value: v, yoyPct, delta, asOf: rows[0].obs_date };
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

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const zip = (searchParams.get("zip") || "").trim();
  let cbsa = (searchParams.get("cbsa") || "").trim();
  try {
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

    // bridge CBSA -> Zillow "City, ST" so we can attach IRS migration signals
    const xw = await sb(`cbsa_zillow_xwalk?cbsa=eq.${cbsa}&select=zillow_code&limit=1`);
    const zillowCode = xw?.[0]?.zillow_code || null;
    const migration = zillowCode ? await irsMigration(zillowCode) : null;

    const [employment, unemployment, rentsRPP, allRPP, cpiRent, vacancy, daysOnMarket] =
      await Promise.all([
        metroSignal("bls_metro_employment", cbsa),
        metroSignal("bls_metro_unemployment", cbsa),
        metroSignal("bea_rpp_rents", cbsa),
        metroSignal("bea_rpp_all", cbsa),
        metroSignal("bls_metro_cpi_rent", cbsa),
        metroSignal("apt_vacancy", cbsa),
        metroSignal("apt_time_on_market", cbsa),
      ]);

    const signals = { employment, unemployment, rentsRPP, allRPP, cpiRent, vacancy, daysOnMarket };
    const any = Object.values(signals).some(Boolean);
    return Response.json({ found: any || !!migration, cbsa, metroName, signals, migration });
  } catch {
    return Response.json({ found: false, zip, error: "Lookup failed." }, { status: 502 });
  }
}
