"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Lock, MapPin } from "lucide-react";

const UP = "#5FB97C", DOWN = "#E5634D", AMBER = "#E0A33A", GOLD = "#F5B544";
const INK = "#ECEDEF", SUB = "#C9CCD1", MUT = "#797E85";
const LINE = "#20242A";
const SENT = { g: UP, a: AMBER, r: DOWN };
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

// Quadrants, clockwise from top. The Econiq cycle runs Recovery (left) ->
// Expansion (top) -> Hypersupply (right) -> Contraction (bottom) -> back.
const QUADS = {
  expansion: { label: "EXPANSION", mid: 0, tint: "rgba(95,185,124,0.06)" },
  hypersupply: { label: "HYPERSUPPLY", mid: 90, tint: "rgba(224,163,58,0.06)" },
  contraction: { label: "CONTRACTION", mid: 180, tint: "rgba(229,99,77,0.06)" },
  recovery: { label: "RECOVERY", mid: 270, tint: "rgba(111,168,199,0.06)" },
};
const ORDER = ["expansion", "hypersupply", "contraction", "recovery"];

const CX = 320, CY = 300;
const R_NAT = 240, R_LOC = 178; // ring radii for dots
const HUB = 118;                 // center hub radius
const BAND_I = 150, BAND_O = 268; // quadrant tint band

function polar(r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
function arc(rI, rO, a0, a1) {
  const [xo0, yo0] = polar(rO, a0), [xo1, yo1] = polar(rO, a1);
  const [xi1, yi1] = polar(rI, a1), [xi0, yi0] = polar(rI, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${xo0.toFixed(1)} ${yo0.toFixed(1)} A${rO} ${rO} 0 ${large} 1 ${xo1.toFixed(1)} ${yo1.toFixed(1)} L${xi1.toFixed(1)} ${yi1.toFixed(1)} A${rI} ${rI} 0 ${large} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z`;
}

// Spread n dots across a quadrant's inner 64° span at a given radius.
function placeDots(list, radius, midAngle) {
  const span = 64, n = list.length;
  if (n === 0) return [];
  const start = midAngle - span / 2;
  const step = n === 1 ? 0 : span / (n - 1);
  return list.map((it, i) => {
    const ang = n === 1 ? midAngle : start + step * i;
    const [x, y] = polar(radius, ang);
    return { ...it, x, y, ang };
  });
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div className="h-6" />;
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

export default function MarketReadWheel() {
  const [input, setInput] = useState("");
  const [zip, setZip] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null);

  const load = useCallback((z) => {
    setLoading(true);
    const qs = z ? `?zip=${encodeURIComponent(z)}` : "";
    fetch(`/api/market-read${qs}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]); // national pulls automatically

  function submit() {
    const q = input.trim();
    const z = /^\d{5}$/.test(q) ? q : null;
    if (!z) { setZip("invalid"); return; }
    setZip(z);
    load(z);
  }

  const national = data?.national || [];
  const local = data?.local || [];
  const all = [...national, ...local.filter((s) => !s.pending)];
  const hasLocal = local.some((s) => !s.pending);
  const tally = data?.tally || { green: 0, neutral: 0, red: 0, total: 0 };
  const lead = hasLocal ? data?.lead : null;

  // Build dot positions per ring per quadrant.
  const natDots = ORDER.flatMap((p) =>
    placeDots(national.filter((s) => !s.pending && s.phase === p), R_NAT, QUADS[p].mid)
  );
  const locDots = hasLocal
    ? ORDER.flatMap((p) => placeDots(local.filter((s) => !s.pending && s.phase === p), R_LOC, QUADS[p].mid))
    : [];

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
        <button
          onClick={submit}
          className="mono flex items-center gap-1.5 rounded-md bg-signal px-4 py-2.5 text-[12px] tracking-[0.06em] text-bg transition hover:brightness-110"
        >
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
        <div className="relative mx-auto w-full max-w-[560px]">
          <svg viewBox="0 0 640 600" className="w-full">
            {/* quadrant tint bands + seams */}
            {ORDER.map((p) => {
              const a0 = QUADS[p].mid - 45, a1 = QUADS[p].mid + 45;
              const isLead = lead === p;
              return (
                <g key={p}>
                  <path d={arc(BAND_I, BAND_O, a0 + 1.5, a1 - 1.5)} fill={QUADS[p].tint}
                    stroke={isLead ? "rgba(245,181,68,0.5)" : LINE} strokeWidth={isLead ? 1.4 : 0.8} />
                  {(() => {
                    const [lx, ly] = polar(BAND_O + 24, QUADS[p].mid);
                    return (
                      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                        style={{ fontFamily: MONO }} fontSize="10.5" letterSpacing="1.5"
                        fill={isLead ? GOLD : MUT} opacity={isLead ? 1 : 0.7}>
                        {QUADS[p].label}
                      </text>
                    );
                  })()}
                </g>
              );
            })}

            {/* ring guide circles */}
            <circle cx={CX} cy={CY} r={R_NAT} fill="none" stroke={LINE} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
            <circle cx={CX} cy={CY} r={R_LOC} fill="none" stroke={LINE} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />

            {/* ring labels */}
            <text x={CX} y={CY - R_NAT - 4} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="9" letterSpacing="1.5" fill={MUT} opacity="0.6">NATIONAL</text>
            {hasLocal && (
              <text x={CX} y={CY - R_LOC + 14} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="9" letterSpacing="1.5" fill={MUT} opacity="0.6">LOCAL</text>
            )}

            {/* local ring dots (or dark prompt) */}
            {hasLocal ? locDots.map((d, i) => (
              <g key={`l${i}`} onMouseEnter={() => setHover({ ...d, ring: "local" })} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
                <circle cx={d.x} cy={d.y} r="8.5" fill={SENT[d.sentiment]} opacity={d.structural ? 0.55 : 0.92} />
                <circle cx={d.x} cy={d.y} r="8.5" fill="none" stroke="#08090A" strokeWidth="2" />
              </g>
            )) : null}

            {/* national ring dots */}
            {natDots.map((d, i) => (
              <g key={`n${i}`} onMouseEnter={() => setHover({ ...d, ring: "national" })} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
                <circle cx={d.x} cy={d.y} r="9" fill={SENT[d.sentiment]} opacity="0.95" />
                <circle cx={d.x} cy={d.y} r="9" fill="none" stroke="#08090A" strokeWidth="2" />
                <circle cx={d.x} cy={d.y} r="13" fill="none" stroke={SENT[d.sentiment]} strokeWidth="1" opacity="0.28" />
              </g>
            ))}

            {/* hub */}
            <circle cx={CX} cy={CY} r={HUB} fill="#0B0C0E" stroke={LINE} strokeWidth="1" />
            {hasLocal ? (
              <>
                <text x={CX} y={CY - 46} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="9.5" letterSpacing="2" fill={MUT}>SIGNAL TALLY</text>
                <g>
                  <text x={CX - 58} y={CY} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="30" fontWeight="600" fill={UP}>{tally.green}</text>
                  <text x={CX} y={CY} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="30" fontWeight="600" fill={AMBER}>{tally.neutral}</text>
                  <text x={CX + 58} y={CY} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="30" fontWeight="600" fill={DOWN}>{tally.red}</text>
                  <text x={CX - 58} y={CY + 20} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="8.5" letterSpacing="1" fill={MUT}>GREEN</text>
                  <text x={CX} y={CY + 20} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="8.5" letterSpacing="1" fill={MUT}>NEUTRAL</text>
                  <text x={CX + 58} y={CY + 20} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="8.5" letterSpacing="1" fill={MUT}>RED</text>
                </g>
                {lead && (
                  <text x={CX} y={CY + 52} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="9.5" letterSpacing="1.5" fill={GOLD}>
                    WEIGHT · {QUADS[lead].label}
                  </text>
                )}
              </>
            ) : (
              <>
                <Lock x={CX - 9} y={CY - 34} width="18" height="18" color={MUT} />
                <text x={CX} y={CY + 4} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="10" letterSpacing="0.5" fill={SUB}>ENTER A ZIP</text>
                <text x={CX} y={CY + 22} textAnchor="middle" style={{ fontFamily: MONO }} fontSize="8.5" letterSpacing="0.5" fill={MUT}>to unlock the local read</text>
              </>
            )}
          </svg>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-bg/40 backdrop-blur-[1px]">
              <Loader2 className="animate-spin text-signal" size={22} />
            </div>
          )}

          {/* hover tooltip */}
          {hover && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-[var(--line-strong)] bg-bg2/95 px-3 py-2 text-center shadow-xl">
              <p className="mono text-[11px] tracking-[0.06em] text-ink">{hover.label}</p>
              <p className="mono mt-0.5 text-[15px] font-semibold" style={{ color: SENT[hover.sentiment] }}>
                {hover.unit === "%" && hover.metric > 0 && hover.label.includes("Growth") ? "+" : ""}{hover.metric}{hover.unit}
              </p>
              <p className="mono mt-0.5 text-[9px] tracking-[0.08em] text-muted">
                {hover.grain} · {hover.source || (hover.ring === "national" ? "National" : "")} · {QUADS[hover.phase]?.label}
              </p>
            </div>
          )}
        </div>

        {/* SIGNAL LIST + TRENDS */}
        <div className="space-y-4">
          <Legend />
          <SignalGroup title="National Ring" items={national} />
          {hasLocal && <SignalGroup title="Local Ring" items={local} />}
          {!hasLocal && local.length > 0 && (
            <p className="mono rounded-md border border-[var(--line)] bg-bg2/40 px-3 py-3 text-[11px] leading-relaxed text-muted">
              This ZIP has no resolvable local coverage. The national ring still reads; try a ZIP in a covered metro.
            </p>
          )}
        </div>
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

function SignalGroup({ title, items }) {
  return (
    <div>
      <p className="kicker mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-md border border-[var(--line)] bg-bg2/40 px-3 py-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.pending ? "#2a2c2f" : SENT[s.sentiment] }} />
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
                <Sparkline data={s.trend} color={SENT[s.sentiment]} />
                <span className="mono w-12 shrink-0 text-right text-[12px] font-semibold" style={{ color: SENT[s.sentiment] }}>
                  {s.unit === "%" && s.metric > 0 && s.label.includes("Growth") ? "+" : ""}{s.metric}{s.unit}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
