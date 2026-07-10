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
//
// Rent basis: we surface CONTRACT rent (ACS B25058) as the headline, not gross
// rent (B25064). Contract rent is the rent line on a property income statement;
// gross rent folds in tenant-paid utilities, which operators account for
// separately (RUBS, utility reimbursement, direct-billed). Gross is still
// returned so the utility load is derivable and so the rent-burden footnote can
// state its own basis honestly -- Census computes burden (B25071) on GROSS rent,
// and there is no contract-rent equivalent published, so that number cannot be
// restated on a contract basis without fabricating it.
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
      medianContractRent: n(d.median_contract_rent),   // headline: excludes utilities
      medianGrossRent: n(d.median_rent),                // contract + tenant-paid utilities
      utilityLoad:
        d.median_rent != null && d.median_contract_rent != null
          ? Number(d.median_rent) - Number(d.median_contract_rent)
          : null,
      medianIncome: n(d.median_income),
      incomeBasis: "median household income (ACS B19013)",
      rentBurden: n(d.rent_burden),
      rentBurdenBasis: "gross",                         // Census B25071 is gross-rent based
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
