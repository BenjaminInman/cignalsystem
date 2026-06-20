// Indicator comparison data + tier gate.
// Returns real first-print national history for the requested slugs over the
// requested window. The DATABASE is the source of truth; the gate (how many
// indicators / how far back) is enforced here, server-side, so it can't be
// bypassed from the client.
//
//   free → up to 2 indicators, 10-year window
//   pro  → up to 5 indicators, 10 / 20 / 40-year window

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TIERS = {
  free: { maxSlugs: 2, years: [10] },
  pro: { maxSlugs: 5, years: [10, 20, 40] },
};

const cutoff = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

async function fetchSeries(slug, years) {
  if (!SUPA || !ANON) return [];
  const url =
    `${SUPA}/rest/v1/v_indicator_analytics` +
    `?slug=eq.${encodeURIComponent(slug)}&region_type=eq.national` +
    `&obs_date=gte.${cutoff(years)}&select=obs_date,value` +
    `&order=obs_date.asc&limit=3000`;
  try {
    const r = await fetch(url, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows
      .map((o) => ({ d: o.obs_date, v: parseFloat(o.value) }))
      .filter((o) => Number.isFinite(o.v));
  } catch {
    return [];
  }
}

export async function GET(req) {
  // Resolve tier (anonymous visitors get the free caps).
  let isPro = false;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tier, is_admin")
        .eq("id", user.id)
        .single();
      isPro = !!prof?.is_admin || prof?.tier === "pro";
    }
  } catch {
    /* fall through as free */
  }

  const caps = isPro ? TIERS.pro : TIERS.free;
  const { searchParams } = new URL(req.url);

  // Validate + clamp slugs to the tier ceiling.
  const slugs = (searchParams.get("slugs") || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9_]+$/.test(s))
    .slice(0, caps.maxSlugs);

  // Clamp the window to an allowed value (largest allowed not exceeding request).
  let years = parseInt(searchParams.get("years") || "10", 10) || 10;
  if (!caps.years.includes(years)) {
    const le = caps.years.filter((y) => y <= years);
    years = le.length ? Math.max(...le) : Math.min(...caps.years);
  }

  const series = await Promise.all(
    slugs.map(async (slug) => ({ slug, points: await fetchSeries(slug, years) }))
  );

  return Response.json({
    tier: isPro ? "pro" : "free",
    maxSlugs: caps.maxSlugs,
    allowedYears: caps.years,
    years,
    series,
  });
}
