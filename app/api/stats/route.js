export const runtime = "nodejs";
export const revalidate = 1800;

// Live platform stats (MSA/ZIP/observation counts + signal tallies) from the DB.
//
// Anonymous callers run under a 3s statement timeout. platform_stats() normally
// answers in 0.3-1.0s, but heavy warehouse work -- a CONCURRENT materialized
// view refresh over 5.6M observations takes ~4 minutes -- can push it past that.
// A blank counter strip on 2026-08-06 traced to exactly this.
//
// The outage was not the timeout. It was that the FAILURE got cached: a 30
// minute revalidate window meant one unlucky second during a refresh blanked the
// home page for half an hour, long after the database had recovered. So the last
// good payload is held in module memory and served whenever a fetch fails. A
// stale count beats an empty one on a page whose entire job is to convey scale,
// and these numbers move slowly enough that stale is nearly indistinguishable
// from current.
// Seeded with a recent real snapshot so a cold serverless instance (fresh module
// memory) still returns real numbers on the rare fetch failure, instead of null.
// Overwritten by the first successful live fetch. Counts move slowly; stale is fine.
let lastGood = { mf_metro_count: 671, zip_count: 11142, obs_count: 8715606 };

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ stats: lastGood });
  try {
    const res = await fetch(`${url}/rest/v1/rpc/platform_stats`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // no-store on the upstream call: the 30-minute cache belongs on THIS
      // route's successful response, not on a fetch whose failures would be
      // cached with equal enthusiasm.
      cache: "no-store",
    });
    if (!res.ok) return Response.json({ stats: lastGood });
    const data = await res.json();
    if (data && typeof data === "object") lastGood = data;
    return Response.json({ stats: data });
  } catch {
    return Response.json({ stats: lastGood });
  }
}
