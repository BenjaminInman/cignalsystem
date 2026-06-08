"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Hammer, Wrench, Landmark, Handshake } from "lucide-react";
import { useContent } from "@/components/VerticalProvider";
import BuffettIndicator from "@/components/BuffettIndicator";

const ICONS = {
  "Home Builders": Hammer,
  "Home Improvement": Wrench,
  "Lenders": Landmark,
  "Brokerages": Handshake,
};

export default function IndicesPage() {
  const { INDICES = [] } = useContent();
  const [quotes, setQuotes] = useState({});
  const [live, setLive] = useState(false);
  const symbols = INDICES.flatMap((c) => c.members.map((m) => m.ticker));
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!symbolsKey) return;
    fetch(`/api/quotes?symbols=${symbolsKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.quotes && Object.keys(d.quotes).length) {
          setQuotes(d.quotes);
          setLive(true);
        }
      })
      .catch(() => {});
  }, [symbolsKey]);

  // Merge live quotes over fallback values.
  const merged = (m) => ({
    ...m,
    price: quotes[m.ticker]?.price ?? m.price,
    chg: quotes[m.ticker]?.chg ?? m.chg,
  });

  return (
    <div className="pt-12 pb-10">
      <p className="kicker mb-3 flex items-center gap-2"><TrendingUp size={12} className="text-signal" /> Market Indices</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Housing-Economy Indices</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Public-market proxies for the forces moving the housing economy — tracked across home builders, home improvement, lenders, and brokerages.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {INDICES.map((cat) => {
          const Icon = ICONS[cat.category] || TrendingUp;
          const members = cat.members.map(merged);
          const avg = members.reduce((s, m) => s + m.chg, 0) / members.length;
          const up = members.filter((m) => m.chg > 0).length;
          const positive = avg >= 0;
          const color = positive ? "#5FB97C" : "#E5634D";
          return (
            <div key={cat.category} className="card p-6">
              <div className="mb-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal/10">
                    <Icon size={16} className="text-signal" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-ink">{cat.category}</h2>
                    <p className="mono text-[11px] tracking-wide text-muted">{up}/{members.length} advancing</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="headline text-2xl" style={{ color }}>
                    {positive ? "+" : ""}{avg.toFixed(2)}%
                  </div>
                  <p className="mono text-[10px] tracking-[0.12em] text-muted">CATEGORY AVG</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-[var(--line)]">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-white/[0.02] px-4 py-2 mono text-[10px] tracking-[0.12em] text-muted">
                  <span>SYMBOL</span><span className="text-right">PRICE</span><span className="text-right">CHG</span>
                </div>
                {members.map((m, i) => {
                  const u = m.chg >= 0;
                  return (
                    <div key={m.ticker} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 ${i ? "border-t border-[var(--line)]" : ""}`}>
                      <div>
                        <span className="mono text-sm font-medium text-ink">{m.ticker}</span>
                        <span className="ml-2 text-[12px] text-muted">{m.name}</span>
                      </div>
                      <span className="mono text-right text-sm text-ink">${m.price.toFixed(2)}</span>
                      <span className="mono w-16 text-right text-sm" style={{ color: u ? "#5FB97C" : "#E5634D" }}>
                        {u ? "+" : ""}{m.chg.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mono mt-6 flex items-center gap-2 text-[11px] tracking-[0.06em] text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-flicker bg-signal" : "bg-muted"}`} />
        {live
          ? "Live quotes · delayed, via public market data"
          : "Showing reference values — live quotes resume when the data feed is reachable"}
      </p>

      <BuffettIndicator />
    </div>
  );
}
