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

export async function GET() {
  try {
    const latest = await sb(`v_indicator_analytics?slug=eq.zori_metro&select=obs_date&order=obs_date.desc&limit=1`);
    if (!latest?.length) return Response.json({ asOf: null, growth: {} });
    const d = latest[0].obs_date;
    const rows = await sb(`v_indicator_analytics?slug=eq.zori_metro&obs_date=eq.${d}&select=region_code,value,yoy_change`);
    const growth = {};
    for (const r of rows || []) {
      if (r.yoy_change == null) continue;
      const prior = r.value - r.yoy_change;
      if (prior) growth[r.region_code] = Math.round((r.yoy_change / prior) * 1000) / 10;
    }
    return Response.json({ asOf: d, growth });
  } catch {
    return Response.json({ asOf: null, growth: {} });
  }
}
