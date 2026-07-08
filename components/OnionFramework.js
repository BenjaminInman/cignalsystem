"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ONION_LAYERS } from "@/lib/onion";

// Concentric onion. Rings are drawn outer -> inner so each ring's onClick only
// receives hits on its own exposed band (inner circles sit on top).
function OnionRing({ active, onSelect, counts, countText = {} }) {
  const C = 110;
  const core = 20;
  const disp = (id) => countText[id] ?? String(counts[id] || 0);
  return (
    <svg
      viewBox="0 0 220 220"
      className="w-[168px] shrink-0 md:w-[188px]"
      style={{ height: "auto" }}
      role="img"
      aria-label="Onion Framework: three indicator layers from macro to submarket"
    >
      {ONION_LAYERS.map((l) => {
        const on = active === l.id;
        const dim = active && !on;
        return (
          <g
            key={l.id}
            onClick={() => onSelect(active === l.id ? null : l.id)}
            style={{ cursor: "pointer" }}
          >
            <title>{`Layer ${l.num} · ${l.label} — ${disp(l.id)} indicators`}</title>
            <circle
              cx={C}
              cy={C}
              r={l.r}
              fill={l.accent}
              fillOpacity={on ? 0.26 : dim ? 0.05 : 0.13}
              stroke={on ? "#F5B544" : l.accent}
              strokeOpacity={on ? 1 : dim ? 0.3 : 0.55}
              strokeWidth={on ? 2 : 1}
              style={{ transition: "fill-opacity .25s, stroke-opacity .25s, stroke-width .25s" }}
            />
          </g>
        );
      })}
      {/* Core = the deal */}
      <circle cx={C} cy={C} r={core} fill="#0E0F11" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <text
        x={C}
        y={C + 3}
        textAnchor="middle"
        className="mono"
        fontSize="8"
        letterSpacing="1.5"
        fill="#797E85"
      >
        DEAL
      </text>
    </svg>
  );
}

export default function OnionFramework({ active, onSelect, counts = {}, countText = {} }) {
  const [teachOpen, setTeachOpen] = useState(false);
  const disp = (id) => countText[id] ?? String(counts[id] || 0);

  return (
    <div className="card mt-8 overflow-hidden">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8">
        <OnionRing active={active} onSelect={onSelect} counts={counts} countText={countText} />

        <div className="min-w-0 flex-1">
          <p className="kicker">The Onion Framework</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Read the market from the outside in — the broad economy, then the national
            multifamily industry, then your submarket. Select a layer to focus the indicators below.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {ONION_LAYERS.map((l) => {
              const on = active === l.id;
              const d = disp(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => onSelect(on ? null : l.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    on
                      ? "border-signal/50 bg-signal/10"
                      : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: l.accent }}
                    />
                    <span className="mono text-[10px] tracking-[0.16em] text-muted">
                      LAYER {l.num}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink">{l.label}</p>
                  <p className="mono mt-0.5 text-[11px] text-muted">
                    {l.scope} · {d} {d === "1" ? "signal" : "signals"}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setTeachOpen((v) => !v)}
            className="mono mt-4 inline-flex items-center gap-1.5 text-[11px] tracking-[0.12em] text-signal/90 hover:text-signal"
          >
            HOW TO READ THE ONION
            <ChevronDown size={13} className={`transition-transform ${teachOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {teachOpen && (
        <div className="border-t border-[var(--line)] px-6 py-6">
          <div className="grid gap-5 md:grid-cols-3">
            {ONION_LAYERS.map((l) => (
              <div key={l.id} className="rounded-lg border border-[var(--line)] bg-bg/40 p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.accent }} />
                  <p className="mono text-[10px] tracking-[0.16em] text-muted">
                    LAYER {l.num} · {l.label.toUpperCase()}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink/90">{l.teach}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">
            The outer rings move first and lead; the inner rings confirm and localize. Reading them
            in order — macro, then industry, then submarket — is how you judge <span className="text-ink">when</span> in
            the cycle you are, not just <span className="text-ink">how</span> to underwrite a deal.
          </p>
        </div>
      )}
    </div>
  );
}
