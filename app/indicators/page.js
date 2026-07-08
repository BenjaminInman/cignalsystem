"use client";

import { useState, useEffect } from "react";
import { useContent } from "@/components/VerticalProvider";
import IndicatorCompare from "@/components/IndicatorCompare";
import PaywallBlur from "@/components/PaywallBlur";
import OnionFramework from "@/components/OnionFramework";
import SubmarketLookup from "@/components/SubmarketLookup";
import IndicatorRow from "@/components/IndicatorRow";
import AskCanary from "@/components/AskCanary";
import { layerOf, LAYER_META, SUBMARKET_FLOOR } from "@/lib/onion";

const TYPES = ["All Types", "Leading", "Trailing"];
const CATS = ["All", "Supply", "Demand", "Capital", "Macro", "Performance"];

export default function IndicatorsPage() {
  const { INDICATORS = [] } = useContent();
  const [type, setType] = useState("All Types");
  const [cat, setCat] = useState("All");
  const [layer, setLayer] = useState(null);
  const [submarketCount, setSubmarketCount] = useState(SUBMARKET_FLOOR);
  const [submarketExact, setSubmarketExact] = useState(false);
  const [live, setLive] = useState({});

  useEffect(() => {
    let on = true;
    fetch("/api/indicators")
      .then((r) => r.json())
      .then((d) => { if (on && d?.items) setLive(d.items); })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  const merged = INDICATORS.map((r) => (live[r.name] ? { ...r, ...live[r.name] } : r));

  // Stable per-layer totals for the onion (unaffected by type/cat filters).
  // Submarket has no national-catalog rows; its count reflects the local-signal
  // module — seeded from the canonical set, refined to the searched market.
  const layerCounts = merged.reduce((acc, r) => {
    const id = layerOf(r.name);
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  layerCounts.submarket = submarketCount;
  const countText = submarketExact ? {} : { submarket: `${SUBMARKET_FLOOR}+` };

  const rows = merged.filter(
    (r) =>
      (type === "All Types" || r.type === type.toUpperCase()) &&
      (cat === "All" || r.cat === cat.toUpperCase()) &&
      (!layer || layerOf(r.name) === layer)
  );

  const reRows = rows.filter((r) => r.group !== "macro");
  const macroRows = rows.filter((r) => r.group === "macro");

  const renderRow = (r) => (
    <IndicatorRow
      key={r.name}
      row={r}
      ask={live[r.name] ? `What is ${r.name} telling us right now, and is it a leading or lagging signal?` : undefined}
    />
  );

  const SectionHead = ({ label, count }) => (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-signal/60" />
      <h2 className="mono text-[12px] tracking-[0.2em] text-signal">{label}</h2>
      <span className="mono text-[11px] text-muted">{count}</span>
    </div>
  );

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Economic Indicators</h1>
      <p className="mt-3 max-w-2xl text-muted">Comprehensive leading and trailing indicators driving multifamily performance. Select any indicator to expand the detail.</p>
      <div className="mt-5"><AskCanary variant="pill" question="How do the leading indicators compare to the lagging ones right now?" /></div>

      <PaywallBlur
        page="indicators"
        title="The Onion Framework"
        hard
        wrapClass="mt-8"
        blurb="The proprietary lens at the core of the Cignal method — it organizes every signal into layered rings so you can read the cycle from the outside in. Unlock it with Pro."
      >
        <OnionFramework active={layer} onSelect={setLayer} counts={layerCounts} countText={countText} />
      </PaywallBlur>

      {layer !== "submarket" && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-[var(--line)] p-1">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} className={`mono rounded px-3 py-1.5 text-[12px] tracking-[0.04em] ${type === t ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"}`}>{t}</button>
            ))}
          </div>
          <div className="inline-flex flex-wrap gap-1">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`mono rounded-md border px-3 py-1.5 text-[12px] tracking-[0.04em] ${cat === c ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {layer === "submarket" ? (
        <SubmarketLookup onCount={(n) => { setSubmarketCount(n); setSubmarketExact(true); }} />
      ) : layer ? (
        <div className="mt-10">
          <SectionHead label={`LAYER ${LAYER_META[layer].num} · ${LAYER_META[layer].label.toUpperCase()}`} count={rows.length} />
          <div className="mt-4 space-y-4">{rows.map(renderRow)}</div>
          {rows.length === 0 && (
            <p className="mono mt-4 rounded-lg border border-[var(--line)] p-8 text-center text-sm text-muted">No indicators match this filter.</p>
          )}
        </div>
      ) : (
        <>
          {reRows.length > 0 && (
            <div className="mt-10">
              <SectionHead label="REAL ESTATE INDICATORS" count={reRows.length} />
              <div className="mt-4 space-y-4">{reRows.map(renderRow)}</div>
            </div>
          )}

          {macroRows.length > 0 && (
            <div className="mt-12">
              <SectionHead label="NON–REAL ESTATE INDICATORS" count={macroRows.length} />
              <div className="mt-4 space-y-4">{macroRows.map(renderRow)}</div>
            </div>
          )}

          {rows.length === 0 && <p className="mono mt-8 rounded-lg border border-[var(--line)] p-8 text-center text-sm text-muted">No indicators match this filter.</p>}
        </>
      )}

      <PaywallBlur
        page="indicators"
        title="Indicator Comparison"
        blurb="Layer multiple indicators on one timeline to read divergence and confirmation across the cycle. Pro unlocks the full comparison studio."
      >
        <IndicatorCompare />
      </PaywallBlur>
    </div>
  );
}
