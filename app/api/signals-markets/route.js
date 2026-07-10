export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sb, mean, stdev } from "@/lib/signals-engine";
import { verticalFromRequest } from "@/lib/vertical-request";
import { rentMetroSlug } from "@/lib/vertical-signals";
import { trajectory, trajTone } from "@/lib/trajectory";

// Principal CBSA per metro, paired with its Zillow ZORI metro label. Jobs +
// vacancy key by CBSA; rent keys by the "City, ST" label — this is the bridge.
const METROS = [
  { name: "Austin, TX", cbsa: "12420", zori: "Austin, TX" },
  { name: "Nashville, TN", cbsa: "34980", zori: "Nashville, TN" },
  { name: "Phoenix, AZ", cbsa: "38060", zori: "Phoenix, AZ" },
  { name: "Charlotte, NC", cbsa: "16740", zori: "Charlotte, NC" },
  { name: "Dallas, TX", cbsa: "19100", zori: "Dallas, TX" },
  { name: "Denver, CO", cbsa: "19740", zori: "Denver, CO" },
  { name: "Atlanta, GA", cbsa: "12060", zori: "Atlanta, GA" },
  { name: "Tampa, FL", cbsa: "45300", zori: "Tampa, FL" },
  { name: "Orlando, FL", cbsa: "36740", zori: "Orlando, FL" },
  { name: "Houston, TX", cbsa: "26420", zori: "Houston, TX" },
  { name: "Raleigh, NC", cbsa: "39580", zori: "Raleigh, NC" },
  { name: "Miami, FL", cbsa: "33100", zori: "Miami, FL" },
  { name: "Seattle, WA", cbsa: "42660", zori: "Seattle, WA" },
  { name: "Las Vegas, NV", cbsa: "29820", zori: "Las Vegas, NV" },
  { name: "Salt Lake City, UT", cbsa: "41620", zori: "Salt Lake City, UT" },
  { name: "San Antonio, TX", cbsa: "41700", zori: "San Antonio, TX" },
  { name: "Jacksonville, FL", cbsa: "27260", zori: "Jacksonville, FL" },
  { name: "Boise City, ID", cbsa: "14260", zori: "Boise City, ID" },
  { name: "Columbus, OH", cbsa: "18140", zori: "Columbus, OH" },
];

// YoY% history for a slug across a specific set of region codes (region-filtered
// so the query is indexed and fast — an unfiltered scan trips the anon timeout).
// Returns { code: [{ d, v }] } ascending, plus a convenience latest map.
// 19 metros x 26 months = ~494 rows, comfortably under PostgREST's 1000-row cap.
async function seriesYoY(slug, codes, months = 26) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const inList = codes
    .map((c) => (/[,\s]/.test(c) ? `"${c}"` : c))
    .join(",")
    .replace(/ /g, "%20");
  const rows = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_code=in.(${inList})` +
      `&obs_date=gte.${since.toISOString().slice(0, 10)}` +
      `&select=region_code,obs_date,value,yoy_change&order=obs_date.asc&limit=1000`
  );
  const hist = {};
  for (const r of rows || []) {
    if (r.yoy_change == null || r.value == null) continue;
    const base = r.value - r.yoy_change;
    if (!base) continue;
    const v = Math.round((r.yoy_change / base) * 1000) / 10;
    (hist[r.region_code] ||= []).push({ d: r.obs_date, v });
  }
  const latest = {};
  for (const [code, arr] of Object.entries(hist)) latest[code] = arr[arr.length - 1].v;
  return { hist, latest };
}

const z = (v, m, s) => (s ? (v - m) / s : 0);

export async function GET(req) {
  try {
    const vertical = verticalFromRequest(req);
    // Multifamily site reads the MF-only rent cut; blending SFR understates
    // apartment softness (Austin: -2.4% blended vs -3.4% multifamily-only).
    const rentSlug = rentMetroSlug(vertical);
    const cbsas = METROS.map((m) => m.cbsa);
    const zoris = [...new Set(METROS.map((m) => m.zori))];
    const [jobsS, rentsS] = await Promise.all([
      seriesYoY("bls_metro_employment", cbsas),
      seriesYoY(rentSlug, zoris),
    ]);
    const jobs = jobsS.latest, rents = rentsS.latest;

    let rows = METROS.map((m) => {
      // Trajectory is a TIME-SERIES read (this market vs its own past 24 months),
      // deliberately separate from the cross-sectional z-scores below (this market
      // vs its peers today). A -3.4% rent that has climbed from -5.2% is a very
      // different asset than a +0.6% rent that has fallen from +1.9%.
      const rentTraj = trajectory((rentsS.hist[m.zori] || []).map((x) => x.v), { goodUp: true });
      const jobsTraj = trajectory((jobsS.hist[m.cbsa] || []).map((x) => x.v), { goodUp: true });
      return {
        name: m.name,
        jobsYoY: jobs[m.cbsa] ?? null,
        rentYoY: rents[m.zori] ?? null,
        rentTraj: rentTraj ? { ...rentTraj, tone: trajTone(rentTraj) } : null,
        jobsTraj: jobsTraj ? { ...jobsTraj, tone: trajTone(jobsTraj) } : null,
      };
    }).filter((r) => r.jobsYoY != null && r.rentYoY != null);

    // Cross-sectional standardization: how each metro's leading (jobs) and
    // lagging (rents) reads compare to the peer set.
    const jv = rows.map((r) => r.jobsYoY), rv = rows.map((r) => r.rentYoY);
    const jm = mean(jv), js = stdev(jv), rm = mean(rv), rs = stdev(rv);

    rows = rows.map((r) => {
      const zj = z(r.jobsYoY, jm, js); // leading
      const zr = z(r.rentYoY, rm, rs); // lagging
      const gap = Math.round((zj - zr) * 100) / 100; // + = jobs ahead of rents
      // Bearish divergence = lagging propped above softening leading (gap < 0).
      const tone = gap > 0.6 ? "bull" : gap < -0.6 ? "bear" : "neutral";
      const read =
        gap > 0.6 ? "jobs outrunning rents" : gap < -0.6 ? "rents holding above jobs" : "in line";
      return { ...r, zj: Math.round(zj * 100) / 100, zr: Math.round(zr * 100) / 100, gap, tone, read, mag: Math.abs(gap) };
    })
      .sort((a, b) => b.mag - a.mag);

    return Response.json({ markets: rows.slice(0, 10), count: rows.length });
  } catch (e) {
    return Response.json({ error: "markets divergence unavailable" }, { status: 502 });
  }
}
