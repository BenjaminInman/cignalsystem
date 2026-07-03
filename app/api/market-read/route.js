export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { scoreSignal, summarize } from "@/lib/market-read";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

// Recent rows for a slug at a region_code (newest first). op=eq|ilike.
async function rows(slug, code, op = "eq", limit = 14) {
  const enc = encodeURIComponent(code);
  const data = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_code=${op}.${enc}` +
      `&select=obs_date,value,yoy_change,region_code&order=obs_date.desc&limit=${limit}`
  );
  return Array.isArray(data) && data.length ? data : null;
}

// ---- NATIONAL RING (always available; no ZIP required) ----------------------
async function nationalRing() {
  const defs = [
    { key: "inflation", slug: "cpi_shelter", label: "Inflation", sub: "Shelter CPI", kind: "inflation" },
    { key: "rates", slug: "treasury_10y", label: "Interest Rates", sub: "10Y Treasury", kind: "rates" },
    { key: "pce", slug: "real_pce", label: "Real PCE", sub: "Consumer Spending", kind: "pce" },
  ];
  const out = [];
  for (const d of defs) {
    const rs = await rows(d.slug, "US");
    const s = rs ? scoreSignal({ kind: d.kind, rows: rs, weight: 1 }) : null;
    out.push({ ring: "national", label: d.label, sub: d.sub, grain: "National", ...(s || { pending: true }) });
  }
  return out;
}

// ZORI rent ladder: ZIP -> city -> county -> metro, whichever resolves first.
async function rentGrowth(zip, xw) {
  const z = await rows("zori_zip", zip);
  if (z) return { rs: z, grain: "ZIP" };
  const ladder = [
    ["zori_city", xw?.city_label, "City"],
    ["zori_county", xw?.county_label, "County"],
    ["zori_metro", xw?.metro_label, "Metro"],
  ];
  for (const [slug, code, grain] of ladder) {
    if (!code) continue;
    const rs = await rows(slug, code);
    if (rs) return { rs, grain, rolled: true };
  }
  return null;
}

// ---- LOCAL RING (requires a resolvable ZIP) ---------------------------------
async function localRing(zip) {
  const xw = (await sb(`zip_crosswalk?zip=eq.${zip}&select=city_label,county_label,metro_label`))?.[0] || null;
  const cbsaRow = (await sb(`zip_cbsa_crosswalk?zip=eq.${zip}&select=cbsa,res_ratio&order=res_ratio.desc&limit=1`))?.[0];
  const cbsa = cbsaRow?.cbsa || null;
  const county = xw?.county_label || null;
  let metroName = null;
  if (cbsa) metroName = (await sb(`regions?code=eq.${cbsa}&region_type=eq.metro&select=name&limit=1`))?.[0]?.name || null;

  const out = [];

  // Rent growth (ZORI, ZIP-preferred)
  const rent = await rentGrowth(zip, xw);
  if (rent) {
    const s = scoreSignal({ kind: "rent", rows: rent.rs, weight: 1 });
    out.push({ ring: "local", label: "Rent Growth", sub: "ZORI", grain: rent.grain, source: "Zillow", ...(s || { pending: true }) });
  } else {
    out.push({ ring: "local", label: "Rent Growth", sub: "ZORI", grain: "—", source: "Zillow", pending: true, note: "No coverage for this market" });
  }

  // Vacancy — Apartment List metro (primary)
  if (cbsa) {
    const rs = await rows("apt_vacancy", cbsa);
    const s = rs ? scoreSignal({ kind: "vacancy", rows: rs, weight: 1 }) : null;
    out.push({ ring: "local", label: "Vacancy", sub: "Apartment List", grain: "Metro", source: "Apartment List", ...(s || { pending: true, note: "No metro series" }) });
  } else {
    out.push({ ring: "local", label: "Vacancy", sub: "Apartment List", grain: "—", source: "Apartment List", pending: true, note: "ZIP has no metro" });
  }

  // Local GDP — county (BEA CAGDP9), structural backdrop
  if (county) {
    const rs = await rows("gdp_county", county);
    const s = rs ? scoreSignal({ kind: "gdp", rows: rs, weight: 0.5 }) : null;
    out.push({ ring: "local", label: "Local GDP", sub: "County · BEA", grain: "County", source: "BEA", structural: true, ...(s || { pending: true, note: "No county GDP" }) });
  }

  // Unemployment — metro (BLS LAUS)
  if (cbsa) {
    const rs = await rows("bls_metro_unemployment", cbsa);
    const s = rs ? scoreSignal({ kind: "unemployment", rows: rs, weight: 1 }) : null;
    out.push({ ring: "local", label: "Unemployment", sub: "BLS LAUS", grain: "Metro", source: "BLS", ...(s || { pending: true }) });
  }

  // Job growth — metro employment (BLS), the local leading anchor
  if (cbsa) {
    const rs = await rows("bls_metro_employment", cbsa);
    const s = rs ? scoreSignal({ kind: "jobs", rows: rs, weight: 1.25 }) : null;
    out.push({ ring: "local", label: "Job Growth", sub: "BLS · metro", grain: "Metro", source: "BLS", leading: true, ...(s || { pending: true }) });
  }

  // Wage growth — county (BLS QCEW avg weekly wage, YoY). Resolves off the same
  // county the GDP signal uses. Q1 carries bonus seasonality; YoY handles it.
  if (county) {
    const rs = await rows("county_wages", county);
    const s = rs ? scoreSignal({ kind: "wages", rows: rs, weight: 1 }) : null;
    out.push({ ring: "local", label: "Wage Growth", sub: "County · QCEW", grain: "County", source: "BLS QCEW", ...(s || { pending: true, note: "No county QCEW" }) });
  } else {
    out.push({ ring: "local", label: "Wage Growth", sub: "County · QCEW", grain: "County", source: "BLS QCEW", pending: true, note: "No county resolved" });
  }

  return { signals: out, resolved: { grain: rent?.grain || (cbsa ? "Metro" : null), cbsa, metroName, county } };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const zip = (searchParams.get("zip") || "").trim();

  try {
    const national = await nationalRing();

    if (!/^\d{5}$/.test(zip)) {
      // National-only read; wheel stays "dark" until a ZIP is entered.
      const roll = summarize(national);
      return Response.json({
        found: false, awaiting: "zip", zip: zip || null,
        national, local: [], ...roll,
        note: "Enter a ZIP to generate this market's cycle read.",
      });
    }

    const { signals: local, resolved } = await localRing(zip);
    const hasLocal = local.some((s) => !s.pending);
    if (!hasLocal) {
      const roll = summarize(national);
      return Response.json({ found: false, zip, reason: "no-local-coverage", national, local, resolved, ...roll });
    }

    const roll = summarize([...national, ...local]);
    const asOf = [...national, ...local].map((s) => s.asOf).filter(Boolean).sort().slice(-1)[0] || null;
    return Response.json({ found: true, zip, resolved, national, local, asOf, ...roll });
  } catch (e) {
    return Response.json({ found: false, zip, error: "Market read unavailable." }, { status: 502 });
  }
}
