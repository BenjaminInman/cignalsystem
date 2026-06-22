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

const pctYoY = (value, yoy) => { const p = value - yoy; return p ? (yoy / p) * 100 : null; };

// Phases keyed to the operator framework (concessions, occupancy, rents — by direction).
const PHASE_POS = { "Recovery": 12, "Expansion": 38, "Hypersupply / Peak": 62, "Contraction / Recession": 85 };
const PHASE_ARCH = { "Recovery": "Irrational Desperation", "Expansion": "Exuberance", "Hypersupply / Peak": "Denial", "Contraction / Recession": "Fear" };

// rentDir: declining | stabilizing | increasing   vacDir: decreasing | stabilizing | increasing
// concDir (optional): growing | shrinking | none | null
function classifyPhase(rentDir, vacDir, concDir) {
  if (vacDir === "increasing") {
    return rentDir === "declining" ? "Contraction / Recession" : "Hypersupply / Peak";
  }
  if (vacDir === "decreasing") {
    return rentDir === "increasing" ? "Expansion" : "Recovery";
  }
  // vacancy stabilizing
  if (rentDir === "increasing") return "Expansion";
  // rents stabilizing or declining with occupancy no longer worsening = bottoming/turn.
  // concessions, when known, confirm: still growing = late contraction, shrinking = recovery.
  if (concDir === "growing") return "Contraction / Recession";
  return "Recovery";
}

export async function GET() {
  try {
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
      let tone = "neutral";
      if (dir !== 0) tone = ((b.good === "up" && dir > 0) || (b.good === "down" && dir < 0)) ? "bull" : "bear";
      return { slug: b.slug, label: b.label, kind: b.kind, unit: b.unit, value, yoy, yoyPct, z: r.zscore_12 == null ? null : Number(r.zscore_12), asOf: r.obs_date, tone };
    }).filter(Boolean);

    const get = (s) => latest[s] ? { v: Number(latest[s].value), yoy: latest[s].yoy_change == null ? null : Number(latest[s].yoy_change), z: latest[s].zscore_12 == null ? null : Number(latest[s].zscore_12), d: latest[s].obs_date } : null;

    // ---- Cycle phase: operator framework (concessions · occupancy · rents), by direction ----
    const rentHist = (await sb(`v_indicator_analytics?slug=eq.zori_national_mf&region_type=eq.national&select=obs_date,value&order=obs_date.desc&limit=7`)) || [];
    const vacHist = (await sb(`v_indicator_analytics?slug=eq.rental_vacancy&region_type=eq.national&select=obs_date,value&order=obs_date.desc&limit=5`)) || [];

    // Rents: 3-month annualized change of the smoothed ZORI MF index.
    let rentRate = null, rentDir = "stabilizing";
    if (rentHist.length >= 4) {
      const now = Number(rentHist[0].value), prior3 = Number(rentHist[3].value);
      rentRate = prior3 ? (now / prior3 - 1) * 4 * 100 : null;
      rentDir = rentRate == null ? "stabilizing" : rentRate < -1.0 ? "declining" : rentRate >= 2.0 ? "increasing" : "stabilizing";
    }
    // Vacancy: change across ~3 quarters (rising vacancy = occupancy declining).
    let vacDelta = null, vacDir = "stabilizing", vacNow = null;
    if (vacHist.length >= 4) {
      vacNow = Number(vacHist[0].value);
      vacDelta = vacNow - Number(vacHist[3].value);
      vacDir = vacDelta > 0.15 ? "increasing" : vacDelta < -0.15 ? "decreasing" : "stabilizing";
    } else if (vacHist.length) {
      vacNow = Number(vacHist[0].value);
    }
    // Concessions: no live feed yet (RealPage/CoStar/Yardi). Excluded from the decision until wired.
    const concDir = null;

    const phase = classifyPhase(rentDir, vacDir, concDir);
    const occWord = vacDir === "increasing" ? "declining" : vacDir === "decreasing" ? "improving" : "stabilizing";
    const rentWord = rentDir === "increasing" ? "rising" : rentDir === "declining" ? "declining" : "leveling";

    const cycle = {
      phase, archetype: PHASE_ARCH[phase], position: PHASE_POS[phase],
      asOf: rentHist[0]?.obs_date || null,
      basis: "Phased on the direction of three operator signals — concessions, occupancy, and rents — not absolute levels.",
      summary:
        `Occupancy is ${occWord} (vacancy ${vacNow != null ? vacNow.toFixed(1) + "%" : "—"}${vacDelta != null ? `, ${vacDelta >= 0 ? "+" : ""}${vacDelta.toFixed(1)}pp over 3 quarters` : ""}) and rents are ${rentWord}${rentRate != null ? ` (${rentRate >= 0 ? "+" : ""}${rentRate.toFixed(1)}% annualized)` : ""}. ` +
        `With occupancy ${occWord} while rents have ${rentDir === "declining" ? "turned down" : "lost their climb but held positive"}, the read is ${phase.toLowerCase()}.`,
      pillars: [
        { label: "Concessions", dir: "pending", read: "Pending feed", tone: "neutral", live: false },
        { label: "Occupancy", dir: vacDir, read: vacNow != null ? `Vacancy ${vacNow.toFixed(1)}% · ${vacDir}` : "—", tone: vacDir === "increasing" ? "bear" : vacDir === "decreasing" ? "bull" : "neutral", live: true },
        { label: "Rents", dir: rentDir, read: rentRate != null ? `${rentRate >= 0 ? "+" : ""}${rentRate.toFixed(1)}% ann. · ${rentDir}` : "—", tone: rentDir === "increasing" ? "bull" : rentDir === "declining" ? "bear" : "neutral", live: true },
      ],
    };

    // ---- Supply pipeline (context, not a phase determinant) ----
    const starts = get("mf_starts"); const permits = get("permits_5plus");
    const startsPct = starts ? pctYoY(starts.v, starts.yoy) : null;
    const supply = {
      permits: permits ? { value: permits.v, yoyPct: pctYoY(permits.v, permits.yoy), z: permits.z, asOf: permits.d } : null,
      starts: starts ? { value: starts.v, yoyPct: startsPct, z: starts.z, asOf: starts.d } : null,
      leadMonths: "18–24",
      read: starts && startsPct != null
        ? `Multifamily starts at ${starts.v.toFixed(0)}K SAAR, ${startsPct >= 0 ? "+" : ""}${startsPct.toFixed(0)}% YoY${starts.z != null ? ` (${starts.z >= 0 ? "+" : ""}${starts.z.toFixed(1)}σ)` : ""}. ` +
          (startsPct < 0
            ? "Fewer starts today means fewer deliveries in 2027–28 — pointing toward the next tightening even as today's pipeline keeps occupancy soft."
            : "A rising pipeline points to heavier deliveries ahead — watch occupancy and rents.")
        : "Supply pipeline data unavailable.",
    };

    // ---- Market forward-signal table ----
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
        if (yoyPct != null) { if (yoyPct > 0.5 && trend !== "cooling") signal = "bull"; else if (yoyPct < 0 || trend === "cooling") signal = "bear"; }
        return { city: c.city, tier: c.tier, rentYoY: yoyPct == null ? null : Math.round(yoyPct * 10) / 10, trend, migration: inMigration, signal, conf: TIER_CONF[c.tier] };
      }).sort((a, b) => (b.rentYoY ?? -99) - (a.rentYoY ?? -99));
    }

    return Response.json({ ok: true, cycle, supply, drivers, markets });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
