export const revalidate = 3600;

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Stable hub links for display (per-row article URLs are retained in the DB for provenance).
const SOURCE_LINKS = {
  uhaul: "https://www.uhaul.com/About/Migration/",
  pods: "https://www.pods.com/blog/moving-trends",
};

function fmtMonth(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00Z").toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function GET() {
  try {
    const r = await fetch(
      `${SUPA}/rest/v1/migration_rankings?select=source,report_year,list_type,rank,market,prev_rank,released_on`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, next: { revalidate: 3600 } }
    );
    if (!r.ok) return Response.json({});
    const rows = await r.json();

    const bySource = {};
    for (const row of rows) (bySource[row.source] ||= []).push(row);

    const out = {};
    for (const [src, list] of Object.entries(bySource)) {
      const maxYear = Math.max(...list.map((x) => x.report_year));
      const cur = list.filter((x) => x.report_year === maxYear);
      const released = fmtMonth([...cur.map((x) => x.released_on)].sort().pop());
      const obj = { year: String(maxYear), released, source: SOURCE_LINKS[src] || "" };
      const lists = {};
      for (const row of cur) (lists[row.list_type] ||= []).push(row);
      for (const [lt, arr] of Object.entries(lists)) {
        obj[lt] = arr.sort((a, b) => a.rank - b.rank).map((x) => [x.market, x.prev_rank]);
      }
      out[src] = obj;
    }
    return Response.json(out);
  } catch {
    return Response.json({});
  }
}
