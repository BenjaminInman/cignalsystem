export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { hasTier } from "@/lib/tiers";
import { runMarketRead } from "@/lib/underwriting/engine";

// Prefer the clean market-rate (conventional) cut; fall back to the all-in blend
// for any market not yet segmented. Both sets normalize to the same base metrics.
const MKT_SLUGS = ["hd_asking_rent_mkt", "hd_effective_rent_mkt", "hd_concession_mkt", "hd_leased_pct_mkt", "hd_dom_mkt"];
const ALLIN_SLUGS = ["hd_asking_rent", "hd_effective_rent", "hd_concession", "hd_leased_pct", "hd_dom"];
const BASE = {
  hd_asking_rent: "asking_rent", hd_effective_rent: "effective_rent", hd_concession: "concession", hd_leased_pct: "leased_pct", hd_dom: "dom",
  hd_asking_rent_mkt: "asking_rent", hd_effective_rent_mkt: "effective_rent", hd_concession_mkt: "concession", hd_leased_pct_mkt: "leased_pct", hd_dom_mkt: "dom",
};

function fromLatest(latest) {
  return {
    asking_rent: latest.asking_rent?.value ?? null,
    effective_rent: latest.effective_rent?.value ?? null,
    concession: latest.concession?.value ?? null,
    leased_pct: latest.leased_pct?.value ?? null,
    dom: latest.dom?.value ?? null,
    asOf: latest.asking_rent?.date || latest.leased_pct?.date || null,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const zip = (searchParams.get("zip") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const state = (searchParams.get("state") || "").trim();
    let cbsa = (searchParams.get("cbsa") || "").trim();

    const supabase = createClient();
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return Response.json({ gated: true });
    const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).maybeSingle();
    if (!(prof?.is_admin || hasTier(prof?.tier, "pro"))) return Response.json({ gated: true });

    // metro (cbsa) for phase + forward rent growth — resolve from zip or city/state
    let marketName = null;
    if (!cbsa) {
      const q = zip || [city, state].filter(Boolean).join(", ");
      if (q) {
        const { data: res } = await supabase.rpc("resolve_market", { q });
        const first = Array.isArray(res) ? res[0] : null;
        if (first) { cbsa = first.cbsa; marketName = first.name; }
      }
    }

    const pull = async (regionType, regionCode, slugs) => {
      const { data: hd } = await supabase.rpc("hd_analytics", { p_slugs: slugs, p_region_type: regionType, p_region_code: regionCode, p_limit: slugs.length * 6 });
      const latest = {};
      for (const r of hd || []) { const b = BASE[r.slug]; if (!b) continue; if (!latest[b] || r.obs_date > latest[b].date) latest[b] = { date: r.obs_date, value: r.value == null ? null : Number(r.value) }; }
      return latest;
    };
    // market-rate first, all-in fallback for un-segmented markets
    const pullPreferMkt = async (regionType, regionCode) => {
      const m = await pull(regionType, regionCode, MKT_SLUGS);
      if (m.asking_rent || m.leased_pct) return { latest: m, basis: "market-rate" };
      const a = await pull(regionType, regionCode, ALLIN_SLUGS);
      if (a.asking_rent || a.leased_pct) return { latest: a, basis: "all-in" };
      return null;
    };

    // Prefer ZIP-level benchmarks; fall back to metro if the ZIP is thin/suppressed.
    let level = null, benchmarkArea = null, market = {}, coverage = null, basis = null;
    if (zip) {
      const z = await pullPreferMkt("zip", zip);
      if (z) {
        level = "zip"; benchmarkArea = `ZIP ${zip}`; market = fromLatest(z.latest); basis = z.basis;
        const { data: cov } = await supabase.rpc("hd_coverage", { p_zip: zip });
        if (cov && cov.length) coverage = cov[0];
      }
    }
    if (!level && cbsa) {
      const mm = await pullPreferMkt("metro", cbsa);
      if (mm) { level = "metro"; benchmarkArea = marketName || `Metro ${cbsa}`; market = fromLatest(mm.latest); basis = mm.basis; }
    }

    // phase + forward rent growth (always metro-level — phase is a market read)
    let phase = null, rentGrowthY1 = null;
    if (cbsa) {
      const { data: mr } = await supabase.rpc("market_read", { p_cbsa: cbsa });
      if (mr?.inputs) { const read = runMarketRead(mr.inputs, "base"); phase = read.phase; rentGrowthY1 = read.forwardAssumptions?.rentGrowthY1 ?? null; }
    }

    return Response.json({
      resolved: !!(level || phase),
      level, // "zip" | "metro" | null
      covered: !!level,
      benchmark_area: benchmarkArea,
      market_name: marketName || (cbsa ? `Metro ${cbsa}` : null),
      cbsa, phase, rentGrowthY1, market, coverage, basis,
      zip_requested: zip || null,
    });
  } catch (e) {
    console.error("[portfolio:benchmark]", e?.message);
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
