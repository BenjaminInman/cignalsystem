export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

function monthLabel(d) {
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(" ", " '");
}

export async function GET(req) {
  const zip = (new URL(req.url).searchParams.get("zip") || "").trim();
  if (!/^\d{5}$/.test(zip)) return Response.json({ error: "Enter a valid 5-digit ZIP code." }, { status: 400 });

  // 1) resolve the ZIP region
  const regions = await sb(`regions?region_type=eq.zip&code=eq.${zip}&select=id,code,name&limit=1`);
  if (!Array.isArray(regions) || regions.length === 0)
    return Response.json({ found: false, zip });
  const region = regions[0];

  // 2) pull ZORI rent history for this ZIP (newest first)
  const rows = await sb(
    `v_indicator_analytics?slug=eq.zori_zip&region_id=eq.${region.id}&order=obs_date.desc&limit=13&select=obs_date,value,yoy_change`
  );
  if (!Array.isArray(rows) || rows.length === 0)
    return Response.json({ found: true, zip, rent: null });

  const latest = rows[0];
  const value = Number(latest.value);
  const yoyAbs = latest.yoy_change == null ? null : Number(latest.yoy_change);
  const yearAgo = yoyAbs == null ? null : value - yoyAbs;
  const yoyPct = yearAgo && yearAgo !== 0 ? (yoyAbs / yearAgo) * 100 : null;

  const ordered = [...rows].reverse(); // oldest -> newest for the trend line
  return Response.json({
    found: true,
    zip,
    rent: Math.round(value),
    yoyPct: yoyPct == null ? null : Math.round(yoyPct * 10) / 10,
    asOf: monthLabel(latest.obs_date),
    trend: ordered.map((r) => Number(r.value)),
    periods: ordered.map((r) => monthLabel(r.obs_date)),
  });
}
