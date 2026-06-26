"use client";

import { useEffect, useState } from "react";
import { Compass, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(null);

  useEffect(() => {
    fetch("/api/migration-divergence").then((r) => r.json()).then(setData).catch(() => setData({ items: [] }));
  }, []);

  if (!data) {
    return (
      <div className="mt-14"><div className="card p-6">
        <p className="kicker flex items-center gap-2"><Compass size={13} className="text-signal" /> Migration Intelligence</p>
        <p className="mt-2 text-sm text-muted">Loading renter-vs-affluent divergence…</p>
      </div></div>
    );
  }

  const pts = (data.items || [])
    .filter((d) => d.matched && d.diff != null)
    .sort((a, b) => b.diff - a.diff);
  const maxAbs = Math.max(...pts.map((p) => Math.abs(p.diff)), 1);
  const pct = (v) => Math.max(1.5, (Math.abs(v) / maxAbs) * 50);

  return (
    <div className="mt-14">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="card flex w-full cursor-pointer items-start gap-4 p-6 text-left transition hover:border-signal/30"
      >
        <div className="flex-1">
          <p className="kicker mb-2 flex items-center gap-2"><Compass size={13} className="text-signal" /> Migration Intelligence</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">Renters vs. Affluent — Income Divergence</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Each market is a U-Haul Top-25 growth metro, so renters and DIY movers are flooding all of them. The bar shows whether <span className="text-ink">higher-income households</span> are net arriving (right) or leaving (left), per IRS tax-return migration — and the tag shows whether that gap is <span className="text-ink">strengthening or fading</span> over {data.window || 4} years. A metro can sit positive yet be fading.
          </p>
        </div>
        <ChevronDown size={20} className={`mt-1 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="mt-6">
          {pts.length === 0 ? (
            <p className="text-sm text-muted">No matched metros available right now.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
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
                          <div className="w-[118px] shrink-0 text-right leading-tight">
                            <div className="truncate text-[12px] text-ink">{cityName(p.market)}</div>
                            <div className="mono text-[8.5px] tracking-[0.06em] text-muted">U-HAUL #{p.uhaulRank}</div>
                          </div>

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

                          <div className="mono w-[54px] shrink-0 text-right text-[11px]" style={{ color: col }}>
                            {fmtK(p.diff)}
                          </div>

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

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
                <span className="mono flex items-center gap-1.5 text-muted"><span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: UP }} /> bar right = gaining affluent</span>
                <span className="mono flex items-center gap-1.5 text-muted"><span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: DOWN }} /> bar left = losing affluent</span>
                <span className="mono flex items-center gap-1.5 text-muted"><TrendingUp size={12} style={{ color: UP }} />/<TrendingDown size={12} style={{ color: DOWN }} /> tag = {data.window || 4}-yr trend</span>
              </div>

              <p className="mt-5 text-[11px] leading-relaxed text-muted">
                U-Haul Growth Index {data.year} paired with IRS SOI county-to-county migration. Bar = latest in-minus-out AGI differential; tag = smoothed {data.window || 4}-yr slope{data.latestYear ? ` (${data.latestYear - (data.window || 4) + 1}\u2013${data.latestYear})` : ""}. Domestic flows, ~2-year lag. {pts.length} metros matched.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
