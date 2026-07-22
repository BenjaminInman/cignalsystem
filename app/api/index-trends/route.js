// Period returns for the /indices trend readings.
//
// Daily moves are noise for a cycle platform: a homebuilder giving back 2% on a
// midday headline says nothing about where housing is in the cycle. These two
// horizons are where the signal lives, and they routinely disagree with the
// daily tape and with each other -- Home Builders can read -9% for the quarter
// while the year is still +4%, which is the whole point of showing both.
//
//   yoy  change vs the same day one year ago  (the headline)
//   qtd  change since the close of the last COMPLETED quarter
//   ytd  change since the close of 2025 (retained, not currently displayed)
//
// The headline is YoY, not calendar YTD. YTD degenerates every January: on
// 2 Jan 2026 it measured a single trading day (-0.05%) while the trailing year
// read -6.33%, and on 16 Jan it read +7.51% against a real twelve-month trend of
// -3.41% -- opposite directions, in the largest type on the page. YoY is always
// exactly twelve months, so it never degenerates and stays comparable to
// itself. It also matches the thesis: cycles do not reset on January 1.
//
// Anchors are resolved from the data rather than hard-coded, using the latest
// session on or before each boundary, so quarter-end holidays and weekends
// resolve to a real trading day instead of returning nothing.
//
// Returns per-symbol figures only. The page averages them into category indices
// itself, using the same equal weighting as the daily donuts -- keeping one
// methodology means the daily, quarterly and annual readings on a card are
// directly comparable instead of three different constructs.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const runtime = "nodejs";
export const revalidate = 3600;

const SQL_FN = "index_period_returns";

export async function GET() {
  if (!SB_URL || !SB_KEY) {
    return Response.json({ periods: {}, degraded: true }, { status: 200 });
  }
  try {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${SQL_FN}`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "content-type": "application/json",
      },
      body: "{}",
      next: { revalidate },
    });
    if (!res.ok) return Response.json({ periods: {}, degraded: true });
    const data = await res.json();
    if (!data || !Array.isArray(data.rows)) {
      return Response.json({ periods: {}, degraded: true });
    }
    const periods = {};
    for (const r of data.rows) {
      periods[r.symbol] = {
        yoy: r.yoy == null ? null : Number(r.yoy),
        qtd: r.qtd == null ? null : Number(r.qtd),
        ytd: r.ytd == null ? null : Number(r.ytd),
      };
    }
    return Response.json({
      periods,
      asOf: data.as_of,
      yoyAnchor: data.yoy_anchor,
      quarterAnchor: data.quarter_anchor,
      yearAnchor: data.year_anchor,
    });
  } catch {
    return Response.json({ periods: {}, degraded: true });
  }
}
