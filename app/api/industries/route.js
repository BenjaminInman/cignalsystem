export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { trajectory, trajTone } from "@/lib/trajectory";

// Metro industry mix — which industries are driving job growth in a market.
//
// Source: BLS Current Employment Statistics, state & metro area series (SM),
// not seasonally adjusted. Unadjusted is correct here because every read is
// year-over-year, which cancels seasonality; metro seasonally-adjusted series
// exist for only a handful of large areas.
//
// The supersectors below are MUTUALLY EXCLUSIVE and sum exactly to total nonfarm.
// BLS publishes aggregates (Total Private, Goods Producing, Service-Providing) and
// sub-components (Durable/Non-Durable inside Manufacturing; Wholesale/Retail/
// Transport inside Trade) in the same file. Including those would double-count and
// would rank "Total Private" as if it were an industry, so they are deliberately
// excluded. Verified across three metros: the set sums to total nonfarm to 0.0k.
//
// Grain: METRO only — see `grainNote`.
//
// ?cbsa=34980

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const INDUSTRIES = {
  metro_emp_prof_business: "Professional & Business Services",
  metro_emp_education_health: "Education & Health Services",
  metro_emp_trade_transport: "Trade, Transportation & Utilities",
  metro_emp_leisure_hospitality: "Leisure & Hospitality",
  metro_emp_government: "Government",
  metro_emp_manufacturing: "Manufacturing",
  metro_emp_construction: "Construction",
  metro_emp_mining_construction: "Mining, Logging & Construction",
  metro_emp_financial: "Financial Activities",
  metro_emp_information: "Information",
  metro_emp_other_services: "Other Services",
  metro_emp_mining: "Mining & Logging",
};

// A metro reporting the combined 15 series does NOT separately report 10 and 20 —
// keeping both would double-count construction.
const COMBINED = "metro_emp_mining_construction";
const SPLIT = ["metro_emp_mining", "metro_emp_construction"];

async function sb(path) {
  if (!SUPA || !KEY) return null;
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 3600 },
  });
  if (!r.ok) return null;
  return r.json();
}

export async function GET(req) {
  const cbsa = new URL(req.url).searchParams.get("cbsa");
  if (!cbsa) return Response.json({ error: "pass ?cbsa=" }, { status: 400 });

  const slugs = Object.keys(INDUSTRIES).join(",");
  // Region-filtered and slug-scoped: 12 slugs x 26 months is well under PostgREST's
  // 1000-row cap. An unfiltered scan would trip the anon statement timeout.
  const rows = await sb(
    `v_indicator_analytics?region_code=eq.${encodeURIComponent(cbsa)}` +
      `&slug=in.(${slugs})&select=slug,obs_date,value,yoy_change&order=obs_date.asc&limit=1000`
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ found: false, cbsa });
  }

  const bySlug = {};
  for (const r of rows) {
    if (r.value == null) continue;
    (bySlug[r.slug] ||= []).push({
      d: r.obs_date,
      v: Number(r.value),
      yoy: r.yoy_change == null ? null : Number(r.yoy_change),
    });
  }

  const present = new Set(Object.keys(bySlug));
  if (SPLIT.every((s) => present.has(s))) delete bySlug[COMBINED];
  else for (const s of SPLIT) delete bySlug[s];

  const asOf = rows[rows.length - 1].obs_date;
  const out = [];
  for (const [slug, series] of Object.entries(bySlug)) {
    const last = series[series.length - 1];
    if (!last || last.d !== asOf) continue;
    const base = last.yoy == null ? null : last.v - last.yoy;
    const yoyPct = base ? Math.round((last.yoy / base) * 1000) / 10 : null;
    // Trajectory reads the GROWTH RATE's own 24-month path in 12-month segments —
    // an industry can still be adding jobs while its rate of growth rolls over.
    const yoySeries = series
      .map((x) => {
        if (x.yoy == null) return null;
        const b = x.v - x.yoy;
        return b ? Math.round((x.yoy / b) * 1000) / 10 : null;
      })
      .filter((x) => x != null);
    const t = trajectory(yoySeries, { goodUp: true });
    out.push({
      slug,
      name: INDUSTRIES[slug],
      employment: Math.round(last.v * 10) / 10,
      yoyPct,
      yoyAbs: last.yoy == null ? null : Math.round(last.yoy * 10) / 10,
      traj: t ? { ...t, tone: trajTone(t) } : null,
    });
  }

  const totalEmp = out.reduce((a, b) => a + (b.employment || 0), 0);
  const totalAdds = out.reduce((a, b) => a + (b.yoyAbs > 0 ? b.yoyAbs : 0), 0);
  for (const r of out) {
    r.share = totalEmp ? Math.round((1000 * r.employment) / totalEmp) / 10 : null;
    // Share of the market's gross job ADDS. A fast-growing small sector and a
    // slow-growing large one can contribute the same number of jobs.
    r.growthShare = totalAdds && r.yoyAbs > 0 ? Math.round((1000 * r.yoyAbs) / totalAdds) / 10 : 0;
  }

  const ranked = out.slice().sort((a, b) => (b.yoyPct ?? -99) - (a.yoyPct ?? -99));
  const byAdds = out.slice().sort((a, b) => (b.yoyAbs ?? -99) - (a.yoyAbs ?? -99));

  return Response.json({
    found: true,
    cbsa,
    asOf,
    totalEmployment: Math.round(totalEmp * 10) / 10,
    industries: ranked,
    topByAdds: byAdds.slice(0, 3).filter((r) => r.yoyAbs > 0).map((r) => r.name),
    source: "BLS Current Employment Statistics (metro, not seasonally adjusted)",
    grainNote:
      "Metro grain only. Establishment-based industry employment is not published at ZIP or city level by any public source. ZIP-level industry data exists in the Census ACS but is residence-based (where workers live, not where the jobs are) and is a five-year rolling average.",
  });
}
