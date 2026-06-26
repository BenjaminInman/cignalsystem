export const revalidate = 3600;

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 3600 },
  });
  return r.ok ? r.json() : null;
}

export async function GET() {
  try {
    const uh = (await sb(`migration_rankings?source=eq.uhaul&list_type=eq.metros&select=rank,market,report_year&order=rank.asc`)) || [];
    const maxYear = uh.length ? Math.max(...uh.map((x) => x.report_year)) : null;
    const uhaul = uh.filter((x) => x.report_year === maxYear);
    const n = uhaul.length || 1;

    const irsMap = {};
    for (const slug of ["irs_net_migration", "irs_inflow_agi", "irs_agi_differential"]) {
      // newest-first; keep the first (latest) value seen per metro (backfill added prior years)
      const rows = (await sb(`v_indicator_analytics?slug=eq.${slug}&select=region_code,value,obs_date&order=obs_date.desc&limit=1000`)) || [];
      for (const row of rows) {
        const m = (irsMap[row.region_code] ||= {});
        if (slug === "irs_net_migration" && m.net === undefined) m.net = Math.round(row.value);
        if (slug === "irs_inflow_agi" && m.inAgi === undefined) m.inAgi = Math.round(row.value);
        if (slug === "irs_agi_differential" && m.diff === undefined) m.diff = Math.round(row.value);
      }
    }

    const ALIAS = { "Boise, ID": "Boise City, ID" };
    const items = uhaul.map((u) => {
      const m = irsMap[ALIAS[u.market] || u.market] || {};
      const renter = Math.round(((n + 1 - u.rank) / n) * 100);
      let quadrant = null;
      if (m.diff != null) {
        const renterStrong = u.rank <= Math.ceil(n / 2);
        const affluentUp = m.diff >= 0;
        quadrant = affluentUp
          ? renterStrong ? "broad" : "upscale"
          : renterStrong ? "workforce" : "cooling";
      }
      return { market: u.market, uhaulRank: u.rank, renter, net: m.net ?? null, inAgi: m.inAgi ?? null, diff: m.diff ?? null, quadrant, matched: m.diff != null };
    });

    return Response.json({ year: maxYear ? String(maxYear) : null, irsPeriod: "2022\u20132023", items });
  } catch {
    return Response.json({ items: [] });
  }
}
