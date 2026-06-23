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

// ZIP-level demographics from the Census ACS layer (latest vintage loaded).
// Reads observations directly (these point-in-time snapshots are kept out of
// the analytics materialized view), pivoted by v_zip_demographics.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const zip = (searchParams.get("zip") || "").trim();
  if (!/^\d{5}$/.test(zip)) {
    return Response.json({ found: false, error: "Enter a 5-digit ZIP." }, { status: 400 });
  }
  try {
    const rows = await sb(`v_zip_demographics?zip=eq.${zip}&order=as_of.desc&limit=1`);
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ found: false, zip });
    }
    const d = rows[0];
    const n = (v) => (v == null ? null : Number(v));
    const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
    return Response.json({
      found: true,
      zip,
      asOf: d.as_of,
      source: "Census ACS 5-Year",
      medianRent: n(d.median_rent),
      medianContractRent: n(d.median_contract_rent),
      medianIncome: n(d.median_income),
      rentBurden: n(d.rent_burden),
      renterShare: pct(Number(d.renter_occupied), Number(d.occupied_units)),
      mfStockShare: pct(Number(d.mf_units_5plus), Number(d.housing_units)),
      medianHomeValue: n(d.median_home_value),
      occupiedUnits: n(d.occupied_units),
      housingUnits: n(d.housing_units),
    });
  } catch {
    return Response.json({ found: false, zip, error: "Lookup failed." }, { status: 502 });
  }
}
