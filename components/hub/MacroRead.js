"use client";

import { useEffect, useState } from "react";

// Macro conditions panel for the hub: the Layer 3 readings from the public
// Cignal wheel, scored with the same green / yellow / red calibration the
// vertical sites use. Deliberately stops short of naming a phase for any one
// market; that read lives in each vertical.
const MACRO = ["treasury_10y", "employment", "unemployment", "wage_growth", "gdp", "real_pce", "cpi_headline", "pce_inflation", "ppi"];
const ROLE = { leading: "Leading", coincident: "Coincident", trailing: "Trailing" };
const DOT = { g: "#5FB97C", a: "#E8B04B", r: "#E5634D" };
const WORD = { g: "Supportive", a: "Watch", r: "Headwind" };

export default function MacroRead() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    fetch("/api/cycle-wheel")
      .then((r) => r.json())
      .then((d) => setRows((d.indicators || []).filter((i) => MACRO.includes(i.slug))))
      .catch(() => setRows([]));
  }, []);

  const tally = { g: 0, a: 0, r: 0 };
  (rows || []).forEach((r) => { if (tally[r.sentiment] != null) tally[r.sentiment] += 1; });
  const total = (rows || []).length;

  return (
    <div className="card p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Macro conditions · Layer 3</p>
          <h3 className="headline text-2xl text-ink md:text-3xl">
            {total ? (
              <>
                <span style={{ color: DOT.g }}>{tally.g}</span> supportive ·{" "}
                <span style={{ color: DOT.a }}>{tally.a}</span> watch ·{" "}
                <span style={{ color: DOT.r }}>{tally.r}</span> headwind
              </>
            ) : rows ? (
              "Macro read unavailable"
            ) : (
              "Reading the tape…"
            )}
          </h3>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          The same economy reads differently depending on what you own. Pick your market below for the phase call.
        </p>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] grid-cols-2 sm:grid-cols-3">
        {(rows || Array.from({ length: 9 }, () => null)).map((r, i) => (
          <div key={r?.slug || i} className="flex items-center justify-between gap-2 bg-bg2 px-3 py-3 sm:gap-3 sm:px-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{r?.label || "—"}</p>
              <p className="mono text-[10px] tracking-[0.14em] text-muted">{r ? (ROLE[r.role] || r.role).toUpperCase() : " "}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="mono text-sm text-ink">{r?.value || ""}</span>
              {r && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: DOT[r.sentiment] || "#797E85" }}
                  title={WORD[r.sentiment] || ""}
                  aria-label={WORD[r.sentiment] || ""}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
