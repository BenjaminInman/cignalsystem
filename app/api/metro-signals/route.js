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
    return Response.json({ found: any, cbsa, metroName, signals });
  } catch {
    return Response.json({ found: false, zip, error: "Lookup failed." }, { status: 502 });
  }
}
