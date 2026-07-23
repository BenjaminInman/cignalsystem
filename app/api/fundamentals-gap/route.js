// Fundamentals Gap — standardised consumer sentiment vs a standardised
// composite of economic fundamentals.
//
// Reads v_fundamentals_gap, which computes everything on read from revision-0
// national observations. Nothing here is stored: the gap is derived, and a
// derived value has no business sitting in the observations table next to
// first prints.
//
// The view is ~460 monthly rows, comfortably under PostgREST's 1,000-row
// default cap, but the limit is stated explicitly so a future backfill can't
// silently truncate the tail.

export const runtime = "nodejs";
export const revalidate = 3600;

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export async function GET() {
  if (!SB_URL || !SB_KEY) {
    return Response.json({ error: "supabase not configured" }, { status: 503 });
  }

  try {
    const url =
      `${SB_URL}/rest/v1/v_fundamentals_gap` +
      `?select=obs_date,sentiment_z,fundamentals_z,gap` +
      `&order=obs_date.asc&limit=2000`;

    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return Response.json({ error: "upstream error" }, { status: 502 });
    }

    const raw = await res.json();
    const series = (Array.isArray(raw) ? raw : [])
      .map((r) => ({
        d: r.obs_date,
        s: num(r.sentiment_z),
        f: num(r.fundamentals_z),
        g: num(r.gap),
      }))
      .filter((r) => r.g != null && r.s != null && r.f != null);

    if (!series.length) {
      return Response.json({ error: "no data" }, { status: 404 });
    }

    const gaps = series.map((r) => r.g);
    const last = series[series.length - 1];

    // Percentile of the current reading within the full history.
    const below = gaps.filter((g) => g < last.g).length;
    const percentile = (below / gaps.length) * 100;

    // Consecutive months at or below −1 sd, counting back from the latest print.
    let streak = 0;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].g <= -1) streak++;
      else break;
    }

    return Response.json({
      asOf: last.d,
      current: Math.round(last.g * 100) / 100,
      sentimentZ: Math.round(last.s * 100) / 100,
      fundamentalsZ: Math.round(last.f * 100) / 100,
      percentile: Math.round(percentile * 10) / 10,
      streak,
      firstObs: series[0].d,
      count: series.length,
      series,
    });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
