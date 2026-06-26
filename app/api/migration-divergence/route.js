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

const DEADBAND = 2500; // $/yr change below which momentum is "steady"

export async function GET() {
  try {
    const uh = (await sb(`migration_rankings?source=eq.uhaul&list_type=eq.metros&select=rank,market,report_year&order=rank.asc`)) || [];
    const maxYear = uh.length ? Math.max(...uh.map((x) => x.report_year)) : null;
    const uhaul = uh.filter((x) => x.report_year === maxYear);
    const n = uhaul.length || 1;

    const irsMap = {};
    // net migration + in-migrant AGI: latest per metro (newest-first, keep first seen)
    for (const slug of ["irs_net_migration", "irs_inflow_agi"]) {
      const rows = (await sb(`v_indicator_analytics?slug=eq.${slug}&select=region_code,value,obs_date&order=obs_date.desc&limit=1000`)) || [];
      for (const row of rows) {
        const m = (irsMap[row.region_code] ||= {});
        if (slug === "irs_net_migration" && m.net === undefined) m.net = Math.round(row.value);
        if (slug === "irs_inflow_agi" && m.inAgi === undefined) m.inAgi = Math.round(row.value);
      }
    }

    // AGI differential: latest + prior year, so we can measure YoY momentum
    const latestRow = await sb(`v_indicator_analytics?slug=eq.irs_agi_differential&select=obs_date&order=obs_date.desc&limit=1`);
    const latestDate = latestRow?.[0]?.obs_date || null;
    const prevDate = latestDate ? `${Number(latestDate.slice(0, 4)) - 1}${latestDate.slice(4)}` : null;
    const latestYear = latestDate ? Number(latestDate.slice(0, 4)) : null;
    if (latestDate) {
      const diffRows = (await sb(`v_indicator_analytics?slug=eq.irs_agi_differential&obs_date=in.(${latestDate},${prevDate})&select=region_code,obs_date,value&limit=1000`)) || [];
      for (const r of diffRows) {
        const m = (irsMap[r.region_code] ||= {});
        if (r.obs_date === latestDate) m.diff = Math.round(r.value);
        else if (r.obs_date === prevDate) m.diffPrev = Math.round(r.value);
      }
    }

    const ALIAS = { "Boise, ID": "Boise City, ID" };
    const items = uhaul.map((u) => {
      const m = irsMap[ALIAS[u.market] || u.market] || {};
      const renter = Math.round(((n + 1 - u.rank) / n) * 100);
      const diff = m.diff ?? null;
      const diffPrev = m.diffPrev ?? null;
      const delta = diff != null && diffPrev != null ? diff - diffPrev : null;
      const momentum = delta == null ? null : delta >= DEADBAND ? "accelerating" : delta <= -DEADBAND ? "fading" : "steady";
      let quadrant = null;
      if (diff != null) {
        const renterStrong = u.rank <= Math.ceil(n / 2);
        quadrant = diff >= 0 ? (renterStrong ? "broad" : "upscale") : renterStrong ? "workforce" : "cooling";
      }
      return {
        market: u.market, uhaulRank: u.rank, renter,
        net: m.net ?? null, inAgi: m.inAgi ?? null,
        diff, diffPrev, delta, momentum, quadrant, matched: diff != null,
      };
    });

    return Response.json({ year: maxYear ? String(maxYear) : null, irsPeriod: "2022\u20132023", latestYear, items });
  } catch {
    return Response.json({ items: [] });
  }
}
