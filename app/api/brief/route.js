export const runtime = "nodejs";
export const revalidate = 3600;


// Rent series: the multifamily vertical reads Zillow's multifamily-only ZORI cut.
// Blending single-family rentals dilutes the apartment signal, and dilutes it most
// in the oversupplied Sun Belt metros (Austin: -2.4% blended vs -3.4% MF-only).
// This route is cached (ISR), so it does not read request headers to detect the
// vertical; it pins to the default. Revisit when the general-real-estate vertical
// needs the blended cut here.
import { DEFAULT_VERTICAL } from "@/lib/vertical-slug";
import { rentMetroSlug } from "@/lib/vertical-signals";

const RENT = rentMetroSlug(DEFAULT_VERTICAL);

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 3600 },
  });
  return r.ok ? r.json() : null;
}

const pctYoY = (value, yoy) => { const p = value - yoy; return p ? (yoy / p) * 100 : null; };

// Live signal from a metro's ZORI rent row — identical logic to /api/forecast markets.
function signalFor(row) {
  if (!row) return { signal: null, rentYoY: null, trend: null };
  const yoyPct = row.yoy_change == null ? null : pctYoY(Number(row.value), Number(row.yoy_change));
  const z = row.zscore_12 == null ? null : Number(row.zscore_12);
  const trend = z == null ? "flat" : z > 0.3 ? "accelerating" : z < -0.3 ? "cooling" : "flat";
  let signal = "neutral";
  if (yoyPct != null) {
    if (yoyPct > 0.5 && trend !== "cooling") signal = "bull";
    else if (yoyPct < 0 || trend === "cooling") signal = "bear";
  }
  return { signal, rentYoY: yoyPct == null ? null : Math.round(yoyPct * 10) / 10, trend };
}

// Compare the expert's forward lean to the live momentum signal.
function relation(expert, signal) {
  if (!signal || signal === "neutral" || !expert || expert === "neutral") return "partial";
  return expert === signal ? "converge" : "diverge";
}
const REL_ORDER = { diverge: 0, partial: 1, converge: 2 };

const leanWord = { bull: "bullish", bear: "bearish", neutral: "mixed" };
const signalWord = { bull: "firming", bear: "softening", neutral: "flat" };

export async function GET() {
  try {
    // v1: single source — Marcus & Millichap. (Multi-source is additive: more rows per market.)
    const sources = (await sb(`expert_sources?select=*&order=created_at.asc&limit=1`)) || [];
    const source = sources[0] || null;
    if (!source) return Response.json({ ok: true, source: null, rows: [], asOf: null });

    const picks = (await sb(
      `expert_picks?source_id=eq.${source.id}&select=market,region_code,rank,total_ranked,lean,note,as_of&order=rank.asc`
    )) || [];

    // Live ZORI metro signals, latest print, for just the picked metros.
    let byCode = {}, signalAsOf = null;
    const mLatest = await sb(`v_indicator_analytics?slug=eq.${RENT}&region_type=eq.metro&select=obs_date&order=obs_date.desc&limit=1`);
    if (mLatest?.length) {
      signalAsOf = mLatest[0].obs_date;
      const codes = [...new Set(picks.map((p) => p.region_code).filter(Boolean))];
      const inList = codes.map((c) => `"${c}"`).join(",");
      const mrows =
        (await sb(
          `v_indicator_analytics?slug=eq.${RENT}&obs_date=eq.${signalAsOf}&region_code=in.(${inList})&select=region_code,value,yoy_change,zscore_12`
        )) || [];
      for (const r of mrows) byCode[r.region_code] = r;
    }

    const rows = picks.map((p) => {
      const { signal, rentYoY, trend } = signalFor(byCode[p.region_code]);
      const expert = p.lean || null;
      const rel = relation(expert, signal);
      const expertSide = `${source.name} ranks it #${p.rank}/${p.total_ranked} — ${leanWord[expert] || "mixed"} on the forward score`;
      const signalSide =
        rentYoY == null
          ? "no live rent read"
          : `live rent ${rentYoY >= 0 ? "+" : ""}${rentYoY}% YoY and ${signalWord[signal] || "flat"}${trend ? ` (${trend})` : ""}`;
      return {
        market: p.market,
        regionCode: p.region_code,
        rank: p.rank,
        total: p.total_ranked,
        expertLean: expert,
        expertNote: p.note,
        signal,
        rentYoY,
        trend,
        relation: rel,
        expertSide,
        signalSide,
      };
    });

    rows.sort((a, b) => (REL_ORDER[a.relation] - REL_ORDER[b.relation]) || (a.rank - b.rank));

    const counts = rows.reduce((m, r) => ((m[r.relation] = (m[r.relation] || 0) + 1), m), {});

    return Response.json({
      ok: true,
      source: {
        name: source.name,
        report: source.report,
        lens: source.lens,
        mechanism: source.pick_mechanism,
        methodology: source.methodology,
        underlying: source.underlying_data,
        caveats: source.caveats,
        asOf: source.as_of,
      },
      signalAsOf,
      counts,
      rows,
    });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
