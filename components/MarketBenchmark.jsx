"use client";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const occ = (n) => { const v = Number(n); if (!Number.isFinite(v) || v < 0) return null; return v <= 1 ? v * 100 : v; };
const $ = (n) => (n == null || isNaN(n) ? "—" : "$" + Math.round(n).toLocaleString());
const pctPts = (n) => (n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}pp`);
const pct = (n) => (n == null || isNaN(n) ? "—" : `${n.toFixed(1)}%`);
const PH = { expansion: "#5FB97C", recovery: "#F5B544", hypersupply: "#E5634D", contraction: "#E5634D" };

export default function MarketBenchmark({ snapshot = {}, data }) {
  if (!data) return <div className="mb"><Loader2 size={13} className="spin" /> Pulling local market…<style jsx>{S}</style></div>;
  if (data.gated) return null;
  if (!data.resolved) return <div className="mb muted">Couldn’t match this property to a market — check its city/state.<style jsx>{S}</style></div>;

  const m = data.market || {};
  const phaseKey = (data.phase || "").split(/[ /]/)[0].toLowerCase();
  const covN = data.coverage && typeof data.coverage === "object"
    ? (data.coverage.property_count ?? data.coverage.n_properties ?? data.coverage.properties ?? data.coverage.count ?? null)
    : null;

  // asset blended rent = mean of the bedroom rents present
  const beds = [snapshot.avg_rent_1bed, snapshot.avg_rent_2bed, snapshot.avg_rent_3bed, snapshot.avg_rent_4bed].map(Number).filter((v) => v > 0);
  const assetRent = beds.length ? beds.reduce((a, b) => a + b, 0) / beds.length : null;
  const mktAsk = m.asking_rent, mktEff = m.effective_rent;
  const rentBase = mktEff ?? mktAsk;
  const rentGap = assetRent != null && rentBase ? (assetRent - rentBase) / rentBase * 100 : null;

  const assetOcc = occ(snapshot.physical_occupancy);
  const mktLeased = m.leased_pct != null ? (m.leased_pct <= 1 ? m.leased_pct * 100 : m.leased_pct) : null;
  const occGap = assetOcc != null && mktLeased != null ? assetOcc - mktLeased : null;

  const rg = data.rentGrowthY1 != null ? data.rentGrowthY1 * 100 : null;

  // concession as a share of rent — comparable on both sides
  const rawConc = Number(snapshot.concessions);
  const gross = Number(snapshot.total_rental_income);
  const assetConcPct = Number.isFinite(rawConc) && gross > 0 ? Math.abs(rawConc) / gross * 100 : null;
  const concBase = mktAsk || mktEff;
  let mktConcPct = m.concession != null && concBase ? (m.concession / concBase) * 100 : null;
  if (mktConcPct != null && (mktConcPct < 0 || mktConcPct > 40)) mktConcPct = null; // guard against unit surprises

  const Row = ({ label, yours, market, delta, tone, note }) => (
    <div className="row">
      <div className="rl">{label}</div>
      <div className="ry">{yours}</div>
      <div className="rm">{market}</div>
      <div className="rd" style={{ color: tone }}>{delta}{note && <span className="note">{note}</span>}</div>
    </div>
  );

  return (
    <div className="mb">
      <div className="head">
        <span className="mkt">{data.benchmark_area || data.market_name || "Market"}</span>
        {data.level === "zip" && <span className="lvl">submarket</span>}
        {data.basis === "market-rate" && <span className="lvl" style={{ color: "#5FB97C", borderColor: "#2e4a34" }}>market-rate</span>}
        {data.basis === "all-in" && <span className="lim">all-in blend (not yet segmented)</span>}
        {data.level === "metro" && data.zip_requested && <span className="lim">metro-level — ZIP {data.zip_requested} not covered</span>}
        {data.phase && <span className="phase" style={{ color: PH[phaseKey] || "#9aa0a6", borderColor: (PH[phaseKey] || "#9aa0a6") + "55" }}>{data.phase}</span>}
        {covN != null && <span className="cov">{covN} props</span>}
        {!data.covered && <span className="lim">limited local coverage</span>}
        {m.asOf && <span className="asof">HelloData · {m.asOf}</span>}
      </div>

      {data.level === "metro" && !data.zip_requested && (
        <div className="zipcta">Showing <b>metro-level</b>. Add this property’s <b>ZIP</b> in the Property section below to benchmark against its submarket instead of all of {data.market_name}.</div>
      )}

      <div className="grid">
        <div className="row hd"><div className="rl">Metric</div><div className="ry">This asset</div><div className="rm">Local market</div><div className="rd">vs market</div></div>

        <Row label="Rent (blended)"
          yours={$(assetRent)}
          market={rentBase ? `${$(rentBase)} ${mktEff ? "eff." : "ask"}` : "—"}
          delta={rentGap == null ? "—" : `${rentGap >= 0 ? "+" : ""}${rentGap.toFixed(1)}%`}
          tone={rentGap == null ? "#797E85" : rentGap < -1 ? "#F5B544" : rentGap > 1 ? "#5FB97C" : "#9aa0a6"}
          note={rentGap != null && rentGap < -2 ? " · loss-to-lease upside" : rentGap != null && rentGap > 2 ? " · premium" : ""} />

        <Row label="Occupancy"
          yours={assetOcc != null ? pct(assetOcc) : "—"}
          market={mktLeased != null ? pct(mktLeased) : "—"}
          delta={pctPts(occGap)}
          tone={occGap == null ? "#797E85" : occGap >= 0 ? "#5FB97C" : "#E5634D"} />

        {(assetConcPct != null || mktConcPct != null) && (
          <Row label="Concession (% of rent)"
            yours={assetConcPct != null ? pct(assetConcPct) : "—"}
            market={mktConcPct != null ? pct(mktConcPct) : "—"}
            delta={(assetConcPct != null && mktConcPct != null) ? pctPts(assetConcPct - mktConcPct) : ""}
            tone={(assetConcPct == null || mktConcPct == null) ? "#797E85" : assetConcPct <= mktConcPct ? "#5FB97C" : "#E5634D"} />
        )}
      </div>

      {(rg != null || m.dom != null || m.concession != null) && (
        <div className="ctx">
          <span className="ctxlabel">Market context</span>
          {rg != null && <span className="ctxi">Fwd rent growth <b style={{ color: rg < 0 ? "#E5634D" : "#5FB97C" }}>{rg >= 0 ? "+" : ""}{rg.toFixed(1)}%</b></span>}
          {m.dom != null && <span className="ctxi">Days on market <b>{Math.round(m.dom)}</b></span>}
          {m.concession != null && <span className="ctxi">Market concession <b>${Math.round(m.concession)}/mo</b></span>}
        </div>
      )}

      <p className="foot">{`Rent and concession are blended comparisons — your figures vs the ${data.level === "zip" ? "ZIP’s" : "metro’s"} ${data.basis === "market-rate" ? "conventional market-rate" : "all-in"} market (${data.basis === "market-rate" ? "student, senior & affordable excluded" : "not yet segmented"}); unit mix will differ. Concession is a share of rent on both sides. Hard market data (HelloData) sits alongside your reported actuals, never merged.`}</p>
      <style jsx>{S}</style>
    </div>
  );
}

const S = `
  .mb { font-family:'IBM Plex Mono',monospace; color:#ECEDEF; font-size:12.5px; }
  .mb.muted { color:#797E85; padding:8px 0; }
  .spin { display:inline; animation:spin 1s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
  .head { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-bottom:10px; }
  .mkt { font-weight:600; color:#ECEDEF; }
  .phase { font-size:10px; text-transform:uppercase; letter-spacing:.06em; padding:2px 8px; border-radius:999px; border:1px solid; }
  .lim { font-size:10px; color:#E8B04B; }
  .lvl { font-size:9.5px; text-transform:uppercase; letter-spacing:.06em; color:#5FB97C; border:1px solid #2e4a34; padding:2px 7px; border-radius:999px; }
  .cov { font-size:10px; color:#797E85; }
  .zipcta { font-size:11.5px; color:#E8B04B; background:rgba(245,181,68,.06); border:1px solid rgba(245,181,68,.22); border-radius:7px; padding:8px 11px; margin-bottom:10px; line-height:1.5; }
  .zipcta b { color:#F5B544; }
  .asof { font-size:10px; color:#5b5f66; margin-left:auto; }
  .grid { border:1px solid #1e2126; border-radius:8px; overflow:hidden; }
  .row { display:grid; grid-template-columns:1.5fr 1fr 1.3fr 1.4fr; gap:8px; padding:8px 12px; border-bottom:1px solid #141619; align-items:center; }
  .row:last-child { border-bottom:0; }
  .row.hd { background:#0E0F11; font-size:9.5px; letter-spacing:.06em; text-transform:uppercase; color:#5b5f66; }
  .rl { color:#9aa0a6; } .ry { color:#ECEDEF; } .rm { color:#9aa0a6; } .rd { font-weight:600; }
  .note { color:#797E85; font-weight:400; }
  .ctx { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:10px; padding:9px 12px; border:1px solid #1e2126; border-radius:8px; background:#0E0F11; }
  .ctxlabel { font-size:9.5px; text-transform:uppercase; letter-spacing:.08em; color:#5b5f66; }
  .ctxi { font-size:11.5px; color:#9aa0a6; } .ctxi b { color:#ECEDEF; font-weight:600; }
  .foot { font-size:10.5px; color:#5b5f66; margin-top:8px; line-height:1.5; }
`;
