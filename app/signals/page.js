"use client";

import { useState } from "react";
import { SIGNALS } from "@/lib/data";
import SignalCard from "@/components/SignalCard";

const FILTERS = ["All Signals", "Bull", "Bear", "Neutral"];
const MAP = { Bull: "bull", Bear: "bear", Neutral: "neutral" };

export default function SignalsPage() {
  const [f, setF] = useState("All Signals");
  const rows = SIGNALS.filter((s) => f === "All Signals" || s.tone === MAP[f]);
  const counts = {
    bull: SIGNALS.filter((s) => s.tone === "bull").length,
    bear: SIGNALS.filter((s) => s.tone === "bear").length,
    neutral: SIGNALS.filter((s) => s.tone === "neutral").length,
  };

  return (
    <div className="pt-12 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="mono mb-3 flex items-center gap-2 text-[11px] tracking-[0.16em] text-signal">
            <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" /> LIVE FEED · Updated 4s ago
          </p>
          <h1 className="headline text-4xl text-ink md:text-5xl">Market Signals</h1>
          <p className="mt-3 max-w-2xl text-muted">AI-synthesized market intelligence signals for multifamily operators.</p>
        </div>
        <div className="flex gap-3">
          <Tile n={counts.bull} label="Bullish" tone="#5FB97C" />
          <Tile n={counts.bear} label="Bearish" tone="#E5634D" />
          <Tile n={counts.neutral} label="Watching" tone="#E8B04B" />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <button key={x} onClick={() => setF(x)} className={`mono rounded-md border px-4 py-2 text-[12px] tracking-[0.04em] ${f === x ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}>{x}</button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {rows.map((s) => <SignalCard key={s.title} s={s} />)}
      </div>
    </div>
  );
}

function Tile({ n, label, tone }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-3" style={{ borderColor: `${tone}40` }}>
      <span className="headline text-2xl" style={{ color: tone }}>{n}</span>
      <span className="mono text-[10px] tracking-[0.1em] text-muted">{label}</span>
    </div>
  );
}
