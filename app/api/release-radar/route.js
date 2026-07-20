export const runtime = "nodejs";
export const revalidate = 1800;

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cycle-moving releases to track. `show` controls the headline number:
//   yoy      → year-over-year % (index series)
//   level    → the value as-is (rates)
//   level_k  → value in thousands
//   mom_k    → month-over-month change in thousands
const RADAR = [
  { slug: "cpi_headline", label: "CPI", cat: "Prices", show: "yoy", freq: "monthly" },
  { slug: "employment", label: "Jobs (payrolls)", cat: "Labor", show: "mom_k", freq: "monthly" },
  { slug: "unemployment", label: "Unemployment", cat: "Labor", show: "level", suffix: "%", freq: "monthly" },
  { slug: "ppi", label: "PPI", cat: "Prices", show: "yoy", freq: "monthly" },
  { slug: "pce_inflation", label: "PCE", cat: "Prices", show: "yoy", freq: "monthly" },
  { slug: "gdp", label: "Real GDP", cat: "Growth", show: "level", suffix: "%", note: "annualized", freq: "quarterly" },
  { slug: "mf_starts", label: "MF Starts", cat: "Housing", show: "level_k", freq: "monthly" },
  { slug: "treasury_10y", label: "10Y Treasury", cat: "Rates", show: "level", suffix: "%", freq: "daily" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d) => { const t = new Date(d); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}`; };
const fmtMonth = (d) => { const t = new Date(d); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };

function nextEstimate(releaseDate, freq) {
  if (!releaseDate) return null;
  const t = new Date(releaseDate);
  if (freq === "daily") return "daily";
  if (freq === "quarterly") t.setUTCMonth(t.getUTCMonth() + 3);
  else t.setUTCMonth(t.getUTCMonth() + 1);
  return `~${fmtDate(t)}`;
}

async function fetchSeries(slug) {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const url =
      `${SB_URL}/rest/v1/observations` +
      `?select=obs_date,value,release_date,indicators!inner(slug),regions!inner(region_type)` +
      `&indicators.slug=eq.${slug}&regions.region_type=eq.national&revision=eq.0` +
      `&order=obs_date.desc&limit=14`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.length ? rows : null;
  } catch {
    return null;
  }
}

function buildItem(cfg, rows) {
  const latest = rows[0];
  const prior = rows[1];
  const yearAgo = rows[12] || rows[rows.length - 1];
  const v = parseFloat(latest.value);
  const p = prior ? parseFloat(prior.value) : null;
  const ya = yearAgo ? parseFloat(yearAgo.value) : null;

  let value, change, dir = "flat";
  if (cfg.show === "yoy" && ya) {
    const yoy = ((v - ya) / ya) * 100;
    value = `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%`;
    if (p) { const pyoy = ((p - parseFloat(rows[13]?.value || rows[rows.length - 1].value)) / parseFloat(rows[13]?.value || rows[rows.length - 1].value)) * 100; dir = yoy > pyoy ? "up" : yoy < pyoy ? "down" : "flat"; }
    change = "YoY";
  } else if (cfg.show === "mom_k") {
    value = p != null ? `${v - p >= 0 ? "+" : ""}${Math.round(v - p)}K` : `${Math.round(v)}K`;
    dir = p != null ? (v > p ? "up" : v < p ? "down" : "flat") : "flat";
    change = "MoM";
  } else if (cfg.show === "level_k") {
    value = `${Math.round(v)}K`;
    dir = p != null ? (v > p ? "up" : v < p ? "down" : "flat") : "flat";
    change = p != null ? `${v - p >= 0 ? "+" : ""}${Math.round(v - p)}K MoM` : "";
  } else { // level
    value = `${v.toFixed(cfg.suffix === "%" ? 1 : 2)}${cfg.suffix || ""}`;
    dir = p != null ? (v > p ? "up" : v < p ? "down" : "flat") : "flat";
    change = p != null ? `${v - p >= 0 ? "+" : ""}${(v - p).toFixed(2)} vs prior` : "";
  }

  return {
    slug: cfg.slug,
    label: cfg.label,
    cat: cfg.cat,
    note: cfg.note || null,
    value,
    change,
    dir,
    period: fmtMonth(latest.obs_date),
    released: latest.release_date ? fmtDate(latest.release_date) : null,
    releasedRaw: latest.release_date || null,
    next: nextEstimate(latest.release_date, cfg.freq),
  };
}

export async function GET() {
  try {
    const results = await Promise.all(
      RADAR.map(async (cfg) => {
        const rows = await fetchSeries(cfg.slug);
        return rows ? buildItem(cfg, rows) : null;
      })
    );
    // freshest releases first
    const items = results.filter(Boolean).sort((a, b) => {
      if (!a.releasedRaw) return 1;
      if (!b.releasedRaw) return -1;
      return new Date(b.releasedRaw) - new Date(a.releasedRaw);
    });
    return Response.json({ items });
  } catch {
    return Response.json({ items: [] });
  }
}
