export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { CYCLE_CALIBRATION, metricFromRow, phaseOf } from "@/lib/cycle-calibration";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

// Newest-first national history, enough rows to build ~6 quarters.
async function history(slug) {
  const data = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_code=eq.US` +
      `&select=obs_date,value,yoy_change&order=obs_date.desc&limit=48`
  );
  return Array.isArray(data) ? data : [];
}

const PHASE_ORDER = ["recovery", "expansion", "hypersupply", "contraction"];

// Group basis-derived metrics into calendar quarters (avg), newest last.
function quarters(rows, basis) {
  const map = new Map();
  for (const row of rows) {
    const m = metricFromRow(row, basis);
    if (m == null || !Number.isFinite(m) || !row.obs_date) continue;
    const d = String(row.obs_date);
    const y = +d.slice(0, 4);
    const q = Math.floor((+d.slice(5, 7) - 1) / 3) + 1;
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

// Position within a phase (0..1) from how far the metric sits from its norm,
// polarity-adjusted and scaled by the norm's magnitude. Keeps dots off the
// exact phase boundary so they read clearly.
function posInPhase(metric, norm, polarity) {
  const scale = Math.abs(norm) > 1e-9 ? Math.abs(norm) : 1;
  const mag = Math.min(1, Math.abs(metric - norm) / (scale * 0.6));
  return 0.2 + mag * 0.6; // 0.2..0.8
}

export async function GET() {
  try {
    const hist = await Promise.all(CYCLE_CALIBRATION.map((c) => history(c.slug)));
    const indicators = [];
    let asOf = null;

    CYCLE_CALIBRATION.forEach((c, i) => {
      const rows = hist[i];
      if (!rows || !rows.length) return;
      const qs = quarters(rows, c.basis);
      if (qs.length < 2) return;

      const cur = qs[qs.length - 1];
      const prev = qs[qs.length - 2];
      const dir = cur.val - prev.val;
      const phase = phaseOf(cur.val, c.norm, c.polarity, dir);
      const pos = posInPhase(cur.val, c.norm, c.polarity);

      // Trail: last up-to-4 quarters as phase+pos points (oldest->newest).
      const trail = qs.slice(-5).map((q, idx, arr) => {
        const d = idx > 0 ? q.val - arr[idx - 1].val : dir;
        return {
          label: `Q${q.q} '${String(q.y).slice(2)}`,
          phase: phaseOf(q.val, c.norm, c.polarity, d),
          pos: posInPhase(q.val, c.norm, c.polarity),
        };
      });

      const latestDate = rows[0]?.obs_date || null;
      if (latestDate && (!asOf || latestDate > asOf)) asOf = latestDate;

      indicators.push({
        slug: c.slug,
        label: c.label,
        cls: c.cls,
        unit: c.unit,
        value: Math.round(cur.val * 100) / 100,
        norm: c.norm,
        polarity: c.polarity,
        phase,
        pos,
        trajectory: dir > 0 ? "rising" : dir < 0 ? "falling" : "flat",
        trail,
      });
    });

    // Aggregate lean: count indicators per phase (leading weighted, since they
    // point where the cycle is heading).
    const tally = { recovery: 0, expansion: 0, hypersupply: 0, contraction: 0 };
    for (const ind of indicators) {
      tally[ind.phase] += ind.cls === "leading" ? 1.5 : ind.cls === "coincident" ? 1 : 0.75;
    }
    let lean = null, best = -1;
    for (const p of PHASE_ORDER) if (tally[p] > best) { best = tally[p]; lean = p; }

    return Response.json({ asOf, indicators, tally, lean });
  } catch (e) {
    return Response.json({ indicators: [], tally: {}, lean: null, error: "Cycle clock unavailable." }, { status: 502 });
  }
}
