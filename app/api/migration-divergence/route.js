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

const DEADBAND = 2000; // $/yr slope below which momentum is "steady"
const WINDOW = 4; // years in the smoothing window

function ols(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0, den = 0;
  for (const [x, y] of pairs) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
  return den ? num / den : null;
}

export async function GET() {
  try {
    const uh = (await sb(`migration_rankings?source=eq.uhaul&list_type=eq.metros&select=rank,market,report_year&order=rank.asc`)) || [];
    const maxYear = uh.length ? Math.max(...uh.map((x) => x.report_year)) : null;
    const uhaul = uh.filter((x) => x.report_year === maxYear);
    const n = uhaul.length || 1;

    const irsMap = {};
    for (const slug of ["irs_net_migration", "irs_inflow_agi"]) {
      const rows = (await sb(`v_indicator_analytics?slug=eq.${slug}&select=region_code,value,obs_date&order=obs_date.desc&limit=1000`)) || [];
      for (const row of rows) {
        const m = (irsMap[row.region_code] ||= {});
        if (slug === "irs_net_migration" && m.net === undefined) m.net = Math.round(row.value);
        if (slug === "irs_inflow_agi" && m.inAgi === undefined) m.inAgi = Math.round(row.value);
      }
    }

    // AGI differential: pull the last WINDOW annual prints so momentum is a smoothed
    // multi-year slope rather than a single (noisy) year-over-year step.
    const latestRow = await sb(`v_indicator_analytics?slug=eq.irs_agi_differential&select=obs_date&order=obs_date.desc&limit=1`);
    const latestDate = latestRow?.[0]?.obs_date || null;
    const latestYear = latestDate ? Number(latestDate.slice(0, 4)) : null;
    const diffSeries = {}; // region_code -> { year: value }
    if (latestDate) {
      const suffix = latestDate.slice(4); // "-12-31"
      const dates = Array.from({ length: WINDOW }, (_, i) => `${latestYear - i}${suffix}`);
      const results = await Promise.all(
        dates.map((d) => sb(`v_indicator_analytics?slug=eq.irs_agi_differential&obs_date=eq.${d}&select=region_code,value&limit=1000`))
      );
      results.forEach((rows, i) => {
        const yr = latestYear - i;
        for (const r of rows || []) (diffSeries[r.region_code] ||= {})[yr] = Math.round(r.value);
      });
    }

    const ALIAS = { "Boise, ID": "Boise City, ID" };
    const items = uhaul.map((u) => {
      const code = ALIAS[u.market] || u.market;
      const m = irsMap[code] || {};
      const renter = Math.round(((n + 1 - u.rank) / n) * 100);
      const ser = diffSeries[code] || {};
      const years = Object.keys(ser).map(Number).sort((a, b) => a - b);
      const diff = years.length ? ser[years[years.length - 1]] : null;
      const pairs = years.map((yr, i) => [i, ser[yr]]);
      const slope = ols(pairs); // $/yr, smoothed
      const span = pairs.length ? pairs.length - 1 : 0;
      const momentum = slope == null ? null : slope >= DEADBAND ? "accelerating" : slope <= -DEADBAND ? "fading" : "steady";
      let quadrant = null;
      if (diff != null) {
        const renterStrong = u.rank <= Math.ceil(n / 2);
        quadrant = diff >= 0 ? (renterStrong ? "broad" : "upscale") : renterStrong ? "workforce" : "cooling";
      }
      return {
        market: u.market, uhaulRank: u.rank, renter,
        net: m.net ?? null, inAgi: m.inAgi ?? null,
        diff, slope: slope != null ? Math.round(slope) : null, span,
        momentum, quadrant, matched: diff != null,
      };
    });

    return Response.json({ year: maxYear ? String(maxYear) : null, latestYear, window: WINDOW, items });
  } catch {
    return Response.json({ items: [] });
  }
}
