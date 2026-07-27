// Indicator comparison data + tier gate.
// Returns each series in its CANONICAL DISPLAYED form (the same representation
// the Indicators tab shows — CPI -> YoY %, fed funds -> rate, employment ->
// monthly net change), computed from real first-print national history in
// v_indicator_analytics. The DB is the source of truth; the gate (how many
// indicators / how far back) is enforced here, server-side.
//
//   free → up to 2 indicators, 10-year window
//   pro  → up to 5 indicators, 10 / 20 / 40-year window

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { transformSeries } from "@/lib/indicator-series";
import { hasTier } from "@/lib/tiers";

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

// Raw ascending history. Pull an extra year so YoY/MoM transforms are defined
// from the very start of the requested window.
//
// PostgREST caps every response at 1000 rows regardless of `limit`, so a long
// window on a daily series (10y of treasury_10y is ~2,500 rows) silently returned
// only the OLDEST 1000 and the chart just stopped mid-window. Page through with
// offset until a short page comes back.
const PAGE = 1000;
const MAX_PAGES = 6;
async function fetchRaw(slug, years) {
  if (!SUPA || !ANON) return [];
  const base =
    `${SUPA}/rest/v1/v_indicator_analytics` +
    `?slug=eq.${encodeURIComponent(slug)}&region_type=eq.national` +
    `&obs_date=gte.${cutoff(years + 1)}&select=obs_date,value` +
    `&order=obs_date.asc`;
  const all = [];
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await fetch(`${base}&limit=${PAGE}&offset=${page * PAGE}`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        next: { revalidate: 3600 },
      });
      if (!r.ok) break;
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0) break;
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
    return all
      .map((o) => ({ d: o.obs_date, v: parseFloat(o.value) }))
      .filter((o) => Number.isFinite(o.v));
  } catch {
    return [];
  }
}

export async function GET(req) {
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
      isPro = !!prof?.is_admin || hasTier(prof?.tier, "pro");
    }
  } catch {
    /* fall through as free */
  }

  const caps = isPro ? TIERS.pro : TIERS.free;
  const { searchParams } = new URL(req.url);

  // The full comparison history (the series behind the charts and the drawer's
  // quarter-over-quarter reads) is a paid surface. Its only consumers live on
  // the Pro-gated Indicators tab, so non-Pro callers -- free members and
  // anonymous scrapers alike -- get nothing rather than the old free teaser.
  if (!isPro) {
    return Response.json({ tier: "locked", gated: true, series: [] });
  }

  const slugs = (searchParams.get("slugs") || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9_]+$/.test(s))
    .slice(0, caps.maxSlugs);

  let years = parseInt(searchParams.get("years") || "10", 10) || 10;
  if (!caps.years.includes(years)) {
    const le = caps.years.filter((y) => y <= years);
    years = le.length ? Math.max(...le) : Math.min(...caps.years);
  }

  const floor = cutoff(years);
  const series = await Promise.all(
    slugs.map(async (slug) => {
      const raw = await fetchRaw(slug, years);
      const t = transformSeries(slug, raw); // canonical displayed form
      const points = t.points.filter((p) => p.d >= floor); // trim buffer year
      return { slug, unit: t.unit, group: t.group, round: t.round, points };
    })
  );

  return Response.json({
    tier: isPro ? "pro" : "free",
    maxSlugs: caps.maxSlugs,
    allowedYears: caps.years,
    years,
    series,
  });
}
