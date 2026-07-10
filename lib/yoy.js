// Date-based year-over-year helpers.
//
// WHY THIS EXISTS
// ---------------
// Several modules computed YoY positionally — `rows[0].value / rows[12].value`
// — on a newest-first array. That silently assumes the series has no gaps.
//
// It does. BLS never published the October 2025 CPI (the collection was
// cancelled during the shutdown), so cpi_headline / cpi_rent / cpi_shelter /
// unemployment jump straight from 2025-09 to 2025-11. On those series index 12
// is THIRTEEN months back, which overstated headline CPI as +4.27% when the
// true 12-month change was +4.17%.
//
// Always anchor a YoY to the observation dated exactly one year earlier. If no
// such observation exists, return null rather than quietly comparing the wrong
// two months.

const DAY = 86400000;

/** "2026-05-31" -> "2025-05-31". Clamps to the last valid day of the target
 *  month (2024-02-29 -> 2023-02-28). */
export function shiftYears(iso, years = -1) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const ty = y + years;
  const lastDay = new Date(Date.UTC(ty, m, 0)).getUTCDate();
  const td = Math.min(d, lastDay);
  return `${ty}-${String(m).padStart(2, "0")}-${String(td).padStart(2, "0")}`;
}

/**
 * The observation one year before `rows[0]`.
 * `rows` is newest-first: [{ date, value }].
 *
 * Exact date match is preferred. Failing that we accept the nearest
 * observation within `toleranceDays` of the anniversary — enough to absorb
 * month-end vs month-start conventions and reporting-day jitter, but far too
 * tight to silently grab a neighbouring month.
 */
export function yearAgo(rows, toleranceDays = 20) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const target = shiftYears(rows[0].date);
  const exact = rows.find((r) => r.date.slice(0, 10) === target);
  if (exact) return exact;

  const t = Date.parse(target + "T00:00:00Z");
  let best = null;
  let bestGap = Infinity;
  for (const r of rows) {
    const gap = Math.abs(Date.parse(r.date.slice(0, 10) + "T00:00:00Z") - t);
    if (gap < bestGap) {
      bestGap = gap;
      best = r;
    }
  }
  return bestGap <= toleranceDays * DAY ? best : null;
}

/** Percent change vs one year ago, or null. */
export function yoyPct(rows) {
  const base = yearAgo(rows);
  if (!base || !base.value) return null;
  return (rows[0].value / base.value - 1) * 100;
}

/** Absolute (level) change vs one year ago, or null. */
export function yoyAbs(rows) {
  const base = yearAgo(rows);
  if (!base) return null;
  return rows[0].value - base.value;
}

/** Formats a signed number without producing "-0.0" or "+-0.3". */
export function signedFixed(n, digits = 1, suffix = "") {
  const r = Number(n.toFixed(digits));
  const z = Object.is(r, -0) ? 0 : r;
  return `${z >= 0 ? "+" : ""}${z.toFixed(digits)}${suffix}`;
}
