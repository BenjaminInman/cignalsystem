"use client";

import { useState, useEffect, useMemo } from "react";
import { Compass, Loader2 } from "lucide-react";

const UP = "#5FB97C", DOWN = "#E5634D", AMBER = "#E0A33A", GOLD = "#F5B544";
const INK = "#ECEDEF", SUB = "#C9CCD1", MUT = "#797E85";
const HUB = "#0B0C0E", SEP = "#08090A", LINE = "#20242A";
const C = { g: UP, r: DOWN, a: AMBER };
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const ROLES = [
  { key: "leading", label: "LEADING" },
  { key: "coincident", label: "COINCIDENT" },
  { key: "trailing", label: "LAGGING" },
];

// geometry
const CX = 340, CY = 286;
const HUBr = 88, gI = 92, gO = 137, oI = 143, oO = 214, LR = 225;
const GAP = 5, MIN = 16;

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

export default function CycleWheel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let cancel = false;
    fetch("/api/cycle-wheel")
      .then((r) => r.json())
      .then((d) => { if (!cancel) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const layout = useMemo(() => {
    if (!data || !data.indicators?.length) return null;
    const byRole = ROLES.map((r) => ({ ...r, items: data.indicators.filter((x) => x.role === r.key) })).filter((r) => r.items.length);
    const all = byRole.flatMap((r) => r.items);
    const tot = all.reduce((s, x) => s + x.weight, 0) || 1;
    const maxw = Math.max(...all.map((x) => x.weight), 0.001);
    const avail = 360 - byRole.length * GAP;
    let raws = all.map((x) => Math.max((x.weight / tot) * avail, MIN));
    const sc = avail / raws.reduce((a, b) => a + b, 0);
    raws = raws.map((d) => d * sc);

    let acc = 0, idx = 0;
    const wedges = [], roleArcs = [], labels = [];
    byRole.forEach((role) => {
      const r0 = acc;
      role.items.forEach((it) => {
        const d = raws[idx++];
        const a0 = acc, a1 = acc + d; acc += d;
        const t = it.weight / maxw;
        wedges.push({ d: arc(oI, oO, a0, a1), fill: C[it.sentiment], op: 0.4 + 0.55 * t, it });
        const mid = (a0 + a1) / 2;
        const [lx, ly] = polar(LR, mid);
        const sn = Math.sin(((mid - 90) * Math.PI) / 180);
        const anchor = sn > 0.12 ? "start" : sn < -0.12 ? "end" : "middle";
        labels.push({ lx, ly, anchor, it });
      });
      const r1 = acc; acc += GAP;
      const cnt = { g: 0, r: 0, a: 0 };
      role.items.forEach((it) => cnt[it.sentiment]++);
      const dom = cnt.r > cnt.g && cnt.r >= cnt.a ? "r" : cnt.g > cnt.r && cnt.g >= cnt.a ? "g" : "a";
      const lop = Math.max(cnt.g, cnt.r, cnt.a) / role.items.length;
      const mid = (r0 + r1) / 2;
      const [tx, ty] = polar((gI + gO) / 2, mid);
      roleArcs.push({ d: arc(gI, gO, r0, r1), fill: C[dom], op: 0.16 + 0.32 * lop, label: role.label, tx, ty });
    });
    return { wedges, roleArcs, labels };
  }, [data]);

  const b = data?.balance;
  const hoverIt = hover && data ? data.indicators.find((x) => x.slug === hover) : null;

  return (
    <div className="card p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker mb-1 flex items-center gap-2">
            <Compass size={13} className="text-signal" /> Market Cycle
          </p>
          <h2 className="headline text-2xl text-ink md:text-3xl">Where Are We in the Cycle?</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Twelve national indicators across three timing layers &mdash; leading, coincident, and lagging.
            Each wedge is sized by signal strength and colored by direction. The leading layer turns first,
            so watch it move ahead of the laggards.
          </p>
        </div>
        <span className="mono shrink-0 text-[10px] tracking-[0.06em] text-muted">
          {loading ? (
            <><Loader2 size={11} className="mr-1 inline animate-spin align-[-1px]" />loading&hellip;</>
          ) : data?.asOf ? (
            `AS OF ${String(data.asOf).slice(0, 7)}`
          ) : (
            ""
          )}
        </span>
      </div>

      <div className="mt-4 flex justify-center">
        <svg viewBox="0 0 680 558" className="w-full max-w-[640px]" role="img" aria-label="Market cycle signal wheel">
          {layout && (
            <>
              {layout.roleArcs.map((r, i) => (
                <path key={`ra${i}`} d={r.d} fill={r.fill} fillOpacity={r.op} stroke={SEP} strokeWidth="2" />
              ))}
              {layout.wedges.map((w, i) => {
                const on = hover === w.it.slug;
                return (
                  <path
                    key={`w${i}`}
                    d={w.d}
                    fill={w.fill}
                    fillOpacity={on ? Math.min(1, w.op + 0.18) : w.op}
                    stroke={on ? GOLD : SEP}
                    strokeWidth={on ? 1.5 : 2}
                    onMouseEnter={() => setHover(w.it.slug)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              {layout.roleArcs.map((r, i) => (
                <text key={`rl${i}`} x={r.tx} y={r.ty + 3.5} textAnchor="middle" fontSize="11" fontFamily={MONO} fill={INK} letterSpacing="0.4">
                  {r.label}
                </text>
              ))}
              {layout.labels.map((l, i) => (
                <text key={`l${i}`} x={l.lx} y={l.ly} textAnchor={l.anchor} fontFamily={MONO}>
                  <tspan x={l.lx} dy="-1" fontSize="11.5" fill={hover === l.it.slug ? INK : SUB}>{l.it.label}</tspan>
                  <tspan x={l.lx} dy="12.5" fontSize="11" fill={C[l.it.sentiment]}>{l.it.value}</tspan>
                </text>
              ))}

              <circle cx={CX} cy={CY} r={HUBr} fill={HUB} stroke={LINE} strokeWidth="1.5" />
              <circle cx={CX} cy={CY} r={HUBr - 1} fill="none" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />

              {hoverIt ? (
                <>
                  <text x={CX} y={CY - 18} textAnchor="middle" fontFamily={MONO} fontSize="9" fill={MUT} letterSpacing="1.5">
                    {hoverIt.role.toUpperCase()}
                  </text>
                  <text x={CX} y={CY + 6} textAnchor="middle" fontFamily={MONO} fontSize="18" fill={INK}>
                    {hoverIt.label}
                  </text>
                  <text x={CX} y={CY + 28} textAnchor="middle" fontFamily={MONO} fontSize="14" fill={C[hoverIt.sentiment]}>
                    {hoverIt.value}
                  </text>
                </>
              ) : (
                <>
                  <text x={CX} y={CY - 22} textAnchor="middle" fontFamily={MONO} fontSize="9.5" fill={MUT} letterSpacing="1.5">
                    SIGNAL BALANCE
                  </text>
                  <text x={CX} y={CY + 6} textAnchor="middle" fontFamily={MONO} fontSize="23">
                    <tspan fill={UP}>{b ? b.up : "·"}</tspan>
                    <tspan fill={MUT}>{"  "}</tspan>
                    <tspan fill={AMBER}>{b ? b.turn : "·"}</tspan>
                    <tspan fill={MUT}>{"  "}</tspan>
                    <tspan fill={DOWN}>{b ? b.down : "·"}</tspan>
                  </text>
                  <text x={CX} y={CY + 26} textAnchor="middle" fontFamily={MONO} fontSize="9" fill={MUT} letterSpacing="0.5">
                    of {b ? b.total : 12} indicators
                  </text>
                </>
              )}
            </>
          )}
        </svg>
      </div>

      <div className="mono mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><i style={{ background: UP }} className="inline-block h-2 w-2 rounded-full" />supportive</span>
        <span className="flex items-center gap-1.5"><i style={{ background: AMBER }} className="inline-block h-2 w-2 rounded-full" />turning</span>
        <span className="flex items-center gap-1.5"><i style={{ background: DOWN }} className="inline-block h-2 w-2 rounded-full" />deteriorating</span>
        <span className="text-[10px] tracking-[0.04em]">ring 1 = role &middot; ring 2 = indicators &middot; size = signal strength</span>
      </div>
    </div>
  );
}
