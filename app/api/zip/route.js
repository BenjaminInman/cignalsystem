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
  const rows = await sb(`v_indicator_analytics?slug=eq.${slug}&region_code=${op}.${enc}&select=obs_date,value,yoy_change,region_code&order=obs_date.desc&limit=13`);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const latest = rows[0];
  const rent = Math.round(latest.value);
  const yoyAbs = latest.yoy_change;
  const prior = yoyAbs != null ? latest.value - yoyAbs : null;
  const yoyPct = prior && prior !== 0 ? Math.round((yoyAbs / prior) * 1000) / 10 : null;
  return { code: latest.region_code, rent, yoyPct, asOf: latest.obs_date, trend: rows.slice().reverse().map((x) => Math.round(x.value)) };
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
      const z = await fetchSeries("zori_zip", zip);
      if (z) return Response.json({ found: true, grain: "zip", label: `ZIP ${zip}`, query: zip, ...z });
      const xw = (await sb(`zip_crosswalk?zip=eq.${zip}&select=*`))?.[0];
      if (xw) {
        const ladder = [
          ["city", "zori_city", xw.city_label],
          ["county", "zori_county", xw.county_label],
          ["metro", "zori_metro", xw.metro_label],
        ];
        for (const [grain, slug, code] of ladder) {
          if (!code) continue;
          const res = await fetchSeries(slug, code);
          if (res) return Response.json({ found: true, grain, label: grain === "metro" ? `${code} metro` : code, query: zip, rolledUp: true, rolledFrom: `ZIP ${zip}`, ...res });
        }
      }
      return Response.json({ found: false, query: zip, kind: "zip" });
    }

    // City, State path
    const parsed = parseCityState(q);
    if (!parsed) return Response.json({ found: false, query: q, kind: "parse", message: 'Try a format like "Austin, TX".' });
    for (const [grain, slug] of [["city", "zori_city"], ["metro", "zori_metro"], ["county", "zori_county"]]) {
      const res = await fetchSeries(slug, parsed.code, true);
      if (res) {
        const name = res.code || parsed.code;
        return Response.json({ found: true, grain, label: grain === "metro" ? `${name} metro` : name, query: q, ...res });
      }
    }
    return Response.json({ found: false, query: q, kind: "city" });
  } catch {
    return Response.json({ error: "Lookup failed. Please try again." }, { status: 502 });
  }
}
