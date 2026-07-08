"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

const LEAD = "#5FA8D9", MUT = "#797E85";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMonth(m) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${MON[+mo - 1]} '${y.slice(2)}`;
}

// Renders a single "what just changed" event from /api/signals-intel — the same
// feed the Signals page runs on, so the home preview stays true to the page.
export default function SignalEventCard({ e }) {
  const bull = e.tone === "bull";
  const c = bull ? "#5FB97C" : "#E5634D";
  const Icon = bull ? TrendingUp : TrendingDown;
  const label = bull ? "BULLISH" : "BEARISH";
  const leading = e.class === "leading";
  const layer = leading ? "LEADING" : "LAGGING";
  const layerC = leading ? LEAD : MUT;

  return (
    <div className="card p-6 transition-colors hover:border-[var(--line-strong)]">
      <div className="mb-4 flex items-center gap-2">
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
        <span
          className="mono rounded-sm px-2 py-1 text-[10px] tracking-[0.14em]"
          style={{ color: layerC, border: `1px solid ${layerC}40` }}
        >
          {layer}
        </span>
      </div>
      <h3 className="text-[16px] font-semibold leading-snug text-ink">{e.text}</h3>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <span className="mono text-[11px] text-muted">{e.name}</span>
        <span className="mono text-[11px] text-muted">{fmtMonth(e.month)}</span>
      </div>
    </div>
  );
}
