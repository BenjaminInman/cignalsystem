"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useContent } from "@/components/VerticalProvider";
import IndicatorCompare from "@/components/IndicatorCompare";
import PaywallBlur from "@/components/PaywallBlur";
import OnionFramework from "@/components/OnionFramework";
import SubmarketLookup from "@/components/SubmarketLookup";
import IndicatorRow from "@/components/IndicatorRow";
import AskCanary from "@/components/AskCanary";
import { layerOf, LAYER_META, SUBMARKET_FLOOR } from "@/lib/onion";
import { groupRows, RE_GROUPS, MACRO_GROUPS } from "@/lib/indicator-groups";

const TYPES = ["All Types", "Leading", "Coincident", "Trailing"];
const CATS = ["All", "Supply", "Demand", "Capital", "Macro", "Performance"];

export default function IndicatorsPage() {
  const { INDICATORS = [] } = useContent();
  const [type, setType] = useState("All Types");
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
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

  // INDICATORS supplies the editorial content — name, category, classification,
  // the measures/impact copy. It must never supply the NUMBER. Any row the feed
  // doesn't cover shows a dash instead of the pack's sample value, which would
  // otherwise render as live and silently freeze at whatever was last typed in.
  // (Seven consumer-credit rows did exactly that: their statics matched reality
  // the day they were written and would have drifted at the next print.)
  const merged = INDICATORS.map((r) =>
    live[r.name]
      ? { ...r, ...live[r.name] }
      : { ...r, value: "—", change: "", trend: null, live: false }
  );

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

  // Free-text search across name, note and unit. With ~68 indicators the type
  // and category chips are no longer enough to FIND a specific series -- the
  // list is comprehensive by design, so it needs a way in. Matching the note
  // and unit as well means "jobs", "treasury" or "census" all land somewhere
  // useful, not just exact titles.
  const q = query.trim().toLowerCase();
  const rows = merged.filter(
    (r) =>
      (type === "All Types" || r.type === type.toUpperCase()) &&
      (cat === "All" || r.cat === cat.toUpperCase()) &&
      (!layer || layerOf(r.name) === layer) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q) ||
        (r.unit || "").toLowerCase().includes(q))
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

  // Quieter than SectionHead: these divide a section, they don't announce one.
  const SubHead = ({ label, count }) => (
    <div className="mt-7 flex items-center gap-3 first:mt-4">
      <h3 className="mono text-[11px] tracking-[0.16em] text-muted">{label}</h3>
      <span className="h-px flex-1 bg-[var(--line)]" />
      <span className="mono text-[10px] text-muted">{count}</span>
    </div>
  );

  // Like-kind indicators together, in a fixed reading order. Filters can empty a
  // subgroup; groupRows drops those rather than leaving a bare heading.
  const renderGrouped = (list, order) =>
    groupRows(list, order).map(([g, rs]) => (
      <div key={g}>
        <SubHead label={g.toUpperCase()} count={rs.length} />
        <div className="mt-3 space-y-4">{rs.map(renderRow)}</div>
      </div>
    ));

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Economic Indicators</h1>
      <p className="mt-3 max-w-2xl text-muted">Comprehensive leading and trailing indicators driving multifamily performance. Select any indicator to expand the detail.</p>
      <div className="mt-5"><AskCanary variant="pill" question="How do the leading indicators compare to the lagging ones right now?" /></div>

      {/* The Onion is the Cignal+ differentiator on this page: Pro opens the
          Indicators tab itself, the top tier opens the lens over it. `hard`
          keeps it out of the DOM entirely for everyone below — this is the
          method, not a chart. */}
      <PaywallBlur
        page="indicators"
        title="The Onion Framework"
        hard
        minTier="cignal_plus"
        wrapClass="mt-8"
        blurb="The proprietary lens at the core of the Cignal method — it organizes every signal into layered rings so you can read the cycle from the outside in. Unlock it with Cignal+."
      >
        <OnionFramework active={layer} onSelect={setLayer} counts={layerCounts} countText={countText} />
      </PaywallBlur>

      {layer !== "submarket" && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search indicators…"
              aria-label="Search indicators"
              className="mono w-56 rounded-md border border-[var(--line)] bg-transparent py-1.5 pl-8 pr-7 text-[12px] tracking-[0.04em] text-ink placeholder:text-muted focus:border-signal/40 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </div>
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
              {renderGrouped(reRows, RE_GROUPS)}
            </div>
          )}

          {macroRows.length > 0 && (
            <div className="mt-12">
              <SectionHead label="NON–REAL ESTATE INDICATORS" count={macroRows.length} />
              {renderGrouped(macroRows, MACRO_GROUPS)}
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
