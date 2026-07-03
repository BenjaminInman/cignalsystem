"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Loader2, Lock, MapPin } from "lucide-react";

// Same color logic as the home CycleWheel.
const UP = "#5FB97C", DOWN = "#E5634D", AMBER = "#E0A33A", GOLD = "#F5B544";
const INK = "#ECEDEF", SUB = "#C9CCD1", MUT = "#797E85";
const HUBc = "#0B0C0E", SEP = "#08090A", LINE = "#20242A";
const C = { g: UP, a: AMBER, r: DOWN };
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

// geometry
const CX = 350, CY = 300;
const HUBr = 94;
const lI = 104, lO = 154;        // local (inner) band
const nI = 176, nO = 242;        // national (outer) band
const LR = 262;                  // national label radius
const GROW = 15;                 // hover pop-out
const GAPDEG = 3, MINDEG = 12;

function polar(r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
function arc(rI, rO, a0, a1) {
  const s = Math.min(a1, a0 + 359.9);
  const [xo0, yo0] = polar(rO, a0), [xo1, yo1] = polar(rO, s);
  const [xi1, yi1] = polar(rI, s), [xi0, yi0] = polar(rI, a0);
  const large = s - a0 > 180 ? 1 : 0;
  return `M${xo0.toFixed(1)} ${yo0.toFixed(1)} A${rO} ${rO} 0 ${large} 1 ${xo1.toFixed(1)} ${yo1.toFixed(1)} L${xi1.toFixed(1)} ${yi1.toFixed(1)} A${rI} ${rI} 0 ${large} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z`;
}

// Lay a set of signals around a full ring, sized by weight (min slice, small gaps).
function ringWedges(items, rI, rO) {
  const live = items.filter((s) => !s.pending);
  if (!live.length) return [];
  const tot = live.reduce((s, x) => s + (x.weight || 1), 0) || 1;
  const maxw = Math.max(...live.map((x) => x.weight || 1), 0.001);
  const avail = 360 - live.length * GAPDEG;
  let raws = live.map((x) => Math.max(((x.weight || 1) / tot) * avail, MINDEG));
  const sc = avail / raws.reduce((a, b) => a + b, 0);
  raws = raws.map((d) => d * sc);
  let acc = 0;
  return live.map((it, i) => {
    const a0 = acc, a1 = acc + raws[i];
    acc = a1 + GAPDEG;
    const t = (it.weight || 1) / maxw;
    return { it, a0, a1, mid: (a0 + a1) / 2, rI, rO, op: 0.4 + 0.55 * t };
  });
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div className="h-6 w-24" />;
  const w = 96, h = 24, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / rng) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

const fmtVal = (s) => `${s.unit === "%" && s.metric > 0 && s.label.includes("Growth") ? "+" : ""}${s.metric}${s.unit || ""}`;

export default function MarketReadWheel() {
  const [input, setInput] = useState("");
  const [zip, setZip] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null); // signal label

  const load = useCallback((z) => {
    setLoading(true);
    const qs = z ? `?zip=${encodeURIComponent(z)}` : "";
    fetch(`/api/market-read${qs}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]); // national auto-loads

  function submit() {
    const q = input.trim();
    const z = /^\d{5}$/.test(q) ? q : null;
    if (!z) { setZip("invalid"); return; }
    setZip(z);
    load(z);
  }

  const national = data?.national || [];
  const local = data?.local || [];
  const hasLocal = local.some((s) => !s.pending);
  const tally = data?.tally || { green: 0, neutral: 0, red: 0, total: 0 };

  const wedges = useMemo(() => {
    const nat = ringWedges(national, nI, nO);
    const loc = hasLocal ? ringWedges(local, lI, lO) : [];
    return [...loc, ...nat]; // inner first so outer strokes sit above
  }, [national, local, hasLocal]);

  const hoverIt =
    hover ? [...national, ...local].find((s) => s.label === hover && !s.pending) : null;

  return (
    <div>
      {/* search */}
      <div className="mx-auto mb-8 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Enter a 5-digit ZIP"
            inputMode="numeric"
            className="mono w-full rounded-md border border-[var(--line-strong)] bg-bg2 py-2.5 pl-9 pr-3 text-[13px] tracking-[0.04em] text-ink placeholder:text-muted focus:border-signal/50 focus:outline-none"
          />
        </div>
        <button onClick={submit} className="mono flex items-center gap-1.5 rounded-md bg-signal px-4 py-2.5 text-[12px] tracking-[0.06em] text-bg transition hover:brightness-110">
          <Search size={13} /> Read
        </button>
      </div>
      {zip === "invalid" && (
        <p className="mono -mt-5 mb-6 text-center text-[11px] tracking-[0.06em] text-down">
          Enter a valid 5-digit ZIP — local data resolves by ZIP only.
        </p>
      )}
      {data?.resolved?.metroName && (
        <p className="mono -mt-4 mb-6 text-center text-[11px] tracking-[0.1em] text-muted">
          <span className="text-ink">ZIP {data.zip}</span> · {data.resolved.metroName}
          {data.resolved.county ? ` · ${data.resolved.county}` : ""}
        </p>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* WHEEL */}
        <div className="relative mx-auto w-full max-w-[600px]">
          <svg viewBox="0 0 700 608" className="w-full" role="img" aria-label="Market cycle signal wheel">
            {/* ring guide + locked inner ring before a ZIP */}
            {!hasLocal && (
              <circle cx={CX} cy={CY} r={(lI + lO) / 2} fill="none" stroke={LINE} strokeWidth={lO - lI} strokeOpacity="0.25" strokeDasharray="3 6" />
            )}

            {/* wedges */}
            {wedges.map((w, i) => {
              const on = hover === w.it.label;
              const rO = on ? w.rO + GROW : w.rO;
              return (
                <path
                  key={i}
                  d={arc(w.rI, rO, w.a0, w.a1)}
                  fill={C[w.it.sentiment]}
                  fillOpacity={on ? Math.min(1, w.op + 0.18) : w.op}
                  stroke={on ? GOLD : SEP}
                  strokeWidth={on ? 1.5 : 2}
                  style={{ transition: "d 0.14s ease" }}
                  onMouseEnter={() => setHover(w.it.label)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}

            {/* national external labels (outer ring) */}
            {national.filter((s) => !s.pending).length > 0 &&
              ringWedges(national, nI, nO).map((w, i) => {
                const [lx, ly] = polar(LR, w.mid);
                const sn = Math.sin(((w.mid - 90) * Math.PI) / 180);
                const anchor = sn > 0.12 ? "start" : sn < -0.12 ? "end" : "middle";
                return (
                  <text key={`nl${i}`} x={lx} y={ly} textAnchor={anchor} fontFamily={MONO}>
                    <tspan x={lx} dy="-1" fontSize="11" fill={hover === w.it.label ? INK : SUB}>{w.it.label}</tspan>
                    <tspan x={lx} dy="12.5" fontSize="11" fill={C[w.it.sentiment]}>{fmtVal(w.it)}</tspan>
                  </text>
                );
              })}

            {/* ring captions */}
            <text x={CX} y={CY - nO - 8} textAnchor="middle" fontFamily={MONO} fontSize="9" fill={MUT} letterSpacing="1.5" opacity="0.7">NATIONAL</text>
            {hasLocal && (
              <text x={CX} y={CY - lO + 13} textAnchor="middle" fontFamily={MONO} fontSize="8.5" fill={MUT} letterSpacing="1.5" opacity="0.7">LOCAL</text>
            )}

            {/* hub */}
            <circle cx={CX} cy={CY} r={HUBr} fill={HUBc} stroke={LINE} strokeWidth="1.5" />
            <circle cx={CX} cy={CY} r={HUBr - 1} fill="none" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />

            {hoverIt ? (
              <>
                <text x={CX} y={CY - 38} textAnchor="middle" fontFamily={MONO} fontSize="8.5" fill={MUT} letterSpacing="1.4">
                  {(hoverIt.ring === "national" ? "NATIONAL" : "LOCAL")}
                </text>
                <text x={CX} y={CY - 17} textAnchor="middle" fontFamily={MONO} fontSize="15" fill={INK}>{hoverIt.label}</text>
                <text x={CX} y={CY + 3} textAnchor="middle" fontFamily={MONO} fontSize="14" fill={C[hoverIt.sentiment]}>{fmtVal(hoverIt)}</text>
                <text x={CX} y={CY + 24} textAnchor="middle" fontFamily={MONO} fontSize="8" fill={MUT} letterSpacing="0.6">
                  {hoverIt.grain}{hoverIt.source ? ` · ${hoverIt.source}` : ""}
                </text>
                {hoverIt.structural && (
                  <text x={CX} y={CY + 38} textAnchor="middle" fontFamily={MONO} fontSize="7.5" fill={MUT} letterSpacing="0.6">STRUCTURAL</text>
                )}
              </>
            ) : hasLocal ? (
              <>
                <text x={CX} y={CY - 24} textAnchor="middle" fontFamily={MONO} fontSize="9" fill={MUT} letterSpacing="1.5">SIGNAL BALANCE</text>
                <text x={CX} y={CY + 6} textAnchor="middle" fontFamily={MONO} fontSize="24">
                  <tspan fill={UP}>{tally.green}</tspan>
                  <tspan fill={MUT}>{"  "}</tspan>
                  <tspan fill={AMBER}>{tally.neutral}</tspan>
                  <tspan fill={MUT}>{"  "}</tspan>
                  <tspan fill={DOWN}>{tally.red}</tspan>
                </text>
                <text x={CX} y={CY + 26} textAnchor="middle" fontFamily={MONO} fontSize="8.5" fill={MUT} letterSpacing="0.5">of {tally.total} signals</text>
              </>
            ) : (
              <>
                <Lock x={CX - 9} y={CY - 34} width="18" height="18" color={MUT} />
                <text x={CX} y={CY + 4} textAnchor="middle" fontFamily={MONO} fontSize="10" fill={SUB} letterSpacing="0.5">ENTER A ZIP</text>
                <text x={CX} y={CY + 22} textAnchor="middle" fontFamily={MONO} fontSize="8.5" fill={MUT} letterSpacing="0.5">to unlock the local read</text>
              </>
            )}
          </svg>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-bg/40 backdrop-blur-[1px]">
              <Loader2 className="animate-spin text-signal" size={22} />
            </div>
          )}
        </div>

        {/* SIGNAL LIST + TRENDS */}
        <div className="space-y-4">
          <Legend />
          <SignalGroup title="National Ring" items={national} hover={hover} setHover={setHover} />
          {hasLocal && <SignalGroup title="Local Ring" items={local} hover={hover} setHover={setHover} />}
          {!hasLocal && local.length > 0 && (
            <p className="mono rounded-md border border-[var(--line)] bg-bg2/40 px-3 py-3 text-[11px] leading-relaxed text-muted">
              This ZIP has no resolvable local coverage. The national ring still reads; try a ZIP in a covered metro.
            </p>
          )}
        </div>
      </div>

      <div className="mono mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><i style={{ background: UP }} className="inline-block h-2 w-2 rounded-full" />supportive</span>
        <span className="flex items-center gap-1.5"><i style={{ background: AMBER }} className="inline-block h-2 w-2 rounded-full" />turning</span>
        <span className="flex items-center gap-1.5"><i style={{ background: DOWN }} className="inline-block h-2 w-2 rounded-full" />deteriorating</span>
        <span className="text-[10px] tracking-[0.04em]">outer = national &middot; inner = local &middot; size = signal weight</span>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="rounded-md border border-[var(--line)] bg-bg2/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {[["Green", UP], ["Neutral", AMBER], ["Red", DOWN]].map(([l, c]) => (
          <span key={l} className="mono flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function SignalGroup({ title, items, hover, setHover }) {
  return (
    <div>
      <p className="kicker mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((s, i) => (
          <div
            key={i}
            onMouseEnter={() => !s.pending && setHover(s.label)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-2.5 rounded-md border bg-bg2/40 px-3 py-2 transition-colors ${hover === s.label ? "border-signal/50" : "border-[var(--line)]"}`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.pending ? "#2a2c2f" : C[s.sentiment] }} />
            <div className="min-w-0 flex-1">
              <p className="mono truncate text-[11px] tracking-[0.03em] text-ink">{s.label}</p>
              <p className="mono text-[9px] tracking-[0.06em] text-muted">
                {s.grain}{s.sub ? ` · ${s.sub}` : ""}{s.leading ? " · leading" : ""}{s.structural ? " · structural" : ""}
              </p>
            </div>
            {s.pending ? (
              <span className="mono redact px-2 py-0.5 text-[9px]" title={s.note || "Pending"}>PENDING</span>
            ) : (
              <>
                <Sparkline data={s.trend} color={C[s.sentiment]} />
                <span className="mono w-12 shrink-0 text-right text-[12px] font-semibold" style={{ color: C[s.sentiment] }}>{fmtVal(s)}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
