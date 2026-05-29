"use client";

import { TrendingUp, TrendingDown, Radio } from "lucide-react";
import { toneColor } from "@/components/ui";

export default function SignalCard({ s }) {
  const c = toneColor(s.tone);
  const Icon = s.tone === "bull" ? TrendingUp : s.tone === "bear" ? TrendingDown : Radio;
  const label = s.tone === "bull" ? "BULLISH" : s.tone === "bear" ? "BEARISH" : "NEUTRAL";
  return (
    <div className="card p-6 transition-colors hover:border-[var(--line-strong)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: `${c}1a` }}>
          <Icon size={15} style={{ color: c }} strokeWidth={2} />
        </span>
        <span
          className="mono inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] tracking-[0.14em]"
          style={{ color: c, backgroundColor: `${c}1a`, border: `1px solid ${c}40` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
          {label}
        </span>
      </div>
      <h3 className="text-[17px] font-semibold leading-snug text-ink">{s.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {s.tags.map((t) => (
            <span key={t} className="mono rounded bg-white/[0.04] px-2 py-1 text-[10px] tracking-wide text-muted">
              {t}
            </span>
          ))}
        </div>
        <span className="mono shrink-0 text-[11px] text-muted">
          {s.time} · <span style={{ color: c }}>{s.conf}%</span> conf
        </span>
      </div>
    </div>
  );
}
