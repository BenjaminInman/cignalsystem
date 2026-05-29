"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { INDICATORS } from "@/lib/data";
import { toneColor, StatusPill } from "@/components/ui";

const TYPES = ["All Types", "Leading", "Trailing"];
const CATS = ["All", "Supply", "Demand", "Capital", "Macro", "Performance"];

export default function IndicatorsPage() {
  const [type, setType] = useState("All Types");
  const [cat, setCat] = useState("All");

  const rows = INDICATORS.filter(
    (r) =>
      (type === "All Types" || r.type === type.toUpperCase()) &&
      (cat === "All" || r.cat === cat.toUpperCase())
  );

  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Economic Indicators</h1>
      <p className="mt-3 max-w-2xl text-muted">Comprehensive leading and trailing indicators driving multifamily performance.</p>

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

      <div className="mt-8 overflow-hidden rounded-lg border border-[var(--line)]">
        {rows.map((r, i) => (
          <div key={r.name} className={`grid grid-cols-2 items-center gap-4 px-6 py-5 md:grid-cols-[1.4fr_1fr_1.2fr_auto] bg-bg2 ${i ? "border-t border-[var(--line)]" : ""}`}>
            <div>
              <p className="mono text-[10px] tracking-[0.18em] text-muted">{r.cat} · {r.type}</p>
              <p className="mt-1 font-semibold text-ink">{r.name}</p>
            </div>
            <div>
              <p className="headline text-2xl text-ink">{r.value}</p>
              <p className="mono text-[11px] text-muted">{r.unit}</p>
            </div>
            <div className="hidden md:block">
              <p className="mono text-sm" style={{ color: toneColor(r.tone) }}>{r.change}</p>
              <p className="mono mt-0.5 text-[11px] text-muted">{r.note}</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <StatusPill tone={r.tone} />
              <ChevronDown size={16} className="hidden text-muted md:block" />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="mono p-8 text-center text-sm text-muted">No indicators match this filter.</p>}
      </div>
    </div>
  );
}
