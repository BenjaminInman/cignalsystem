"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Radio } from "lucide-react";
import YieldCurve from "@/components/YieldCurve";
import { createClient } from "@/lib/supabase/client";
import { toneColor } from "@/components/ui";
import AskCanary from "@/components/AskCanary";

const UP = "#5FB97C", DOWN = "#E5634D", AMBER = "#E0A33A", GOLD = "#F5B544";
const BLUE = "#5FA8D9", MUT = "#797E85", INK = "#ECEDEF", LINE = "#20242A";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const fmtMonth = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mo-1]} '${y.slice(2)}`; };

export default function SignalsPage() {
  const [intel, setIntel] = useState(null);
  const [balance, setBalance] = useState(null);
  const [markets, setMarkets] = useState(null);
  const [member, setMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setMember(!!data.user));
    Promise.all([
      fetch("/api/signals-intel").then((r) => r.json()).catch(() => null),
      fetch("/api/cycle-wheel").then((r) => r.json()).catch(() => null),
      fetch("/api/signals-markets").then((r) => r.json()).catch(() => null),
    ]).then(([i, w, m]) => { setIntel(i); setBalance(w?.balance || null); setMarkets(m?.markets || []); setLoading(false); });
  }, []);

  const tell = intel?.tell;
  const events = (intel?.events || []).filter((e) => tab === "All" || (tab === "Leading" && e.class === "leading") || (tab === "Lagging" && e.class === "trailing"));

  return (
    <div className="pt-12 pb-14">
      {/* HEADER + TENSION */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="mono mb-3 flex items-center gap-2 text-[11px] tracking-[0.16em] text-signal">
            <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" /> LIVE · LEADING vs LAGGING · REVISION-0 FIRST PRINTS
          </p>
          <h1 className="headline text-4xl text-ink md:text-5xl">Market Signals</h1>
          <p className="mt-3 max-w-2xl text-muted">The dynamic layer — what's <span className="text-ink">changing</span>, <span className="text-ink">diverging</span>, and worth acting on. Not where the market is; where it's turning.</p>
        </div>
        <div className="flex gap-3">
          <Tile n={balance?.up} label="SUPPORTIVE" tone={UP} />
          <Tile n={balance?.turn} label="TURNING" tone={AMBER} />
          <Tile n={balance?.down} label="DETERIORATING" tone={DOWN} />
        </div>
      </div>

      {loading ? (
        <p className="mono mt-10 text-[13px] text-muted">Computing signals…</p>
      ) : (
        <>
          {/* THE TELL + DIVERGENCE BOARD */}
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono text-[10px] tracking-[0.18em] text-signal">THE TELL · LEADING vs LAGGING</p>
                  <p className="headline mt-1 text-lg text-ink">National divergence</p>
                </div>
                <div className="mono flex gap-4 text-[10px] text-muted">
                  <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: BLUE }} /> Leading</span>
                  <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: MUT }} /> Lagging</span>
                </div>
              </div>
              {tell && <TellChart tell={tell} />}
              {tell && <Verdict tell={tell} />}
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <AskCanary variant="pill" question="What is the divergence between the leading and lagging indicators telling us right now?" />
              </div>
            </div>

            {/* Per-market divergence board — gated (build #5) */}
            <div className="card relative overflow-hidden p-6">
              <p className="mono text-[10px] tracking-[0.18em] text-muted">WHERE LEADING &amp; LAGGING DISAGREE MOST</p>
              <p className="headline mt-1 text-lg text-ink">By market</p>
              <div className={member ? "" : "pointer-events-none blur-[3px]"}>
                <DivergenceBoard rows={markets} />
              </div>
              {!member && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/55 backdrop-blur-[1px]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal/10"><Lock size={16} className="text-signal" /></span>
                  <p className="mono text-center text-[12px] text-ink">Market-level divergence<br /><span className="text-muted">is a member signal</span></p>
                  <Link href="/register" className="mono rounded-md bg-signal px-4 py-2 text-[12px] tracking-[0.06em] text-bg hover:brightness-110">Unlock →</Link>
                </div>
              )}
            </div>
          </div>

          {/* EVENT FEED + ANOMALIES */}
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="headline text-lg text-ink">What just changed</p>
                <div className="flex gap-1.5">
                  {["All", "Leading", "Lagging"].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`mono rounded-md px-2.5 py-1 text-[10px] tracking-[0.05em] ${tab === t ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                {events.length === 0 ? <p className="mono text-[12px] text-muted">No recent crossings.</p> :
                  events.map((e, i) => (
                    <div key={i} className="flex gap-3 border-t border-[var(--line2,#161A1F)] py-3 first:border-0">
                      <time className="mono w-14 shrink-0 pt-0.5 text-[10px] text-muted">{fmtMonth(e.month)}</time>
                      <div>
                        <p className="text-[13px] leading-snug text-ink"><span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: toneColor(e.tone) }} />{e.text}</p>
                        <p className="mono mt-0.5 text-[9px] tracking-[0.06em] text-muted">NATIONAL · {e.class === "leading" ? "LEADING" : "LAGGING"} · trend crossing</p>
                      </div>
                    </div>
                  ))}
              </div>
              <p className="mono mt-3 text-[10px] leading-relaxed text-muted">Detected from revision-0 first prints — the month each signal actually crossed its own trend, never revised away.</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <p className="headline text-lg text-ink">Most anomalous now</p>
                <span className="mono rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-muted">|z| vs its own norm</span>
              </div>
              <div className="mt-4">
                {(intel?.anomalies || []).map((a, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[var(--line2,#161A1F)] py-2.5 first:border-0">
                    <div>
                      <p className="mono text-[12px] text-ink">{a.name}</p>
                      <p className="mono text-[9px] tracking-[0.06em] text-muted">{a.class === "leading" ? "LEADING" : "LAGGING"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZBar z={a.z} tone={a.tone} />
                      <span className="mono w-11 text-right text-[12px]" style={{ color: toneColor(a.tone) }}>{a.z >= 0 ? "+" : ""}{a.z}σ</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mono mt-3 text-[10px] leading-relaxed text-muted">Which signals are furthest from their own recent normal — the outliers worth a look first.</p>
            </div>
          </div>

          {!member && (
            <div className="card mt-5 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal/10"><Lock size={15} className="text-signal" strokeWidth={1.8} /></span>
                <div>
                  <p className="font-semibold text-ink">You&apos;re seeing the national signal layer</p>
                  <p className="mt-1 text-sm text-muted">Create a free account to unlock market-level divergence and phase-shift alerts for the markets you track.</p>
                </div>
              </div>
              <Link href="/register" className="mono shrink-0 rounded-md bg-signal px-4 py-2.5 text-[13px] font-medium tracking-[0.06em] text-bg transition-all hover:brightness-110">Unlock full signals →</Link>
            </div>
          )}

          <div className="mt-10"><YieldCurve /></div>
        </>
      )}
    </div>
  );
}

function Tile({ n, label, tone }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-3" style={{ borderColor: `${tone}40` }}>
      <span className="headline text-2xl" style={{ color: tone }}>{n ?? "—"}</span>
      <span className="mono text-[9px] tracking-[0.1em] text-muted">{label}</span>
    </div>
  );
}

function TellChart({ tell }) {
  const W = 620, H = 200, PL = 6, PR = 6, PT = 14, PB = 22;
  const lead = tell.leading, lag = tell.lagging, n = lead.length;
  const all = [...lead, ...lag, 0].filter((x) => x != null);
  const min = Math.min(...all), max = Math.max(...all), rng = max - min || 1;
  const x = (i) => PL + (i / (n - 1)) * (W - PL - PR);
  const y = (v) => PT + (1 - (v - min) / rng) * (H - PT - PB);
  const pts = (arr) => arr.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(" ");
  // shaded gap polygon (where both present)
  const idx = lead.map((v, i) => (v != null && lag[i] != null ? i : null)).filter((i) => i != null);
  const gapPath = idx.length
    ? "M" + idx.map((i) => `${x(i).toFixed(1)},${y(lead[i]).toFixed(1)}`).join(" L") +
      " L" + [...idx].reverse().map((i) => `${x(i).toFixed(1)},${y(lag[i]).toFixed(1)}`).join(" L") + " Z"
    : "";
  const lastI = idx[idx.length - 1];
  const gapNeg = tell.gapNow < 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full">
      <defs>
        <linearGradient id="tellgap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={gapNeg ? DOWN : UP} stopOpacity="0.22" />
          <stop offset="1" stopColor={gapNeg ? DOWN : UP} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1={PL} y1={y(0)} x2={W - PR} y2={y(0)} stroke={LINE} strokeWidth="1" strokeDasharray="3 4" />
      <text x={PL} y={y(0) - 4} fontFamily={MONO} fontSize="8" fill={MUT}>trend</text>
      {gapPath && <path d={gapPath} fill="url(#tellgap)" />}
      <polyline points={pts(lag)} fill="none" stroke={MUT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={pts(lead)} fill="none" stroke={BLUE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {lastI != null && <><circle cx={x(lastI)} cy={y(lead[lastI])} r="4" fill={BLUE} /><circle cx={x(lastI)} cy={y(lag[lastI])} r="4" fill={MUT} /></>}
      <text x={PL} y={H - 6} fontFamily={MONO} fontSize="8.5" fill={MUT}>{fmtMonth(tell.months[0])}</text>
      <text x={W - PR} y={H - 6} textAnchor="end" fontFamily={MONO} fontSize="8.5" fill={MUT}>{fmtMonth(tell.months[tell.months.length - 1])}</text>
    </svg>
  );
}

function Verdict({ tell }) {
  const neg = tell.read === "leading_below";
  const pos = tell.read === "leading_above";
  const c = neg ? DOWN : pos ? UP : AMBER;
  const text = neg
    ? "Leading is running below lagging — an early softening tell, not yet in the trailing data."
    : pos
    ? "Leading is running ahead of lagging — demand building before it shows in the trailing data."
    : "Leading and lagging are in agreement — the current trend is confirmed on both sides.";
  return (
    <div className="mt-4">
      <div className="mono flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[12.5px]" style={{ borderColor: `${c}55`, background: `${c}12`, color: c }}>
        {neg ? "⚠" : pos ? "▲" : "="} <span style={{ color: INK }}>{text}</span>
      </div>
      <div className="mono mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted">
        <span>Gap now: <b style={{ color: INK }}>{tell.gapNow >= 0 ? "+" : ""}{tell.gapNow}</b> ({tell.gapSigma >= 0 ? "+" : ""}{tell.gapSigma}σ)</span>
        <span>Percentile: <b style={{ color: INK }}>{tell.percentile}th</b></span>
        <span>Direction: <b style={{ color: tell.widening ? c : MUT }}>{tell.widening ? "widening" : "narrowing"}</b></span>
      </div>
    </div>
  );
}

function ZBar({ z, tone }) {
  const w = 70, mag = Math.min(Math.abs(z) / 2.5, 1) * (w / 2);
  return (
    <svg width={w} height="12" className="shrink-0">
      <rect x="0" y="4" width={w} height="4" rx="2" fill="#161A1F" />
      <line x1={w / 2} y1="1" x2={w / 2} y2="11" stroke={LINE} strokeWidth="1" />
      <rect x={z >= 0 ? w / 2 : w / 2 - mag} y="4" width={mag} height="4" rx="2" fill={toneColor(tone)} opacity="0.9" />
    </svg>
  );
}

function DivergenceBoard({ rows }) {
  if (!rows) return <p className="mono mt-4 text-[12px] text-muted">Loading markets…</p>;
  if (!rows.length) return <p className="mono mt-4 text-[12px] text-muted">No market divergence data.</p>;
  const pct = (v) => `${v >= 0 ? "+" : ""}${v}%`;
  const bars = (g) => (Math.abs(g) > 2.5 ? 3 : Math.abs(g) > 1.3 ? 2 : 1);
  return (
    <div className="mt-3">
      <div className="mono grid grid-cols-[1.3fr_0.9fr_0.9fr_auto] gap-2 pb-2 text-[9px] tracking-[0.08em] text-muted">
        <span>MARKET</span><span>LEADING · JOBS</span><span>LAGGING · RENT</span><span>GAP</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1.3fr_0.9fr_0.9fr_auto] items-center gap-2 border-t border-[var(--line2,#161A1F)] py-2.5 text-[12px]" title={r.read}>
          <span className="font-semibold text-ink">{r.name.replace(/, [A-Z]{2}$/, "")}</span>
          <span className="mono text-[11px]" style={{ color: toneColor(r.jobsYoY >= 0 ? "bull" : "bear") }}>{pct(r.jobsYoY)}</span>
          <span className="mono text-[11px]" style={{ color: toneColor(r.rentYoY >= 0 ? "bull" : "bear") }}>{pct(r.rentYoY)}</span>
          <span className="flex items-center gap-1.5">
            <span className="flex gap-0.5">{[0, 1, 2].map((k) => <i key={k} className="inline-block h-3 w-1.5 rounded-sm" style={{ background: k < bars(r.gap) ? toneColor(r.tone) : LINE }} />)}</span>
          </span>
        </div>
      ))}
      <p className="mono mt-3 text-[10px] leading-relaxed text-muted">Ranked by how far a market's leading read (jobs) has pulled from its lagging read (rents). Wide gaps are where the turn shows up first.</p>
    </div>
  );
}
