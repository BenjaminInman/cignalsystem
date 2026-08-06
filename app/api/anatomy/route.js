import { ANATOMY } from "@/lib/anatomy";

export const runtime = "nodejs";
export const revalidate = 3600;

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Latest value + absolute YoY change for a national series, from the analytics
// view. yoy_change in the view is the ABSOLUTE change (index points / pp), not a
// percent — the caller converts per series kind.
async function latest(slug) {
  if (!SB_URL || !SB_KEY || !slug) return null;
  try {
    const url =
      `${SB_URL}/rest/v1/v_indicator_analytics` +
      `?slug=eq.${slug}&region_type=eq.national` +
      `&select=obs_date,value,yoy_change&order=obs_date.desc&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const r = rows?.[0];
    if (!r) return null;
    const value = parseFloat(r.value);
    const chg = r.yoy_change == null ? null : parseFloat(r.yoy_change);
    if (!Number.isFinite(value)) return null;
    return { value, chg: Number.isFinite(chg) ? chg : null, asOf: r.obs_date };
  } catch {
    return null;
  }
}

// Convert an analytics row to a YoY percent.
//   index/level: percent = Δ / (value − Δ) × 100   (Δ = absolute YoY change)
//   rate:        value is already a percent; YoY IS the pp change (return chg)
function yoyPct(row, kind) {
  if (!row || row.chg == null) return null;
  if (kind === "rate") return null; // rate series: report level, not a YoY%
  const base = row.value - row.chg;
  if (!base) return null;
  return (row.chg / base) * 100;
}

const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const r2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

async function build(entry) {
  const head = entry.headline?.slug ? await latest(entry.headline.slug) : null;
  const headPct = yoyPct(head, entry.headline?.kind);

  // Resolve every component's live value up front.
  const raw = await Promise.all(
    entry.components.map(async (c) => {
      const row = c.slug ? await latest(c.slug) : null;
      return { c, row };
    })
  );

  // A derived leg (e.g. 3M = 10Y − spread) needs the headline + sibling.
  const longRow = raw.find((x) => x.c.relation === "minuend")?.row || null;

  const components = raw.map(({ c, row }) => {
    let value = row ? row.value : null;
    let pctv = yoyPct(row, c.kind);
    let level = (c.kind === "rate" || c.kind === "level") && row ? row.value : null;

    // Derived short leg for the yield spread: 3M = 10Y − spread.
    if (!row && c.derive === "long_minus_spread" && longRow && head) {
      level = r2(longRow.value - head.value);
      value = level;
    }

    const contribution =
      entry.type === "weighted_sum" && c.weight != null && pctv != null
        ? (c.weight / 100) * pctv
        : entry.type === "contribution" && level != null
        ? level // the series value IS the pp contribution
        : null;

    return {
      label: c.label,
      role: c.role || null,
      cls: c.cls,
      weight: c.weight ?? null,
      relation: c.relation || null,
      fmt: c.fmt || null,
      mult: c.mult || null,
      balance: c.balance || false,
      tracked: !!row || value != null || c.balance || false,
      level: level != null ? (c.fmt ? Math.round(level) : r2(level)) : null,
      yoyPct: r1(pctv),
      contribution: r1(contribution),
      asOf: row?.asOf || null,
    };
  });

  // Balance component (e.g. CPI core-services-ex-shelter): its contribution is
  // the headline minus everything we pulled — reconciles by construction, no
  // invented number. Implied YoY is backed out from weight.
  if (entry.type === "weighted_sum") {
    const bal = components.find((c) => c.balance);
    if (bal && headPct != null) {
      const others = components.filter((c) => !c.balance).reduce((a, c) => a + (c.contribution ?? 0), 0);
      const cshare = headPct - others;
      bal.contribution = r1(cshare);
      bal.yoyPct = bal.weight ? r1((cshare / (bal.weight / 100))) : null;
    }
  }

  // Headline: baskets use their own series; contribution cards sum the parts so
  // whole and parts come from one vintage; ratio cards divide the legs; family
  // cards have no single number.
  let headline = null;
  if (entry.type === "contribution") {
    const summed = components.reduce((a, c) => a + (c.contribution ?? 0), 0);
    const asOf = components.find((c) => c.asOf)?.asOf || null;
    headline = { value: r1(summed), yoyPct: null, level: r1(summed), asOf, label: entry.headline?.label || null };
  } else if (entry.type === "ratio") {
    const num = components.find((c) => c.relation === "numerator");
    const den = components.find((c) => c.relation === "denominator");
    if (num?.level != null && den?.level) {
      const ratio = ((num.level * (num.mult || 1)) / den.level) * 100;
      headline = { value: r1(ratio), yoyPct: null, level: r1(ratio), asOf: num.asOf || den.asOf, label: entry.headline?.label || null };
    }
  } else if (head != null) {
    headline = {
      value: r2(head.value),
      yoyPct: r1(headPct),
      level: entry.headline?.kind === "rate" ? r2(head.value) : null,
      asOf: head.asOf,
    };
  }

  // Residual: only when tracked parts (incl. balance) don't reconcile to headline.
  let residual = null;
  if (entry.type === "weighted_sum" && headPct != null) {
    const summed = components.reduce((a, c) => a + (c.contribution ?? 0), 0);
    const trackedWeight = components.reduce(
      (a, c) => a + (c.contribution != null ? c.weight || 0 : 0),
      0
    );
    const gap = headPct - summed;
    if (Math.abs(gap) > 0.15 || trackedWeight < 98) {
      residual = { pp: r1(gap), untrackedWeight: r1(100 - trackedWeight) };
    }
  }

  return {
    slug: entry.slug,
    name: entry.name,
    type: entry.type,
    parentClass: entry.parentClass,
    formula: entry.formula,
    note: entry.note || null,
    sumLabel: entry.sumLabel || null,
    sumNote: entry.sumNote || null,
    sumSigned: entry.sumSigned || false,
    teach: entry.teach,
    weightsAsOf: entry.weightsAsOf || null,
    weightSource: entry.weightSource || null,
    // Licensed series carry a required attribution string that must render with
    // the card. Passed through verbatim — never abbreviated, never merged with
    // the FRED citation used elsewhere on the platform.
    citation: entry.citation || null,
    headline,
    components,
    residual,
  };
}

export async function GET() {
  try {
    const cards = await Promise.all(ANATOMY.map(build));
    return Response.json({ cards });
  } catch {
    return Response.json({ cards: [] });
  }
}
