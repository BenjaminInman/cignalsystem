// GSE multifamily delinquency signals for the /indices Lenders tiles.
//
// FNMA and FMCC trade OTC, outside the NMS EOD feed that drives the price
// donuts, so on /indices they're surfaced as their multifamily serious
// delinquency rate instead of a stock quote -- a genuine credit signal for a
// multifamily platform, sourced free from public GSE monthly filings.
//
// Returns latest value + prior value (for a MoM delta) per slug. Tone is
// inverted vs a price donut: a FALLING delinquency rate is good (green).

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const runtime = "nodejs";
export const revalidate = 3600;

// Delinquency (monthly) and new business volume (quarterly) are separate
// constructs -- how the book is holding up vs how much they're lending -- so
// they're served as distinct series and never blended. Cadences differ by
// design; each carries its own asOf.
const SLUGS = [
  "fnma_mf_delinquency",
  "fmcc_mf_delinquency",
  "fnma_mf_volume",
  "fmcc_mf_volume",
];

async function latestTwo(slug) {
  const url =
    `${SB_URL}/rest/v1/v_indicator_analytics` +
    `?slug=eq.${slug}&region_type=eq.national&select=obs_date,value` +
    `&order=obs_date.desc&limit=2`;
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    next: { revalidate },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  const value = parseFloat(rows[0].value);
  const prior = rows[1] != null ? parseFloat(rows[1].value) : null;
  const delta = prior != null ? value - prior : null; // percentage points
  return { value, prior, delta, asOf: rows[0].obs_date };
}

export async function GET() {
  if (!SB_URL || !SB_KEY) {
    return Response.json({ signals: {}, degraded: true }, { status: 200 });
  }
  const signals = {};
  await Promise.all(
    SLUGS.map(async (slug) => {
      try {
        const d = await latestTwo(slug);
        if (d) signals[slug] = d;
      } catch {
        /* leave slug absent */
      }
    })
  );
  return Response.json({ signals });
}
