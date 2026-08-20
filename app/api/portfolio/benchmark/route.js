export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { hasTier } from "@/lib/tiers";
import { runMarketRead } from "@/lib/underwriting/engine";

const SLUGS = ["hd_asking_rent", "hd_effective_rent", "hd_concession", "hd_leased_pct", "hd_dom"];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const city = (searchParams.get("city") || "").trim();
    const state = (searchParams.get("state") || "").trim();
    let cbsa = (searchParams.get("cbsa") || "").trim();

    const supabase = createClient();
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return Response.json({ gated: true });
    const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).maybeSingle();
    if (!(prof?.is_admin || hasTier(prof?.tier, "pro"))) return Response.json({ gated: true });

    // resolve market from city/state if no cbsa given
    let marketName = null;
    if (!cbsa) {
      const q = [city, state].filter(Boolean).join(", ");
      if (!q) return Response.json({ resolved: false });
      const { data: res } = await supabase.rpc("resolve_market", { q });
      const first = Array.isArray(res) ? res[0] : null;
      if (first) { cbsa = first.cbsa; marketName = first.name; }
    }
    if (!cbsa) return Response.json({ resolved: false });

    // HelloData metro benchmarks — latest value per slug (user session → tier check passes)
    const { data: hd } = await supabase.rpc("hd_analytics", { p_slugs: SLUGS, p_region_type: "metro", p_region_code: cbsa, p_limit: SLUGS.length * 6 });
    const latest = {};
    for (const r of hd || []) { const s = r.slug; if (!latest[s] || r.obs_date > latest[s].date) latest[s] = { date: r.obs_date, value: r.value == null ? null : Number(r.value) }; }
    const market = {
      asking_rent: latest.hd_asking_rent?.value ?? null,
      effective_rent: latest.hd_effective_rent?.value ?? null,
      concession: latest.hd_concession?.value ?? null,
      leased_pct: latest.hd_leased_pct?.value ?? null,
      dom: latest.hd_dom?.value ?? null,
      asOf: latest.hd_asking_rent?.date || latest.hd_leased_pct?.date || null,
    };

    // market_read for cycle phase + forward rent growth
    let phase = null, rentGrowthY1 = null;
    const { data: mr } = await supabase.rpc("market_read", { p_cbsa: cbsa });
    if (mr?.inputs) { const read = runMarketRead(mr.inputs, "base"); phase = read.phase; rentGrowthY1 = read.forwardAssumptions?.rentGrowthY1 ?? null; }

    const covered = market.asking_rent != null || market.leased_pct != null;
    return Response.json({ resolved: true, covered, cbsa, market_name: marketName || (mr?.name) || `Metro ${cbsa}`, phase, rentGrowthY1, market });
  } catch (e) {
    console.error("[portfolio:benchmark]", e?.message);
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
