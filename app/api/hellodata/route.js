// HelloData series — LICENSED DATA, paying tiers only.
//
// HelloData indicators are marked restricted=true, which removes them from
// v_indicator_analytics (the public wrapper) entirely. anon has no read on the
// materialized view and no execute on the RPC, so there is no path to this data
// without an authenticated Pro/Cignal+ session.
//
// The gate is enforced TWICE on purpose:
//   1. here, server-side, so a free user gets a clean locked payload; and
//   2. inside public.hd_analytics() itself, which re-checks the caller's tier
//      against profiles via auth.uid().
// (2) is the one that actually matters — the RPC is granted to `authenticated`,
// so without an in-function check any logged-in free user could call it directly
// over PostgREST and skip this route completely.
//
// Conference Board (cb_*) is deliberately NOT served here at any tier. It stays
// restricted and internal-only until a redistribution licence is signed; serving
// it behind a paid tier would be commercial use, which its terms prohibit.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { hasTier } from "@/lib/tiers";

const SLUGS = [
  "hd_asking_rent",
  "hd_effective_rent",
  "hd_concession",
  "hd_leased_pct",
  "hd_dom",
];

const LOCKED = { tier: "locked", gated: true, series: {}, asOf: null };

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const zip = (searchParams.get("zip") || "").trim();
    const metro = (searchParams.get("metro") || "").trim();
    const months = Math.min(Number(searchParams.get("months") || 38) || 38, 120);

    if (!zip && !metro) {
      return Response.json({ error: "pass ?zip=37203 or ?metro=34980" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return Response.json(LOCKED);

    const { data: prof } = await supabase
      .from("profiles")
      .select("tier, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const allowed = !!prof?.is_admin || hasTier(prof?.tier, "pro");
    if (!allowed) return Response.json(LOCKED);

    const regionType = zip ? "zip" : "metro";
    const regionCode = zip || metro;

    // Called with the user's session so auth.uid() resolves inside the function.
    const { data, error } = await supabase.rpc("hd_analytics", {
      p_slugs: SLUGS,
      p_region_type: regionType,
      p_region_code: regionCode,
      p_limit: SLUGS.length * months,
    });
    if (error) {
      console.error("hd_analytics error", error.message);
      return Response.json({ error: "query failed" }, { status: 500 });
    }

    // Group by slug, ascending by date, so charts can consume directly.
    const series = {};
    for (const r of data || []) {
      (series[r.slug] ||= []).push({
        date: r.obs_date,
        value: r.value === null ? null : Number(r.value),
        yoy: r.yoy_change === null ? null : Number(r.yoy_change),
        z: r.zscore_12 === null ? null : Number(r.zscore_12),
      });
    }
    for (const k of Object.keys(series)) {
      series[k].sort((a, b) => (a.date < b.date ? -1 : 1));
    }

    // Concession load: the number ZORI structurally cannot see. Asking and
    // effective come from the same source and universe, so this spread is
    // internal to HelloData — never blended across sources.
    const ask = series.hd_asking_rent || [];
    const eff = series.hd_effective_rent || [];
    const byDate = new Map(eff.map((p) => [p.date, p.value]));
    const load = ask
      .filter((p) => p.value && byDate.get(p.date))
      .map((p) => ({
        date: p.date,
        pct: Number((100 * (1 - byDate.get(p.date) / p.value)).toFixed(2)),
      }));

    const asOf = ask.length ? ask[ask.length - 1].date : null;

    return Response.json({
      tier: prof?.is_admin ? "admin" : prof?.tier || "pro",
      gated: false,
      live: true,
      source: "HelloData",
      attribution: "Aggregated multifamily listing data (50+ unit properties), HelloData.",
      regionType,
      regionCode,
      asOf,
      series,
      concessionLoad: load,
    });
  } catch (e) {
    console.error("hellodata route", e);
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
