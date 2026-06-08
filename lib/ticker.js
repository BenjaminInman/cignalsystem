import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });

/* ---------- 10Y Treasury — U.S. Treasury par-yield feed (no API key, ~daily) ---------- */

const tFeed = (yyyymm) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${yyyymm}`;

async function treasuryMonth(yyyymm) {
  const res = await fetch(tFeed(yyyymm), {
    next: { revalidate: 21600 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CignalSystem/1.0)" },
  });
  if (!res.ok) return [];
  const j = parser.parse(await res.text());
  let entries = j?.feed?.entry || [];
  if (!Array.isArray(entries)) entries = [entries];
  return entries.map((e) => e?.content?.properties).filter(Boolean);
}

async function treasury10Y() {
  try {
    const now = new Date();
    const ym = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    let props = await treasuryMonth(ym(now));
    if (props.length < 2) {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      props = [...(await treasuryMonth(ym(prev))), ...props];
    }
    props.sort((a, b) => new Date(a.NEW_DATE) - new Date(b.NEW_DATE));
    const valid = props.filter((p) => Number.isFinite(parseFloat(p.BC_10YEAR)));
    if (!valid.length) return null;
    const latest = parseFloat(valid[valid.length - 1].BC_10YEAR);
    const prior = valid.length > 1 ? parseFloat(valid[valid.length - 2].BC_10YEAR) : latest;
    const bps = Math.round((latest - prior) * 100);
    return {
      value: `${latest.toFixed(2)}%`,
      delta: `${bps > 0 ? "+" : ""}${bps}bps`,
      dir: bps <= 0 ? "up" : "down",
      live: true,
    };
  } catch {
    return null;
  }
}

/* ---------- Macro series — FRED (free API key required, set FRED_API_KEY) ---------- */

async function fred(seriesId, limit) {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.observations || []).map((o) => parseFloat(o.value)).filter((v) => Number.isFinite(v));
  } catch {
    return null;
  }
}

async function macroFromFred() {
  const out = {};
  if (!process.env.FRED_API_KEY) return out;

  // Multifamily starts — Housing Starts: 5+ Unit Structures (thousands, SAAR, monthly)
  const starts = await fred("HOUST5F", 3);
  if (starts && starts.length >= 2) {
    const pct = ((starts[0] - starts[1]) / starts[1]) * 100;
    out["MULTIFAMILY STARTS"] = { value: `${Math.round(starts[0])}K`, delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, dir: pct >= 0 ? "up" : "down", live: true };
  }

  // Rental vacancy rate (%, quarterly)
  const vac = await fred("RRVRUSQ156N", 3);
  if (vac && vac.length >= 2) {
    const dpp = vac[0] - vac[1];
    out["NATIONAL VACANCY"] = { value: `${vac[0].toFixed(1)}%`, delta: `${dpp >= 0 ? "+" : ""}${dpp.toFixed(1)}pp`, dir: dpp <= 0 ? "up" : "down", live: true };
  }

  // CPI shelter (SA index, monthly) → YoY
  const shelter = await fred("CUSR0000SAH1", 14);
  if (shelter && shelter.length >= 13) {
    const yoy = (shelter[0] / shelter[12] - 1) * 100;
    const prevYoy = shelter.length >= 14 ? (shelter[1] / shelter[13] - 1) * 100 : yoy;
    const d = yoy - prevYoy;
    out["CPI SHELTER"] = { value: `+${yoy.toFixed(1)}%`, delta: `${d >= 0 ? "+" : ""}${d.toFixed(1)}pp`, dir: d <= 0 ? "up" : "down", live: true };
  }

  // Total nonfarm payrolls (thousands, monthly) → YoY growth, MoM delta
  const pay = await fred("PAYEMS", 14);
  if (pay && pay.length >= 13) {
    const yoy = (pay[0] / pay[12] - 1) * 100;
    const mom = ((pay[0] - pay[1]) / pay[1]) * 100;
    out["EMPLOYMENT GROWTH"] = { value: `+${yoy.toFixed(1)}%`, delta: `${mom >= 0 ? "+" : ""}${mom.toFixed(1)}%`, dir: yoy >= 0 ? "up" : "down", live: true };
  }

  return out;
}

export async function getTicker() {
  const items = {};
  const t10 = await treasury10Y();
  if (t10) items["10Y TREASURY"] = t10;
  Object.assign(items, await macroFromFred());
  return items;
}
