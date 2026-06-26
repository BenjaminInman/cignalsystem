"use client";

import { useEffect, useState } from "react";
import { Compass, TrendingUp, TrendingDown, Minus } from "lucide-react";

const UP = "#5FB97C";
const DOWN = "#E5634D";
const STEADY = "#F5B544";

const MOM = {
  accelerating: { c: UP, label: "strengthening", Icon: TrendingUp },
  fading: { c: DOWN, label: "fading", Icon: TrendingDown },
  steady: { c: STEADY, label: "steady", Icon: Minus },
};

const fmtK = (v) => (v >= 0 ? "+" : "\u2212") + "$" + Math.abs(Math.round(v / 100) / 10) + "k";
const cityName = (m) => m.replace(/, [A-Z]{2}$/, "");

export default function MigrationDivergence() {
  const [data, setData] = useState(null);
  const [hi, setHi] = useState(null);

  useEffect(() => {
    fetch("/api/migration-divergence").then((r) => r.json()).then(setData).catch(() => setData({ items: [] }));
  }, []);

  if (!data) return null;
  const pts = (data.items || [])
    .filter((d) => d.matched && d.diff != null)
    .sort((a, b) => b.diff - a.diff);
  if (!pts.length) return null;

  const maxAbs = Math.max(...pts.map((p) => Math.abs(p.diff)), 1);
  const pct = (v) => Math.max(1.5, (Math.abs(v) / maxAbs) * 50);

  return (
    <section className="relative mt-10 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.07] via-bg2/40 to-bg/20 p-6 md:p-7">
      <p className="kicker mb-2 flex items-center gap-2"><Compass size={13} className="text-signal" /> Migration Divergence</p>
      <h2 className="headline text-2xl text-ink md:text-3xl">Renters are moving in — is the money following?</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Each bar is a U-Haul Top-25 growth metro, so renters and DIY movers are flooding all of them. The bar shows whether <span className="text-ink">higher-income households</span> are net arriving (right) or leaving (left), per IRS tax-return migration. The tag on the right shows whether that gap is <span className="text-ink">strengthening or fading</span> over the last {data.window || 4} years — so a metro can sit positive yet be fading.
      </p>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[560px]">
          {/* header */}
          <div className="mb-1.5 flex items-center gap-3">
            <div className="w-[118px] shrink-0" />
            <div className="mono flex flex-1 justify-between text-[9px] tracking-[0.08em] text-muted">
              <span>{"\u2190"} LOSING AFFLUENT</span>
              <span>GAINING AFFLUENT {"\u2192"}</span>
            </div>
            <div className="w-[54px] shrink-0" />
            <div className="w-[112px] shrink-0" />
          </div>

          <div className="space-y-[3px]">
            {pts.map((p) => {
              const m = p.momentum ? MOM[p.momentum] : null;
              const col = p.diff >= 0 ? UP : DOWN;
              const active = hi === p.market;
              return (
                <div
                  key={p.market}
                  onMouseEnter={() => setHi(p.market)}
                  onMouseLeave={() => setHi(null)}
                  className={`flex items-center gap-3 rounded-md py-1 transition-colors ${active ? "bg-white/[0.03]" : ""}`}
                >
                  {/* label */}
                  <div className="w-[118px] shrink-0 text-right leading-tight">
                    <div className="truncate text-[12px] text-ink">{cityName(p.market)}</div>
                    <div className="mono text-[8.5px] tracking-[0.06em] text-muted">U-HAUL #{p.uhaulRank}</div>
                  </div>

                  {/* diverging bar */}
                  <div className="relative h-[16px] flex-1">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--line)]" />
                    <div
                      className={`absolute inset-y-[2px] ${p.diff >= 0 ? "rounded-r-[3px]" : "rounded-l-[3px]"}`}
                      style={{
                        background: col,
                        opacity: active ? 0.95 : 0.78,
                        width: pct(p.diff) + "%",
                        ...(p.diff >= 0 ? { left: "50%" } : { right: "50%" }),
                      }}
                    />
                  </div>

                  {/* value */}
                  <div className="mono w-[54px] shrink-0 text-right text-[11px]" style={{ color: col }}>
                    {fmtK(p.diff)}
                  </div>

                  {/* momentum tag */}
                  <div className="w-[112px] shrink-0">
                    {m ? (
                      <span className="mono inline-flex items-center gap-1 text-[10px]" style={{ color: m.c }}>
                        <m.Icon size={11} strokeWidth={2} /> {m.label}
                      </span>
                    ) : (
                      <span className="mono text-[10px] text-muted">{"\u2014"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
        <span className="mono flex items-center gap-1.5 text-muted"><span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: UP }} /> bar right = gaining affluent</span>
        <span className="mono flex items-center gap-1.5 text-muted"><span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: DOWN }} /> bar left = losing affluent</span>
        <span className="mono flex items-center gap-1.5 text-muted"><TrendingUp size={12} style={{ color: UP }} />/<TrendingDown size={12} style={{ color: DOWN }} /> tag = {data.window || 4}-yr trend</span>
      </div>

      <p className="mono mt-3 text-[10px] tracking-[0.06em] text-muted">
        U-Haul Growth Index {data.year} · bar = latest IRS in−out AGI differential · tag = smoothed {data.window || 4}-yr slope{data.latestYear ? ` (${data.latestYear - (data.window || 4) + 1}\u2013${data.latestYear})` : ""} · domestic, ~2-yr lag · {pts.length} metros
      </p>
    </section>
  );
}
