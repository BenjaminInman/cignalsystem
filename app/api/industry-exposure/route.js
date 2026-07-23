export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Industry exposure — concentration (location quotient) crossed with LOCAL growth.
//
// WHY IT IS BUILT THIS WAY. The intuitive version of this feature is "rank industries
// nationally, then list the metros concentrated in them." That inference does not
// hold: tested across 393 metros, 35% of metro-industry pairs move in the OPPOSITE
// direction from their own national trend — 50% for Professional & Business Services,
// 53% for Mining/Construction, 63% for Other Services. A screen built on national
// trends would routinely point at markets where the industry is shrinking.
//
// So concentration is used as an EXPOSURE term only, and growth is always measured
// LOCALLY. Location quotient = (metro sector share) / (metro-universe sector share).
// LQ 2.0 means the metro is twice as concentrated in that sector as the average metro.
//
// The crossing is the signal:
//   high LQ + local growth   -> compounding      (specialization working)
//   high LQ + local decline  -> fragile          (concentration amplifies the loss)
//   low LQ  + local growth   -> diversifying     (real but diluted)
//   low LQ  + local decline  -> drag             (contained)
//
// NOT INCLUDED, deliberately: a "supporting industries" map. Tested empirically —
// median |r| across all 36 supersector pairs of local growth is 0.068, with the
// strongest linkage at 0.127. At supersector grain, industries show no detectable
// co-movement within a metro. Claiming a supply-chain relationship here would be
// asserting something the data cannot support.
//
// Grain: METRO only. Establishment-based industry employment is not published below
// the metro level by any public source.
//
// ?cbsa=34980        one metro's exposure profile
// ?sector=manufacturing  cross-market screen: who is most exposed, and how is it doing there

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const LABEL = {
  trade_transport: "Trade, Transportation & Utilities",
  education_health: "Education & Health Services",
  prof_business: "Professional & Business Services",
  government: "Government",
  leisure_hospitality: "Leisure & Hospitality",
  manufacturing: "Manufacturing",
  financial: "Financial Activities",
  other_services: "Other Services",
  mining_construction: "Mining, Logging & Construction",
  information: "Information",
};

// LQ at or above this reads as a genuine specialization rather than noise.
const CONCENTRATED = 1.2;
// Local growth inside this band is flat, not a direction.
const FLAT = 0.3;

function quadrant(lq, yoy) {
  if (yoy == null) return { key: "unknown", label: "—" };
  const conc = lq >= CONCENTRATED;
  if (Math.abs(yoy) < FLAT) {
    return conc
      ? { key: "concentrated_flat", label: "Concentrated · flat", tone: "neutral" }
      : { key: "flat", label: "Flat", tone: "neutral" };
  }
  if (conc && yoy > 0) return { key: "compounding", label: "Compounding", tone: "bull" };
  if (conc && yoy < 0) return { key: "fragile", label: "Fragile", tone: "bear" };
  if (yoy > 0) return { key: "diversifying", label: "Diversifying", tone: "bull" };
  return { key: "drag", label: "Drag", tone: "bear" };
}

async function sb(path) {
  if (!SUPA || !KEY) return null;
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 3600 },
  });
  if (!r.ok) return null;
  return r.json();
}

const METHOD = {
  lqBasis: "metro universe (329 metros reporting a complete supersector set)",
  concentratedAt: CONCENTRATED,
  sectors: 10,
  note:
    "Location quotient compares a metro's sector share to the share across all metros. Growth is always measured locally — national industry trends are not used to infer local performance, because 35% of metro-industry pairs move opposite to their national trend.",
};

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const cbsa = q.get("cbsa");
  const sector = q.get("sector");

  // ---- cross-market screen: one sector, every metro ranked by exposure ----
  if (sector) {
    if (!LABEL[sector]) {
      return Response.json({ error: "unknown sector", sectors: Object.keys(LABEL) }, { status: 400 });
    }
    const rows = await sb(
      `v_metro_industry_lq?sector=eq.${encodeURIComponent(sector)}` +
        `&select=cbsa,metro_name,employment,metro_total,lq,local_share_pct,natl_share_pct,yoy_pct,as_of` +
        `&order=lq.desc&limit=400`
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ found: false, sector });
    }
    const markets = rows.map((r) => {
      const lq = Number(r.lq);
      const yoy = r.yoy_pct == null ? null : Number(r.yoy_pct);
      return {
        cbsa: r.cbsa,
        name: (r.metro_name || "").replace(/ \(Metropolitan.*\)$/, ""),
        employment: Number(r.employment),
        lq,
        localSharePct: Number(r.local_share_pct),
        yoyPct: yoy,
        state: quadrant(lq, yoy),
      };
    });
    const conc = markets.filter((m) => m.lq >= CONCENTRATED);
    return Response.json({
      found: true,
      mode: "sector",
      sector,
      sectorLabel: LABEL[sector],
      asOf: rows[0].as_of,
      nationalSharePct: Number(rows[0].natl_share_pct),
      summary: {
        metros: markets.length,
        concentrated: conc.length,
        // Among the markets that actually depend on this sector, how many are
        // seeing it grow locally? This is the question the screen exists to answer.
        concentratedGrowing: conc.filter((m) => m.yoyPct > FLAT).length,
        concentratedDeclining: conc.filter((m) => m.yoyPct < -FLAT).length,
      },
      markets,
      method: METHOD,
    });
  }

  // ---- one metro's exposure profile ----
  if (!cbsa) {
    return Response.json({ error: "pass ?cbsa= or ?sector=", sectors: Object.keys(LABEL) }, { status: 400 });
  }
  const [rows, conc] = await Promise.all([
    sb(
      `v_metro_industry_lq?cbsa=eq.${encodeURIComponent(cbsa)}` +
        `&select=sector,employment,metro_total,lq,local_share_pct,natl_share_pct,yoy_pct,yoy_abs,as_of&order=lq.desc`
    ),
    sb(
      `v_metro_concentration?cbsa=eq.${encodeURIComponent(cbsa)}` +
        `&select=metro_name,total_employment,max_lq,top_sector,top_sector_yoy,pct_in_concentrated,weighted_growth&limit=1`
    ),
  ]);
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ found: false, cbsa });
  }
  const c = conc?.[0] || null;
  const sectors = rows.map((r) => {
    const lq = Number(r.lq);
    const yoy = r.yoy_pct == null ? null : Number(r.yoy_pct);
    return {
      sector: r.sector,
      name: LABEL[r.sector] || r.sector,
      employment: Number(r.employment),
      lq,
      localSharePct: Number(r.local_share_pct),
      natlSharePct: Number(r.natl_share_pct),
      yoyPct: yoy,
      yoyAbs: r.yoy_abs == null ? null : Number(r.yoy_abs),
      state: quadrant(lq, yoy),
    };
  });
  const fragile = sectors.filter((s) => s.state.key === "fragile");
  return Response.json({
    found: true,
    mode: "metro",
    cbsa,
    metroName: (c?.metro_name || "").replace(/ \(Metropolitan.*\)$/, ""),
    asOf: rows[0].as_of,
    concentration: c
      ? {
          maxLq: Number(c.max_lq),
          topSector: c.top_sector,
          topSectorLabel: LABEL[c.top_sector] || c.top_sector,
          topSectorYoy: c.top_sector_yoy == null ? null : Number(c.top_sector_yoy),
          pctInConcentrated: Number(c.pct_in_concentrated),
          weightedGrowth: Number(c.weighted_growth),
          totalEmployment: Number(c.total_employment),
        }
      : null,
    sectors,
    // Sectors the market is specialized in AND losing — concentration turns a
    // sector decline into a market-level problem.
    fragileSectors: fragile.map((s) => s.name),
    method: METHOD,
  });
}
