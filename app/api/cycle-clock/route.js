export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { CYCLE_CALIBRATION, metricFromRow, phaseOf } from "@/lib/cycle-calibration";
import { createClient } from "@/lib/supabase/server";
import { hasTier } from "@/lib/tiers";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The Cycle Clock is a Pro feature. Its endpoint is gated to match the page so
// the read isn't reachable by hitting the API directly.
async function isEntitled() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).single();
    return !!prof?.is_admin || hasTier(prof?.tier, "pro");
  } catch {
    return false;
  }
}

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

// Look back ~5 years so every frequency forms multiple quarters: daily series
// (Treasury) aren't truncated to a couple months, and annual series (county GDP)
// still return several points.
const LOOKBACK = (() => { const d = new Date(); d.setMonth(d.getMonth() - 60); return d.toISOString().slice(0, 10); })();

async function hist(slug, code, limit = 2000) {
  const data = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_code=eq.${encodeURIComponent(code)}` +
      `&obs_date=gte.${LOOKBACK}&select=obs_date,value,yoy_change&order=obs_date.desc&limit=${limit}`
  );
  return Array.isArray(data) ? data : [];
}

const PHASE_ORDER = ["recovery", "expansion", "hypersupply", "contraction"];

function quarters(rows, basis) {
  const map = new Map();
  for (const row of rows) {
    const m = metricFromRow(row, basis);
    if (m == null || !Number.isFinite(m) || !row.obs_date) continue;
    const d = String(row.obs_date);
    const y = +d.slice(0, 4), q = Math.floor((+d.slice(5, 7) - 1) / 3) + 1;
    const key = `${y}-${q}`;
    const cur = map.get(key) || { sum: 0, n: 0, y, q };
    cur.sum += m; cur.n += 1; map.set(key, cur);
  }
  const now = new Date();
  const curKey = `${now.getFullYear()}-${Math.floor(now.getMonth() / 3) + 1}`;
  return [...map.values()]
    .sort((a, b) => (a.y - b.y) || (a.q - b.q))
    .filter((x) => `${x.y}-${x.q}` !== curKey && x.n >= 1)
    .map((x) => ({ y: x.y, q: x.q, val: x.sum / x.n }));
}

function posInPhase(metric, norm, polarity) {
  const scale = Math.abs(norm) > 1e-9 ? Math.abs(norm) : 1;
  const mag = Math.min(1, Math.abs(metric - norm) / (scale * 0.6));
  return 0.2 + mag * 0.6;
}

// Build one indicator dot. If cfg.norm is null, self-calibrate from this
// series' own history mean (used for local signals so each market is measured
// against its own normal).
function buildIndicator(rows, cfg) {
  if (!rows || !rows.length) return null;
  const qs = quarters(rows, cfg.basis);
  if (qs.length < 2) return null;
  const norm = cfg.norm != null ? cfg.norm : qs.reduce((a, q) => a + q.val, 0) / qs.length;
  const cur = qs[qs.length - 1], prev = qs[qs.length - 2];
  const dir = cur.val - prev.val;
  const trail = qs.slice(-5).map((q, idx, arr) => {
    const d = idx > 0 ? q.val - arr[idx - 1].val : dir;
    return { label: `Q${q.q} '${String(q.y).slice(2)}`, phase: phaseOf(q.val, norm, cfg.polarity, d), pos: posInPhase(q.val, norm, cfg.polarity) };
  });
  return {
    slug: cfg.slug, label: cfg.label, cls: cfg.cls, unit: cfg.unit, ring: cfg.ring,
    grain: cfg.grain || "National",
    value: Math.round(cur.val * 100) / 100,
    norm: Math.round(norm * 100) / 100,
    polarity: cfg.polarity,
    phase: phaseOf(cur.val, norm, cfg.polarity, dir),
    pos: posInPhase(cur.val, norm, cfg.polarity),
    trajectory: dir > 0 ? "rising" : dir < 0 ? "falling" : "flat",
    trail, latest: rows[0]?.obs_date || null,
  };
}

// ---- local resolution (mirrors the market-read ladder) ----
const LOCAL_CONFIG = {
  rent:    { slug: "rent_local",    label: "Rent Growth",   cls: "coincident", unit: "% YoY", polarity: 1,  basis: "yoyPct" },
  vacancy: { slug: "vacancy_local", label: "Vacancy",       cls: "trailing",   unit: "%",     polarity: -1, basis: "value" },
  jobs:    { slug: "jobs_local",    label: "Job Growth",    cls: "leading",    unit: "% YoY", polarity: 1,  basis: "yoyPct" },
  unemp:   { slug: "unemp_local",   label: "Unemployment",  cls: "trailing",   unit: "%",     polarity: -1, basis: "value" },
  wages:   { slug: "wages_local",   label: "Wage Growth",   cls: "coincident", unit: "% YoY", polarity: 1,  basis: "yoyPct" },
  gdp:     { slug: "gdp_local",     label: "Local GDP",     cls: "coincident", unit: "% YoY", polarity: 1,  basis: "yoyPct" },
};

async function rentLadder(zip, xw) {
  const z = await hist("zori_zip", zip);
  if (z.length) return { rows: z, grain: "ZIP" };
  for (const [slug, code, grain] of [["zori_city", xw?.city_label, "City"], ["zori_county", xw?.county_label, "County"], ["zori_metro_mf", xw?.metro_label, "Metro"]]) {
    if (!code) continue;
    const rs = await hist(slug, code);
    if (rs.length) return { rows: rs, grain };
  }
  return null;
}

async function localIndicators(zip) {
  const xw = (await sb(`zip_crosswalk?zip=eq.${zip}&select=city_label,county_label,metro_label`))?.[0] || null;
  const cbsaRow = (await sb(`zip_cbsa_crosswalk?zip=eq.${zip}&select=cbsa,res_ratio&order=res_ratio.desc&limit=1`))?.[0];
  const cbsa = cbsaRow?.cbsa || null;
  const county = xw?.county_label || null;
  let metroName = null;
  if (cbsa) metroName = (await sb(`regions?code=eq.${cbsa}&region_type=eq.metro&select=name&limit=1`))?.[0]?.name || null;

  const rent = await rentLadder(zip, xw);
  const [vac, jobs, unemp, wages, gdp] = await Promise.all([
    cbsa ? hist("apt_vacancy", cbsa) : Promise.resolve(null),
    cbsa ? hist("bls_metro_employment", cbsa) : Promise.resolve(null),
    cbsa ? hist("bls_metro_unemployment", cbsa) : Promise.resolve(null),
    county ? hist("county_wages", county) : Promise.resolve(null),
    county ? hist("gdp_county", county) : Promise.resolve(null),
  ]);

  const out = [];
  const push = (rows, key, grain) => {
    const ind = buildIndicator(rows, { ...LOCAL_CONFIG[key], ring: "local", norm: null, grain });
    if (ind) out.push(ind);
  };
  if (rent) push(rent.rows, "rent", rent.grain);
  push(vac, "vacancy", "Metro");
  push(jobs, "jobs", "Metro");
  push(unemp, "unemp", "Metro");
  push(wages, "wages", "County");
  push(gdp, "gdp", "County");

  return { local: out, market: { cbsa, county, metroName, grain: rent?.grain || (cbsa ? "Metro" : null) } };
}

export async function GET(req) {
  try {
    if (!(await isEntitled())) {
      return Response.json({ indicators: [], national: [], local: [], tally: {}, lean: null, gated: true }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const zipRaw = (searchParams.get("zip") || "").trim();
    const zip = /^\d{5}$/.test(zipRaw) ? zipRaw : null;

    const natHist = await Promise.all(CYCLE_CALIBRATION.map((c) => hist(c.slug, "US")));
    const national = [];
    natHist.forEach((rows, i) => {
      const ind = buildIndicator(rows, { ...CYCLE_CALIBRATION[i], ring: "national", grain: "National" });
      if (ind) national.push(ind);
    });

    let local = [], market = null, localCoverage = null;
    if (zip) {
      const res = await localIndicators(zip);
      local = res.local; market = res.market;
      localCoverage = local.length > 0;
    }

    const indicators = [...national, ...local];
    let asOf = null;
    for (const x of indicators) if (x.latest && (!asOf || x.latest > asOf)) asOf = x.latest;

    const tally = { recovery: 0, expansion: 0, hypersupply: 0, contraction: 0 };
    for (const ind of indicators) tally[ind.phase] += ind.cls === "leading" ? 1.5 : ind.cls === "coincident" ? 1 : 0.75;
    let lean = null, best = -1;
    for (const p of PHASE_ORDER) if (tally[p] > best) { best = tally[p]; lean = p; }

    return Response.json({ asOf, indicators, national, local, tally, lean, zip, market, localCoverage });
  } catch (e) {
    return Response.json({ indicators: [], national: [], local: [], tally: {}, lean: null, error: "Cycle clock unavailable." }, { status: 502 });
  }
}
