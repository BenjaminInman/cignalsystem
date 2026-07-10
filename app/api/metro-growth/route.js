export const runtime = "nodejs";
export const dynamic = "force-dynamic";


// Rent series: the multifamily vertical reads Zillow's multifamily-only ZORI cut.
// Blending single-family rentals dilutes the apartment signal, and dilutes it most
// in the oversupplied Sun Belt metros (Austin: -2.4% blended vs -3.4% MF-only).
// This route is cached (ISR), so it does not read request headers to detect the
// vertical; it pins to the default. Revisit when the general-real-estate vertical
// needs the blended cut here.
import { DEFAULT_VERTICAL } from "@/lib/vertical-slug";
import { rentMetroSlug } from "@/lib/vertical-signals";

const RENT = rentMetroSlug(DEFAULT_VERTICAL);

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
    const latest = await sb(`v_indicator_analytics?slug=eq.${RENT}&select=obs_date&order=obs_date.desc&limit=1`);
    if (!latest?.length) return Response.json({ asOf: null, growth: {} });
    const d = latest[0].obs_date;
    const rows = await sb(`v_indicator_analytics?slug=eq.${RENT}&obs_date=eq.${d}&select=region_code,value,yoy_change`);
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
