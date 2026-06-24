"use client";

import { useState } from "react";

const UP = "#5FB97C", DOWN = "#E5634D", GOLD = "#F5B544", INK = "#ECEDEF", MUTED = "#797E85";

const REGION = {
  CT: "Northeast", ME: "Northeast", MA: "Northeast", NH: "Northeast", NJ: "Northeast", NY: "Northeast", PA: "Northeast", RI: "Northeast", VT: "Northeast",
  IL: "Midwest", IN: "Midwest", IA: "Midwest", KS: "Midwest", MI: "Midwest", MN: "Midwest", MO: "Midwest", NE: "Midwest", ND: "Midwest", OH: "Midwest", SD: "Midwest", WI: "Midwest",
  AL: "South", AR: "South", DE: "South", DC: "South", FL: "South", GA: "South", KY: "South", LA: "South", MD: "South", MS: "South", NC: "South", OK: "South", SC: "South", TN: "South", TX: "South", VA: "South", WV: "South",
  AK: "West", AZ: "West", CA: "West", CO: "West", HI: "West", ID: "West", MT: "West", NV: "West", NM: "West", OR: "West", UT: "West", WA: "West", WY: "West",
};
const regionOf = (city) => REGION[(city.split(",")[1] || "").trim()] || "Other";
const shortCity = (city) => city.split(",")[0];

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

function layout(items) {
  const minDeg = 8;
  const withW = items.map((m) => ({ ...m, w: Math.abs(m.rentVal) }));
  const byRegion = {};
  for (const m of withW) (byRegion[regionOf(m.city)] ||= []).push(m);
  const regions = Object.entries(byRegion)
    .map(([region, its]) => ({ region, items: its.sort((a, b) => b.w - a.w), w: its.reduce((s, x) => s + x.w, 0) }))
    .sort((a, b) => b.w - a.w);
  const flat = regions.flatMap((r) => r.items);
  const total = flat.reduce((s, x) => s + x.w, 0) || 1;
  let degs = flat.map((m) => Math.max((m.w / total) * 360, minDeg));
  const dsum = degs.reduce((a, b) => a + b, 0);
  degs = degs.map((d) => (d / dsum) * 360);
  const degOf = {};
  flat.forEach((m, i) => (degOf[m.city] = degs[i]));
  let acc = 0;
  const wedges = [], regionArcs = [];
  for (const r of regions) {
    const a0r = acc;
    for (const m of r.items) { const d = degOf[m.city]; wedges.push({ ...m, a0: acc, a1: acc + d }); acc += d; }
    regionArcs.push({ region: r.region, a0: a0r, a1: acc });
  }
  return { wedges, regionArcs, maxW: Math.max(...withW.map((m) => m.w), 0.01) };
}

function Donut({ items, color, label }) {
  const [hover, setHover] = useState(null);
  if (!items.length) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex aspect-square w-full max-w-[300px] items-center justify-center rounded-full border border-[var(--line)]">
          <span className="mono text-[11px] text-muted">no markets {label === "GAINERS" ? "in growth" : "in decline"}</span>
        </div>
      </div>
    );
  }
  const { wedges, regionArcs, maxW } = layout(items);
  const CX = 290, CY = 200, rHub = 78, rI1 = 82, rI2 = 122, rO1 = 126, rO2 = 182, POP = 11;
  const avg = items.reduce((s, m) => s + m.rentVal, 0) / items.length;
  const fmt = (v) => `${v >= 0 ? "+" : ""}${Math.round(v * 10) / 10}%`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 580 410" className="w-full max-w-[540px]" onMouseLeave={() => setHover(null)}>
        {/* inner ring: regions */}
        {regionArcs.map((r) => (
          <path key={`r-${r.region}`} d={arcPath(CX, CY, rI1, rI2, r.a0, r.a1)} fill={color} fillOpacity={0.14} stroke="#08090A" strokeWidth="1" />
        ))}
        {regionArcs.filter((r) => r.a1 - r.a0 > 26).map((r) => {
          const [tx, ty] = polar(CX, CY, (rI1 + rI2) / 2, (r.a0 + r.a1) / 2);
          return <text key={`rl-${r.region}`} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontFamily="IBM Plex Mono" fill={MUTED} style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{r.region}</text>;
        })}
        {/* outer ring: cities */}
        {wedges.map((w) => {
          const t = w.w / maxW;
          const on = hover?.city === w.city;
          const mid = (w.a0 + w.a1) / 2;
          const ux = Math.cos(((mid - 90) * Math.PI) / 180), uy = Math.sin(((mid - 90) * Math.PI) / 180);
          return (
            <path
              key={w.city}
              d={arcPath(CX, CY, rO1, rO2, w.a0, w.a1)}
              fill={color}
              fillOpacity={on ? 1 : 0.38 + 0.55 * t}
              stroke={on ? GOLD : "#08090A"}
              strokeWidth={on ? 1.5 : 1}
              style={{ cursor: "pointer", transition: "transform .16s ease, fill-opacity .15s", transform: on ? `translate(${POP * ux}px, ${POP * uy}px)` : undefined }}
              onMouseEnter={() => setHover(w)}
            />
          );
        })}
        {/* city labels (two-line) for wider wedges */}
        {wedges.filter((w) => w.a1 - w.a0 >= 12).map((w) => {
          const mid = (w.a0 + w.a1) / 2;
          const on = hover?.city === w.city;
          const [lx, ly] = polar(CX, CY, rO2 + (on ? POP + 12 : 12), mid);
          const sn = Math.sin(((mid - 90) * Math.PI) / 180);
          const anchor = sn > 0.08 ? "start" : sn < -0.08 ? "end" : "middle";
          return (
            <text key={`l-${w.city}`} x={lx} y={ly} textAnchor={anchor} fontFamily="IBM Plex Mono" fill={on ? INK : MUTED}>
              <tspan x={lx} dy="-1" fontSize="9.5">{shortCity(w.city)}</tspan>
              <tspan x={lx} dy="11" fontSize="9" fill={color}>{fmt(w.rentVal)}</tspan>
            </text>
          );
        })}
        {/* center hub */}
        <circle cx={CX} cy={CY} r={rHub} fill="#0B0C0E" stroke="var(--line)" />
        {hover ? (
          <>
            <text x={CX} y={CY - 14} textAnchor="middle" fontSize="12" fontFamily="IBM Plex Mono" fill={INK}>{shortCity(hover.city)}</text>
            <text x={CX} y={CY + 5} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono" fill={MUTED} style={{ letterSpacing: "0.06em" }}>{regionOf(hover.city).toUpperCase()}</text>
            <text x={CX} y={CY + 26} textAnchor="middle" fontSize="17" fontWeight="600" fontFamily="IBM Plex Mono" fill={color}>{fmt(hover.rentVal)}</text>
          </>
        ) : (
          <>
            <text x={CX} y={CY - 12} textAnchor="middle" fontSize="10.5" fontFamily="IBM Plex Mono" fill={color} style={{ letterSpacing: "0.14em" }}>{label}</text>
            <text x={CX} y={CY + 12} textAnchor="middle" fontSize="20" fontWeight="600" fontFamily="IBM Plex Mono" fill={INK}>{items.length}</text>
            <text x={CX} y={CY + 29} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono" fill={MUTED}>avg {fmt(avg)}</text>
          </>
        )}
      </svg>
    </div>
  );
}

export default function RentRadial({ markets = [] }) {
  const live = markets.filter((m) => Number.isFinite(m.rentVal));
  const gainers = live.filter((m) => m.rentVal > 0);
  const losers = live.filter((m) => m.rentVal < 0);
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <Donut items={gainers} color={UP} label="GAINERS" />
        <p className="mono mt-1 text-center text-[10px] tracking-[0.1em] text-up">RENT GROWTH</p>
      </div>
      <div>
        <Donut items={losers} color={DOWN} label="DECLINERS" />
        <p className="mono mt-1 text-center text-[10px] tracking-[0.1em] text-down">RENT DECLINE</p>
      </div>
    </div>
  );
}
