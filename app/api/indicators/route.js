// Live indicator values for the tiles.
//
// ENTITLEMENT: this endpoint is read by three surfaces at three access levels —
// the public home teaser, the free dashboard watchlist, and the paid Indicators
// tab — so the gate lives here, server-side, not in any one page. Pro / Cignal+
// / admins get the full live set; everyone else (free members and anonymous
// callers, including scrapers) gets only the public teaser subset. This is the
// real boundary for the indicator intelligence.
import { getLiveIndicators } from "@/lib/indicators-live";
import { createClient } from "@/lib/supabase/server";
import { hasTier } from "@/lib/tiers";
import { TEASER_INDICATOR_NAMES } from "@/lib/teaser-indicators";

export const runtime = "nodejs";
// Must read auth per request, so no shared response cache. The underlying series
// fetches inside getLiveIndicators are themselves cached (revalidate 3600), so
// the per-request cost is just the entitlement check + assembly.
export const dynamic = "force-dynamic";

async function isEntitled() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: prof } = await supabase
      .from("profiles")
      .select("tier, is_admin")
      .eq("id", user.id)
      .single();
    return !!prof?.is_admin || hasTier(prof?.tier, "pro");
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const items = await getLiveIndicators();
    if (await isEntitled()) return Response.json({ items });

    // Free / anonymous: return only the public teaser names.
    const teaser = {};
    for (const [name, v] of Object.entries(items)) {
      if (TEASER_INDICATOR_NAMES.has(name)) teaser[name] = v;
    }
    return Response.json({ items: teaser, gated: true });
  } catch {
    return Response.json({ items: {} });
  }
}
