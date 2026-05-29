"use client";

import { Plus, DollarSign, TrendingUp, Building2, Activity } from "lucide-react";
import { PORTFOLIO_STATS, PORTFOLIO_ASSETS } from "@/lib/data";
import { toneColor, StatusPill } from "@/components/ui";

const ICONS = { "TOTAL PORTFOLIO VALUE": DollarSign, "ANNUAL NOI": TrendingUp, "TOTAL UNITS": Building2, "AVG OCCUPANCY": Activity };

function NoiChart() {
  const max = Math.max(...PORTFOLIO_ASSETS.map((a) => a.noi));
  const w = 1100, h = 230, pad = 30;
  const bw = (w - pad * 2) / PORTFOLIO_ASSETS.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full">
      {PORTFOLIO_ASSETS.map((a, i) => {
        const x = pad + i * bw + bw * 0.2;
        const bwInner = bw * 0.6;
        const hgt = (a.noi / max) * (h - pad);
        return (
          <g key={a.name}>
            <rect x={x} y={h - hgt} width={bwInner} height={hgt} rx="4" fill="#F5B544" opacity="0.85" />
            <text x={x + bwInner / 2} y={h + 18} textAnchor="middle" fontSize="11" fill="#797e85" fontFamily="IBM Plex Mono">{a.name.split(" ")[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function PortfolioPage() {
  return (
    <div className="pt-12 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="headline text-4xl text-ink md:text-5xl">Portfolio Tracker</h1>
          <p className="mt-3 max-w-2xl text-muted">Monitor your multifamily assets against live market signals.</p>
        </div>
        <button className="mono flex items-center gap-2 rounded-sm bg-signal px-4 py-2.5 text-[12px] tracking-[0.06em] text-bg hover:opacity-90"><Plus size={14} /> Add Asset</button>
      </div>

      <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {PORTFOLIO_STATS.map((s) => {
          const Icon = ICONS[s.label];
          return (
            <div key={s.label} className="bg-bg2 p-6">
              <p className="kicker mb-4 flex items-center gap-2"><Icon size={13} className="text-muted" /> {s.label}</p>
              <p className="headline text-3xl" style={{ color: toneColor(s.tone) }}>{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="mb-4 font-semibold text-ink">NOI by Asset ($M)</h2>
        <NoiChart />
      </div>

      <div className="mt-8 space-y-4">
        {PORTFOLIO_ASSETS.map((a) => (
          <div key={a.name} className="card flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-semibold text-ink">{a.name}</h3>
                <span className="mono rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-muted">{a.grade}</span>
                <StatusPill tone={a.tone} />
              </div>
              <p className="mono mt-1 text-[12px] text-muted">{a.loc} · {a.units} units</p>
            </div>
            <div className="grid grid-cols-3 gap-x-8 gap-y-2 sm:grid-cols-5">
              <Col label="Value" value={a.value} />
              <Col label="Gain/Loss" value={a.gl} color={a.glUp ? "#5FB97C" : "#E5634D"} />
              <Col label="Cap Rate" value={a.cap} />
              <Col label="Occupancy" value={a.occ} />
              <Col label="Rent Δ" value={a.rent} color={a.rentUp ? "#5FB97C" : "#E5634D"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Col({ label, value, color }) {
  return (
    <div>
      <p className="mono text-[10px] tracking-[0.1em] text-muted">{label}</p>
      <p className="mono mt-1 text-sm" style={{ color: color || "#eceeef" }}>{value}</p>
    </div>
  );
}
