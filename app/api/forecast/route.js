export const runtime = "nodejs";
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

// National cycle basket. kind = position in the When-first framework.
const BASKET = [
  { slug: "mf_starts", label: "Multifamily Starts", kind: "leading", unit: "K SAAR", pct: true, good: "down" },
  { slug: "permits_5plus", label: "Permits (5+ units)", kind: "leading", unit: "K SAAR", pct: true, good: "down" },
  { slug: "yield_spread", label: "Yield Curve (10y–3mo)", kind: "leading", unit: "pp", pct: false, good: "up" },
  { slug: "cli_oecd", label: "OECD Leading Index", kind: "leading", unit: "index", pct: false, good: "up" },
  { slug: "consumer_sentiment", label: "Consumer Sentiment", kind: "leading", unit: "index", pct: false, good: "up" },
  { slug: "employment", label: "Payroll Employment", kind: "leading", unit: "K", pct: false, good: "up" },
  { slug: "rental_vacancy", label: "Rental Vacancy", kind: "trailing", unit: "%", pct: false, good: "down" },
  { slug: "zori_national_mf", label: "Multifamily Rent (ZORI)", kind: "trailing", unit: "$", pct: true, good: "up" },
  { slug: "mortgage_30y", label: "30-Yr Mortgage", kind: "trailing", unit: "%", pct: false, good: "down" },
  { slug: "cpi_shelter", label: "Shelter CPI", kind: "trailing", unit: "index", pct: true, good: "down" },
];

// Curated markets → ZORI metro region_code + Norada tier (drives provisional confidence).
const CITIES = [
  { city: "Dallas, TX", metro: "Dallas, TX", tier: "Top" },
  { city: "Jersey City, NJ", metro: "New York, NY", tier: "Top" },
  { city: "Miami, FL", metro: "Miami, FL", tier: "Top" },
  { city: "Atlanta, GA", metro: "Atlanta, GA", tier: "Top" },
  { city: "Houston, TX", metro: "Houston, TX", tier: "Top" },
  { city: "Phoenix, AZ", metro: "Phoenix, AZ", tier: "Sun Belt" },
  { city: "Nashville, TN", metro: "Nashville, TN", tier: "Sun Belt" },
  { city: "Orlando, FL", metro: "Orlando, FL", tier: "Sun Belt" },
  { city: "San Antonio, TX", metro: "San Antonio, TX", tier: "Sun Belt" },
  { city: "Austin, TX", metro: "Austin, TX", tier: "Sun Belt" },
  { city: "Tampa, FL", metro: "Tampa, FL", tier: "Sun Belt" },
  { city: "Jacksonville, FL", metro: "Jacksonville, FL", tier: "Sun Belt" },
  { city: "Raleigh, NC", metro: "Raleigh, NC", tier: "Sun Belt" },
  { city: "Indianapolis, IN", metro: "Indianapolis, IN", tier: "Secondary" },
  { city: "NW Arkansas, AR", metro: "Fayetteville, AR", tier: "Secondary" },
  { city: "Colorado Springs, CO", metro: "Colorado Springs, CO", tier: "Secondary" },
  { city: "Birmingham, AL", metro: "Birmingham, AL", tier: "Secondary" },
  { city: "Salt Lake City, UT", metro: "Salt Lake City, UT", tier: "Secondary" },
  { city: "Lubbock, TX", metro: "Lubbock, TX", tier: "Secondary" },
  { city: "Savannah, GA", metro: "Savannah, GA", tier: "Secondary" },
];
const TIER_CONF = { Top: 80, "Sun Belt": 72, Secondary: 66 };

function pctYoY(value, yoy) {
  const prior = value - yoy;
  return prior ? (yoy / prior) * 100 : null;
}

export async function GET() {
  try {
    // ---- 1. National basket (latest per slug within ~400 days) ----
    const cutoff = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
    const slugs = BASKET.map((b) => b.slug).join(",");
    const rows =
      (await sb(
        `v_indicator_analytics?region_type=eq.national&slug=in.(${slugs})&obs_date=gte.${cutoff}` +
          `&select=slug,obs_date,value,yoy_change,zscore_12&order=slug.asc,obs_date.desc`
      )) || [];
    const latest = {};
    for (const r of rows) if (!latest[r.slug]) latest[r.slug] = r;

    const drivers = BASKET.map((b) => {
      const r = latest[b.slug];
      if (!r) return null;
      const value = Number(r.value);
      const yoy = r.yoy_change == null ? null : Number(r.yoy_change);
      const yoyPct = b.pct && yoy != null ? pctYoY(value, yoy) : null;
      const dir = yoy == null ? 0 : Math.sign(yoy);
      // tone: does the current direction read constructive for multifamily?
      let tone = "neutral";
      if (dir !== 0) {
        const improving = (b.good === "up" && dir > 0) || (b.good === "down" && dir < 0);
        tone = improving ? "bull" : "bear";
      }
      return {
        slug: b.slug, label: b.label, kind: b.kind, unit: b.unit,
        value, yoy, yoyPct,
        z: r.zscore_12 == null ? null : Number(r.zscore_12),
        asOf: r.obs_date, tone,
      };
    }).filter(Boolean);

    const get = (s) => latest[s] ? { v: Number(latest[s].value), yoy: latest[s].yoy_change == null ? null : Number(latest[s].yoy_change), z: latest[s].zscore_12 == null ? null : Number(latest[s].zscore_12), d: latest[s].obs_date } : null;

    // ---- 2. Cycle phase (transparent rule set over leading + confirming signals) ----
    const rent = get("zori_national_mf");
    const vac = get("rental_vacancy");
    const starts = get("mf_starts");
    const permits = get("permits_5plus");
    const emp = get("employment");

    const rentPct = rent ? pctYoY(rent.v, rent.yoy) : null;
    const vacRising = vac && vac.yoy != null ? vac.yoy > 0 : false;
    const startsPct = starts ? pctYoY(starts.v, starts.yoy) : null;
    const empGrowing = emp && emp.yoy != null ? emp.yoy > 0 : true;

    let phase, archetype, position;
    if (rentPct != null && rentPct < 0 && vacRising && !empGrowing) {
      phase = "Contraction / Recession"; archetype = "Fear"; position = 85;
    } else if (vacRising && rentPct != null && rentPct < 3) {
      phase = "Hypersupply / Peak"; archetype = "Denial"; position = 62;
    } else if (rentPct != null && rentPct >= 3 && !vacRising) {
      phase = "Expansion"; archetype = "Exuberance"; position = 38;
    } else {
      phase = "Recovery"; archetype = "Irrational Desperation"; position = 12;
    }

    const cycleSignals = [
      rent && { label: "MF Rent Growth", read: rentPct != null ? `${rentPct >= 0 ? "+" : ""}${rentPct.toFixed(1)}% YoY` : "—", tone: rentPct >= 3 ? "bull" : rentPct >= 0 ? "neutral" : "bear" },
      vac && { label: "Rental Vacancy", read: `${vac.v.toFixed(1)}% · ${vacRising ? "rising" : "falling"}`, tone: vacRising ? "bear" : "bull" },
      starts && { label: "MF Starts", read: startsPct != null ? `${startsPct >= 0 ? "+" : ""}${startsPct.toFixed(0)}% YoY` : "—", tone: startsPct < 0 ? "bull" : "neutral" },
      emp && { label: "Employment", read: emp.yoy != null ? `${emp.yoy >= 0 ? "+" : ""}${(emp.yoy / 1000).toFixed(2)}M YoY` : "—", tone: empGrowing ? "bull" : "bear" },
    ].filter(Boolean);

    const cycle = {
      phase, archetype, position,
      asOf: rent?.d || starts?.d || null,
      summary:
        `MF rent growth ${rentPct != null ? `${rentPct >= 0 ? "+" : ""}${rentPct.toFixed(1)}%` : "—"} and vacancy ${vac ? `${vac.v.toFixed(1)}% (${vacRising ? "rising" : "easing"})` : "—"} place the market in ${phase.toLowerCase()}. ` +
        `Starts ${startsPct != null ? `${startsPct >= 0 ? "+" : ""}${startsPct.toFixed(0)}% YoY` : "—"} mean the forward supply pipeline is ${startsPct != null && startsPct < 0 ? "thinning — seeding the next tightening 18–24 months out" : "still building"}.`,
      signals: cycleSignals,
    };

    // ---- 3. Supply pipeline forecast ----
    const supply = {
      permits: permits ? { value: permits.v, yoyPct: pctYoY(permits.v, permits.yoy), z: permits.z, asOf: permits.d } : null,
      starts: starts ? { value: starts.v, yoyPct: startsPct, z: starts.z, asOf: starts.d } : null,
      leadMonths: "18–24",
      read:
        starts && startsPct != null
          ? `Multifamily starts at ${starts.v.toFixed(0)}K SAAR, ${startsPct >= 0 ? "+" : ""}${startsPct.toFixed(0)}% YoY${starts.z != null ? ` (${starts.z >= 0 ? "+" : ""}${starts.z.toFixed(1)}σ)` : ""}. ` +
            (startsPct < 0
              ? "Fewer starts today means fewer deliveries in 2027–28 — a tightening setup that supports occupancy and pricing power."
              : "A rising pipeline points to heavier deliveries ahead — watch for pressure on occupancy and rents.")
          : "Supply pipeline data unavailable.",
    };

    // ---- 4. Market forward-signal table (live ZORI metro momentum + migration) ----
    let markets = [];
    const mLatest = await sb(`v_indicator_analytics?slug=eq.zori_metro&region_type=eq.metro&select=obs_date&order=obs_date.desc&limit=1`);
    if (mLatest?.length) {
      const md = mLatest[0].obs_date;
      const mrows = (await sb(`v_indicator_analytics?slug=eq.zori_metro&obs_date=eq.${md}&select=region_code,value,yoy_change,zscore_12`)) || [];
      const byCode = {};
      for (const r of mrows) byCode[r.region_code] = r;

      const mig = (await sb(`migration_rankings?select=market&order=report_year.desc`)) || [];
      const migSet = new Set(mig.map((m) => (m.market || "").split(",")[0].trim().toLowerCase()));

      markets = CITIES.map((c) => {
        const r = byCode[c.metro];
        const yoyPct = r && r.yoy_change != null ? pctYoY(Number(r.value), Number(r.yoy_change)) : null;
        const z = r && r.zscore_12 != null ? Number(r.zscore_12) : null;
        const trend = z == null ? "flat" : z > 0.3 ? "accelerating" : z < -0.3 ? "cooling" : "flat";
        const inMigration = migSet.has(c.city.split(",")[0].trim().toLowerCase());
        let signal = "neutral";
        if (yoyPct != null) {
          if (yoyPct > 0.5 && trend !== "cooling") signal = "bull";
          else if (yoyPct < 0 || trend === "cooling") signal = "bear";
        }
        return {
          city: c.city, tier: c.tier,
          rentYoY: yoyPct == null ? null : Math.round(yoyPct * 10) / 10,
          trend, migration: inMigration, signal,
          conf: TIER_CONF[c.tier],
        };
      }).sort((a, b) => (b.rentYoY ?? -99) - (a.rentYoY ?? -99));
    }

    return Response.json({ ok: true, cycle, supply, drivers, markets });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
