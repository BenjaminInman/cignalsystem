
// Rent basis by grain. Zillow publishes a multifamily-only ZORI cut at NATIONAL and
// METRO grain only — there is no MF City, ZIP or County file. So:
//   * a metro lookup shows multifamily-only rent (this is a multifamily platform)
//   * a ZIP/city lookup shows the all-rentals series, because that is all that exists
//   * the parent-metro figure used for the submarket-vs-metro divergence read stays
//     ALL-RENTALS, so the comparison is like-for-like. Comparing a blended ZIP to an
//     MF-only metro would manufacture a divergence out of property mix.
import { trajectory, trajTone } from "@/lib/trajectory";

const METRO_MF = "zori_metro_mf";   // metro headline (multifamily)
const METRO_ALL = "zori_metro";     // parent context for sub-metro grains (blended)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

async function fetchSeries(slug, code, ci = false) {
  const op = ci ? "ilike" : "eq";
  const enc = encodeURIComponent(code);
  // 26 months so the rent-growth trajectory has a full 24-month fit.
  const rows = await sb(`v_indicator_analytics?slug=eq.${slug}&region_code=${op}.${enc}&select=obs_date,value,yoy_change,region_code&order=obs_date.desc&limit=26`);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const latest = rows[0];
  const rent = Math.round(latest.value);
  const yoyAbs = latest.yoy_change;
  const prior = yoyAbs != null ? latest.value - yoyAbs : null;
  const yoyPct = prior && prior !== 0 ? Math.round((yoyAbs / prior) * 1000) / 10 : null;
  const asc = rows.slice().reverse();
  // Rent GROWTH trajectory, not rent LEVEL trajectory. A market can have a falling
  // rent level while its growth rate recovers — that is the Austin case, and the
  // level trend alone hides it.
  const yoySeries = asc
    .map((x) => {
      if (x.yoy_change == null || x.value == null) return null;
      const base = x.value - x.yoy_change;
      return base ? Math.round((x.yoy_change / base) * 1000) / 10 : null;
    })
    .filter((v) => v != null);
  const traj = trajectory(yoySeries, { goodUp: true });
  return {
    code: latest.region_code, rent, yoyPct, asOf: latest.obs_date,
    trend: asc.map((x) => Math.round(x.value)),
    traj: traj ? { ...traj, tone: trajTone(traj) } : null,
  };
}

const STATES = { alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "district of columbia": "DC" };

function parseCityState(s) {
  s = s.trim().replace(/\s+/g, " ");
  let city, st;
  if (s.includes(",")) { const i = s.lastIndexOf(","); city = s.slice(0, i).trim(); st = s.slice(i + 1).trim(); }
  else { const i = s.lastIndexOf(" "); if (i < 0) return null; city = s.slice(0, i).trim(); st = s.slice(i + 1).trim(); }
  const low = st.toLowerCase();
  if (STATES[low]) st = STATES[low];
  else if (/^[A-Za-z]{2}$/.test(st)) st = st.toUpperCase();
  else return null;
  if (!city) return null;
  return { code: `${city}, ${st}` };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || searchParams.get("zip") || "").trim();
  if (!q) return Response.json({ error: "Enter a ZIP code or City, State." }, { status: 400 });

  try {
    // ZIP path
    if (/^\d{5}$/.test(q)) {
      const zip = q;
      const xw = (await sb(`zip_crosswalk?zip=eq.${zip}&select=*`))?.[0];
      const place = xw?.city_label || null; // exact "City, ST" for this ZIP
      // Parent-metro rent, for the submarket-vs-metro divergence read.
      let metro = null;
      if (xw?.metro_label) {
        const m = await fetchSeries(METRO_ALL, xw.metro_label);
        if (m) metro = { label: xw.metro_label, rent: m.rent, yoyPct: m.yoyPct, asOf: m.asOf, basis: "all rentals" };
      }
      const z = await fetchSeries("zori_zip", zip);
      if (z) return Response.json({ found: true, grain: "zip", label: `ZIP ${zip}`, place, query: zip, metro, basis: "all rentals", ...z });
      if (xw) {
        const ladder = [
          ["city", "zori_city", xw.city_label],
          ["county", "zori_county", xw.county_label],
          ["metro", METRO_MF, xw.metro_label],
        ];
        for (const [grain, slug, code] of ladder) {
          if (!code) continue;
          const res = await fetchSeries(slug, code);
          if (res) return Response.json({ found: true, grain, label: grain === "metro" ? `${code} metro` : code, place, query: zip, rolledUp: true, rolledFrom: `ZIP ${zip}`, metro: grain === "metro" ? null : metro, basis: grain === "metro" ? "multifamily" : "all rentals", ...res });
        }
      }
      return Response.json({ found: false, query: zip, kind: "zip", place });
    }

    // City, State path
    const parsed = parseCityState(q);
    if (!parsed) return Response.json({ found: false, query: q, kind: "parse", message: 'Try a format like "Austin, TX".' });
    for (const [grain, slug] of [["city", "zori_city"], ["metro", METRO_MF], ["county", "zori_county"]]) {
      const res = await fetchSeries(slug, parsed.code, true);
      if (res) {
        const name = res.code || parsed.code;
        let metro = null;
        if (grain !== "metro") {
          const m = await fetchSeries(METRO_ALL, parsed.code, true);
          if (m) metro = { label: m.code || parsed.code, rent: m.rent, yoyPct: m.yoyPct, asOf: m.asOf, basis: "all rentals" };
        }
        return Response.json({ found: true, grain, label: grain === "metro" ? `${name} metro` : name, place: name, query: q, metro, basis: grain === "metro" ? "multifamily" : "all rentals", ...res });
      }
    }
    return Response.json({ found: false, query: q, kind: "city" });
  } catch {
    return Response.json({ error: "Lookup failed. Please try again." }, { status: 502 });
  }
}
