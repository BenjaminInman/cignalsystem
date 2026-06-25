"use client";

import { useState } from "react";

const UP = "#5FB97C", DOWN = "#E5634D", GOLD = "#F5B544", INK = "#ECEDEF", MUTED = "#797E85";

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx, cy, rI, rO, a0, a1) {
  const s = Math.min(a1, a0 + 359.9);
  const [xo0, yo0] = polar(cx, cy, rO, a0), [xo1, yo1] = polar(cx, cy, rO, s);
  const [xi1, yi1] = polar(cx, cy, rI, s), [xi0, yi0] = polar(cx, cy, rI, a0);
  const large = s - a0 > 180 ? 1 : 0;
  return `M${xo0} ${yo0} A${rO} ${rO} 0 ${large} 1 ${xo1} ${yo1} L${xi1} ${yi1} A${rI} ${rI} 0 ${large} 0 ${xi0} ${yi0} Z`;
}

// Lay out members as wedges, grouped advancers-first then decliners,
// each wedge sized by magnitude of move (min floor so small movers stay visible).
function layout(members) {
  const minDeg = 10;
  const tagged = members.map((m) => ({ ...m, up: m.chg >= 0, w: Math.abs(m.chg) }));
  const gainers = tagged.filter((m) => m.up).sort((a, b) => b.w - a.w);
  const losers = tagged.filter((m) => !m.up).sort((a, b) => b.w - a.w);
  const flat = [...gainers, ...losers];
  const total = flat.reduce((s, x) => s + x.w, 0) || 1;
  let degs = flat.map((m) => Math.max((m.w / total) * 360, minDeg));
  const dsum = degs.reduce((a, b) => a + b, 0);
  degs = degs.map((d) => (d / dsum) * 360);
  let acc = 0;
  const wedges = [];
  const groups = { Advancing: { a0: 0, a1: 0, color: UP, n: gainers.length }, Declining: { a0: 0, a1: 0, color: DOWN, n: losers.length } };
  flat.forEach((m, i) => {
    const d = degs[i];
    wedges.push({ ...m, a0: acc, a1: acc + d });
    acc += d;
  });
  if (gainers.length) { groups.Advancing.a0 = wedges[0].a0; groups.Advancing.a1 = wedges[gainers.length - 1].a1; }
  if (losers.length) { groups.Declining.a0 = wedges[gainers.length].a0; groups.Declining.a1 = wedges[wedges.length - 1].a1; }
  const maxW = Math.max(...flat.map((m) => m.w), 0.01);
  return { wedges, groups, maxW };
}

export default function IndexDonut({ members = [] }) {
  const [hover, setHover] = useState(null);
  const live = members.filter((m) => Number.isFinite(m.chg));
  if (!live.length) {
    return (
      <div className="flex aspect-square w-full max-w-[300px] items-center justify-center rounded-full border border-[var(--line)]">
        <span className="mono text-[11px] text-muted">no quotes</span>
      </div>
    );
  }
  const { wedges, groups, maxW } = layout(live);
  const CX = 180, CY = 168, rHub = 54, rI1 = 58, rI2 = 84, rO1 = 88, rO2 = 132, POP = 9;
  const avg = live.reduce((s, m) => s + m.chg, 0) / live.length;
  const up = live.filter((m) => m.chg >= 0).length;
  const fmt = (v) => `${v >= 0 ? "+" : ""}${Math.round(v * 100) / 100}%`;

  return (
    <svg viewBox="0 0 360 336" className="w-full max-w-[460px]" onMouseLeave={() => setHover(null)}>
      {/* inner ring: advancing / declining split */}
      {Object.entries(groups).filter(([, g]) => g.n > 0 && g.a1 - g.a0 > 0.5).map(([name, g]) => (
        <path key={`g-${name}`} d={arcPath(CX, CY, rI1, rI2, g.a0, g.a1)} fill={g.color} fillOpacity={0.16} stroke="#08090A" strokeWidth="1" />
      ))}
      {Object.entries(groups).filter(([, g]) => g.n > 0 && g.a1 - g.a0 > 30).map(([name, g]) => {
        const [tx, ty] = polar(CX, CY, (rI1 + rI2) / 2, (g.a0 + g.a1) / 2);
        return <text key={`gl-${name}`} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="IBM Plex Mono" fill={MUTED} style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{name}</text>;
      })}
      {/* outer ring: individual stocks */}
      {wedges.map((w) => {
        const t = w.w / maxW;
        const on = hover?.ticker === w.ticker;
        const color = w.up ? UP : DOWN;
        const mid = (w.a0 + w.a1) / 2;
        const ux = Math.cos(((mid - 90) * Math.PI) / 180), uy = Math.sin(((mid - 90) * Math.PI) / 180);
        return (
          <path
            key={w.ticker}
            d={arcPath(CX, CY, rO1, rO2, w.a0, w.a1)}
            fill={color}
            fillOpacity={on ? 1 : 0.4 + 0.55 * t}
            stroke={on ? GOLD : "#08090A"}
            strokeWidth={on ? 1.5 : 1}
            style={{ cursor: "pointer", transition: "transform .16s ease, fill-opacity .15s", transform: on ? `translate(${POP * ux}px, ${POP * uy}px)` : undefined }}
            onMouseEnter={() => setHover(w)}
          />
        );
      })}
      {/* ticker labels on wider wedges */}
      {wedges.filter((w) => w.a1 - w.a0 >= 16).map((w) => {
        const mid = (w.a0 + w.a1) / 2;
        const on = hover?.ticker === w.ticker;
        const [lx, ly] = polar(CX, CY, rO2 + (on ? POP + 11 : 11), mid);
        const sn = Math.sin(((mid - 90) * Math.PI) / 180);
        const anchor = sn > 0.08 ? "start" : sn < -0.08 ? "end" : "middle";
        return (
          <text key={`l-${w.ticker}`} x={lx} y={ly} textAnchor={anchor} fontFamily="IBM Plex Mono" fill={on ? INK : MUTED}>
            <tspan x={lx} dy="-1" fontSize="9">{w.ticker}</tspan>
            <tspan x={lx} dy="10.5" fontSize="8.5" fill={w.up ? UP : DOWN}>{fmt(w.chg)}</tspan>
          </text>
        );
      })}
      {/* center hub */}
      <circle cx={CX} cy={CY} r={rHub} fill="#0B0C0E" stroke="var(--line)" />
      {hover ? (
        <>
          <text x={CX} y={CY - 10} textAnchor="middle" fontSize="13" fontWeight="600" fontFamily="IBM Plex Mono" fill={INK}>{hover.ticker}</text>
          <text x={CX} y={CY + 14} textAnchor="middle" fontSize="16" fontWeight="600" fontFamily="IBM Plex Mono" fill={hover.up ? UP : DOWN}>{fmt(hover.chg)}</text>
        </>
      ) : (
        <>
          <text x={CX} y={CY - 12} textAnchor="middle" fontSize="9.5" fontFamily="IBM Plex Mono" fill={avg >= 0 ? UP : DOWN} style={{ letterSpacing: "0.12em" }}>AVG</text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize="18" fontWeight="600" fontFamily="IBM Plex Mono" fill={avg >= 0 ? UP : DOWN}>{fmt(avg)}</text>
          <text x={CX} y={CY + 27} textAnchor="middle" fontSize="8.5" fontFamily="IBM Plex Mono" fill={MUTED}>{up}/{live.length} up</text>
        </>
      )}
    </svg>
  );
}
