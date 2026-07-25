"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { SlidersHorizontal, ChevronDown, Trophy, Loader2, Zap } from "lucide-react";
import { toneColor } from "@/components/ui";

const FACTOR_MENU = [
  { key: "job_growth", label: "Job Growth", source: "BLS", lead: true, hint: "Metro payroll employment, YoY" },
  { key: "wage_growth", label: "Wage Growth", source: "BLS QCEW", hint: "Average weekly wage, YoY" },
  { key: "rent_growth", label: "Rent Growth", source: "Apartment List", hint: "Median rent, YoY" },
  { key: "vacancy", label: "Vacancy", source: "Apartment List", hint: "Lower ranks higher" },
  { key: "unemployment", label: "Unemployment", source: "BLS LAUS", hint: "Lower ranks higher" },
  { key: "affordability", label: "Affordability", source: "BEA RPP", hint: "Cheaper rent vs U.S. ranks higher" },
  { key: "aimi", label: "Investment Index", source: "Freddie Mac AIMI", lead: true, hint: "Higher = better entry (24 metros)" },
  { key: "time_on_market", label: "Time on Market", source: "Apartment List", hint: "Faster leasing ranks higher" },
  { key: "supply_pressure", label: "Supply Pressure", source: "Census BPS / ACS", lead: true, hint: "New MF permits per 1,000 existing units — less ranks higher" },
];
const LABELS = Object.fromEntries(FACTOR_MENU.map((f) => [f.key, f.label]));

function fmtVal(f) {
  if (f.value == null) return "—";
  if (f.yoy) return `${f.value >= 0 ? "+" : ""}${f.value}%`;
  if (f.key === "vacancy" || f.key === "unemployment") return `${f.value}%`;
  if (f.key === "rent_growth") return `${f.value >= 0 ? "+" : ""}${f.value}%`;
  return `${f.value}`;
}
function pctLabel(p) {
  if (p == null) return "—";
  const t = p % 100, u = p % 10;
  const s = u === 1 && t !== 11 ? "st" : u === 2 && t !== 12 ? "nd" : u === 3 && t !== 13 ? "rd" : "th";
  return `${p}${s} pct`;
}

export default function MarketRanker({ watchlistCbsas = [] }) {
  // selected = ordered list of { key, weight(1-100) }
  const [selected, setSelected] = useState([
    { key: "job_growth", weight: 50 },
    { key: "rent_growth", weight: 35 },
    { key: "vacancy", weight: 30 },
  ]);
  const [mode, setMode] = useState("universe");
  const [topN, setTopN] = useState(15);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openRow, setOpenRow] = useState(null);
  const debounce = useRef(null);

  const totalW = selected.reduce((a, s) => a + s.weight, 0) || 1;
  const norm = (w) => Math.round((w / totalW) * 100);

  const toggle = (key) => {
    setSelected((prev) => {
      if (prev.find((s) => s.key === key)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((s) => s.key !== key);
      }
      return [...prev, { key, weight: 30 }];
    });
  };
  const setWeight = (key, weight) =>
    setSelected((prev) => prev.map((s) => (s.key === key ? { ...s, weight } : s)));

  const selectedKeys = selected.map((s) => s.key).join(",");
  const selectedWeights = selected.map((s) => s.weight).join(",");

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setLoading(true);
      const p = new URLSearchParams({ factors: selectedKeys, weights: selectedWeights, mode, topN: String(topN) });
      if (mode === "watchlist") p.set("cbsas", watchlistCbsas.join(","));
      fetch(`/api/rank?${p.toString()}`)
        .then((r) => r.json())
        .then((d) => { setData(d); setLoading(false); })
        .catch(() => { setData({ results: [], error: "Ranking unavailable." }); setLoading(false); });
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [selectedKeys, selectedWeights, mode, topN, watchlistCbsas]);

  const results = data?.results || [];

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker mb-1 flex items-center gap-2"><SlidersHorizontal size={13} className="text-signal" /> Build Your Own Ranking</p>
          <h2 className="headline text-2xl text-ink md:text-3xl">Your Indicators. Your Top Markets.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Pick the signals that matter to you and weight them by importance. The system ranks markets on your criteria — by national percentile, every rank traceable to its source. No sponsored lists.
          </p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-[var(--line)]">
          {[["universe", "All U.S. Metros"], ["watchlist", "My 20 Markets"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setMode(k)} className={`mono px-3 py-2 text-[11px] tracking-[0.04em] ${mode === k ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"}`}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Factor picker */}
      <div className="mt-5 flex flex-wrap gap-2">
        {FACTOR_MENU.map((f) => {
          const on = selected.find((s) => s.key === f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              title={f.hint}
              className={`mono rounded-md border px-3 py-2 text-[12px] tracking-[0.03em] transition ${on ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}
            >
              {f.label}{f.lead && <Zap size={10} className="ml-1.5 inline align-[-1px]" />}
            </button>
          );
        })}
      </div>

      {/* Weight sliders */}
      <div className="mt-5 space-y-3">
        {selected.map((s) => (
          <div key={s.key} className="grid grid-cols-[minmax(120px,1.2fr)_2fr_auto] items-center gap-4">
            <span className="text-sm text-ink">{LABELS[s.key]}</span>
            <input
              type="range" min="1" max="100" value={s.weight}
              onChange={(e) => setWeight(s.key, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--line)]"
              style={{ accentColor: "#F5B544" }}
            />
            <span className="mono w-12 text-right text-sm text-signal">{norm(s.weight)}%</span>
          </div>
        ))}
        <p className="mono text-[10px] tracking-[0.06em] text-muted">Weights auto-normalize to 100% — set importance by feel. <Zap size={10} className="inline align-[-1px] text-signal" /> = leading signal.</p>
      </div>

      {/* Controls row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        <div className="flex items-center gap-3">
          {mode === "universe" && (
            <div className="flex items-center gap-2">
              <span className="mono text-[11px] tracking-[0.06em] text-muted">SHOW TOP</span>
              {[10, 15, 25, 50].map((n) => (
                <button key={n} onClick={() => setTopN(n)} className={`mono rounded px-2 py-1 text-[11px] ${topN === n ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"}`}>{n}</button>
              ))}
            </div>
          )}
        </div>
        <span className="mono text-[10px] tracking-[0.06em] text-muted">
          {loading ? <><Loader2 size={11} className="mr-1 inline animate-spin align-[-1px]" />ranking…</>
            : data ? `${data.eligible ?? results.length} eligible · ranked vs ${data.universe || "—"} U.S. metros` : ""}
        </span>
      </div>

      {/* Results */}
      <div className="mt-5 overflow-hidden rounded-lg border border-[var(--line)]">
        {results.length === 0 && !loading && (
          <p className="mono px-6 py-6 text-[12px] text-muted">No markets match those factors. Try fewer or broader signals.</p>
        )}
        {results.map((m, i) => {
          const open = openRow === m.cbsa;
          return (
            <div key={m.cbsa} className={i ? "border-t border-[var(--line)]" : ""}>
              <div
                role="button" tabIndex={0} aria-expanded={open}
                onClick={() => setOpenRow(open ? null : m.cbsa)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenRow(open ? null : m.cbsa); } }}
                className="grid cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-4 bg-bg2 px-5 py-4 transition hover:bg-bg2/60"
              >
                <span className="mono w-7 text-center text-sm text-muted">{m.rank}</span>
                <span className="flex items-center gap-2 font-semibold text-ink">
                  {m.rank === 1 && <Trophy size={14} className="text-signal" />}{m.name}
                </span>
                <span className="mono rounded px-2.5 py-1 text-[12px]" style={{ color: toneColor(m.scoreTone), backgroundColor: `${toneColor(m.scoreTone)}1a` }}>{m.score}</span>
                <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
              {open && (
                <div className="border-t border-[var(--line)] bg-bg px-5 py-4">
                  {m.factors.map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-4 border-t border-[var(--line)] py-2 first:border-t-0">
                      <span className="flex items-center gap-2 text-sm text-ink">
                        {f.label}
                        {f.lead && <span className="mono rounded bg-signal/10 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-signal">LEADING</span>}
                      </span>
                      <span className="text-right">
                        <span className="mono text-sm text-ink">{fmtVal(f)}</span>
                        <span className="mono ml-3 text-[10px] tracking-[0.06em] text-muted">{pctLabel(f.pct)} · {f.source}</span>
                      </span>
                    </div>
                  ))}
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    Score = your weighted blend of each signal&apos;s national percentile rank. Sources: {[...new Set(m.factors.map((f) => f.source))].join(", ")}.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
