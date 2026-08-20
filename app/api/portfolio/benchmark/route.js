export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { hasTier } from "@/lib/tiers";
import { runMarketRead } from "@/lib/underwriting/engine";

const SLUGS = ["hd_asking_rent", "hd_effective_rent", "hd_concession", "hd_leased_pct", "hd_dom"];

function fromLatest(latest) {
  return {
    asking_rent: latest.hd_asking_rent?.value ?? null,
    effective_rent: latest.hd_effective_rent?.value ?? null,
    concession: latest.hd_concession?.value ?? null,
    leased_pct: latest.hd_leased_pct?.value ?? null,
    dom: latest.hd_dom?.value ?? null,
    asOf: latest.hd_asking_rent?.date || latest.hd_leased_pct?.date || null,
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

    const pull = async (regionType, regionCode) => {
      const { data: hd } = await supabase.rpc("hd_analytics", { p_slugs: SLUGS, p_region_type: regionType, p_region_code: regionCode, p_limit: SLUGS.length * 6 });
      const latest = {};
      for (const r of hd || []) { const s = r.slug; if (!latest[s] || r.obs_date > latest[s].date) latest[s] = { date: r.obs_date, value: r.value == null ? null : Number(r.value) }; }
      return latest;
    };

    // Prefer ZIP-level benchmarks; fall back to metro if the ZIP is thin/suppressed.
    let level = null, benchmarkArea = null, market = {}, coverage = null;
    if (zip) {
      const z = await pull("zip", zip);
      if (z.hd_asking_rent || z.hd_leased_pct) {
        level = "zip"; benchmarkArea = `ZIP ${zip}`; market = fromLatest(z);
        const { data: cov } = await supabase.rpc("hd_coverage", { p_zip: zip });
        if (cov && cov.length) coverage = cov[0];
      }
    }
    if (!level && cbsa) {
      const mm = await pull("metro", cbsa);
      if (mm.hd_asking_rent || mm.hd_leased_pct) { level = "metro"; benchmarkArea = marketName || `Metro ${cbsa}`; market = fromLatest(mm); }
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
      cbsa, phase, rentGrowthY1, market, coverage,
      zip_requested: zip || null,
    });
  } catch (e) {
    console.error("[portfolio:benchmark]", e?.message);
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
