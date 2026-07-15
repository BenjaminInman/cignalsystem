export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opportunity Zone 2.0 eligibility lookup.
//
// Returns Cignal-computed OZ 2.0 Low-Income Community eligibility at census-tract
// grain, rolled up to a county or metro. This is NOT the official Treasury list:
// Treasury sets the final dataset and ACS vintage, and governors nominate up to 25%
// of eligible tracts. Designations take effect 2027-01-01; OZ 1.0 sunsets 2028-12-31.
//
// The edge is that this is computable BEFORE nominations are announced — the
// eligible universe is knowable now, and only a quarter of it will be designated.
//
// Query one of:
//   ?cbsa=34980        metro rollup + tract list
//   ?county=47149      county rollup + tract list
//   ?tract=47149041900 single tract

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// OZ 2.0 statutory thresholds — surfaced so the UI never hardcodes them.
const RULE = {
  incomeThreshold: 70,   // MFI <= 70% of area median  -> eligible
  povertyThreshold: 20,  // poverty >= 20% ...
  povertyMfiCap: 125,    // ... provided MFI < 125% of area median
  nominationShare: 25,   // governors may nominate up to 25% of eligible tracts
  effective: "2027-01-01",
  oz1Sunset: "2028-12-31",
  vintage: "ACS 2019-2023 5-year",
};

// LIHTC designations (HUD, redesignated annually, 2026 lists effective 2026-01-01).
// QCT and DDA are a different program from OZ: they grant a 30% basis boost to
// affordable-housing developers, where OZ grants capital-gains treatment to
// investors. A tract can carry both — 12,773 nationally do.
const LIHTC_RULE = {
  basisBoost: 30,
  qctTest: "\u226550% of households below 60% AMGI, or poverty \u226525%",
  ddaTest: "high land/construction/utility costs relative to AMGI",
  effective: "2026-01-01",
  popCap: 20,
};

async function sb(path) {
  if (!SUPA || !KEY) return null;
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 86400 }, // annual data; a day of cache is generous
  });
  if (!r.ok) return null;
  return r.json();
}

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const cbsa = q.get("cbsa");
  const county = q.get("county");
  const tract = q.get("tract");

  let filter = null, scope = null;
  if (tract) { filter = `tract_fips=eq.${encodeURIComponent(tract)}`; scope = { kind: "tract", code: tract }; }
  else if (county) { filter = `county_fips=eq.${encodeURIComponent(county)}`; scope = { kind: "county", code: county }; }
  else if (cbsa) { filter = `cbsa_code=eq.${encodeURIComponent(cbsa)}`; scope = { kind: "metro", code: cbsa }; }
  else {
    return Response.json({ error: "pass one of ?cbsa= ?county= ?tract=" }, { status: 400 });
  }

  // Always region-filtered — an unfiltered scan of 84k tracts trips the anon timeout.
  const rows = await sb(
    `v_oz_tracts?${filter}&select=tract_fips,tract_name,cbsa_code,county_fips,eligible,mfi_pct_of_area,poverty_rate,qualifying_path&order=mfi_pct_of_area.asc&limit=2000`
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ found: false, scope, rule: RULE });
  }

  const eligible = rows.filter((r) => r.eligible === 1);
  const byPath = { income: 0, poverty: 0 };
  for (const r of eligible) if (r.qualifying_path) byPath[r.qualifying_path]++;

  // County-grain capital context: HMDA credit flow + non-metro DDA status.
  // Only meaningful when the scope IS a county (a metro spans many).
  let capital = null;
  if (scope.kind === "county") {
    const c = await sb(`v_county_capital?county_fips=eq.${encodeURIComponent(scope.code)}&select=*&limit=1`);
    if (c?.[0]) {
      const x = c[0];
      capital = {
        denialRate: x.denial_rate,          // null when suppressed (<50 applications)
        applications: x.applications,
        origVolume: x.orig_volume,
        nmdda: x.nmdda === 1,
        suppressed: x.denial_rate == null,
      };
    }
  }

  const qctCount = rows.filter((r) => r.qct === 1).length;
  const stacked = eligible.filter((r) => r.qct === 1).length;

  return Response.json({
    found: true,
    scope,
    rule: RULE,
    summary: {
      tracts: rows.length,
      eligible: eligible.length,
      eligiblePct: Math.round((1000 * eligible.length) / rows.length) / 10,
      // Only ~25% of the eligible universe will actually be designated.
      likelyDesignated: Math.floor(eligible.length * (RULE.nominationShare / 100)),
      qualifyingPath: byPath,
      qct: qctCount,
      // Tracts carrying BOTH programs: OZ capital-gains treatment on top of the
      // 30% LIHTC basis boost. The most heavily subsidized ground in the country.
      ozAndQct: stacked,
    },
    capital,
    lihtcRule: LIHTC_RULE,
    tracts: eligible.map((r) => ({
      fips: r.tract_fips,
      name: (r.tract_name || "").replace(/;.*$/, ""),
      mfiPctOfArea: r.mfi_pct_of_area,
      povertyRate: r.poverty_rate,
      path: r.qualifying_path,
      qct: r.qct === 1,
    })),
    disclaimer:
      "Cignal-computed eligibility from Census ACS under the OZ 2.0 statutory test. Not the official Treasury list — Treasury sets the final dataset and vintage, and governors nominate up to 25% of eligible tracts. Designation confers tax treatment, not an assured return: research on OZ 1.0 found minimal measurable effect on housing prices and residential permitting.",
  });
}
