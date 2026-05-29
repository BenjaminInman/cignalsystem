"use client";

// NOTE: These figures are illustrative placeholders for layout purposes.
// Replace `INDICATORS` with a live feed (FRED, Census, Treasury, etc.) later.
const INDICATORS = [
  { label: "U.S. AVG RENT GROWTH (YoY)", value: "+1.4%", dir: "up" },
  { label: "OCCUPANCY RATE", value: "94.2%", dir: "down" },
  { label: "AVG DAYS ON MARKET", value: "38d", dir: "up" },
  { label: "10-YR TREASURY", value: "4.31%", dir: "down" },
  { label: "FORECLOSURE FILINGS (MoM)", value: "+2.7%", dir: "up" },
  { label: "MULTIFAMILY STARTS (SAAR)", value: "342K", dir: "down" },
  { label: "NET ABSORPTION (Q)", value: "118K units", dir: "up" },
  { label: "CAP RATE — NATL AVG", value: "5.6%", dir: "up" },
  { label: "EFFECTIVE RENT INDEX", value: "1,742", dir: "up" },
  { label: "CONCESSIONS PREVALENCE", value: "31%", dir: "up" },
];

function Item({ label, value, dir }) {
  const color = dir === "up" ? "#5FB97C" : "#E5634D";
  const arrow = dir === "up" ? "▲" : "▼";
  return (
    <span className="mono inline-flex items-center gap-2 px-7 text-[12.5px] tracking-wide">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
      <span style={{ color }}>{arrow}</span>
      <span className="text-[var(--line-strong)]">/</span>
    </span>
  );
}

export default function Ticker() {
  const loop = [...INDICATORS, ...INDICATORS];
  return (
    <div className="relative w-full overflow-hidden border-y border-[var(--line)] bg-bg2/70 backdrop-blur">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-bg2 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-bg2 to-transparent" />
      <div className="absolute left-4 top-1/2 z-20 -translate-y-1/2">
        <span className="mono flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-signal">
          <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" />
          LIVE FEED
        </span>
      </div>
      <div className="flex w-max animate-ticker py-2.5 pl-32 will-change-transform">
        {loop.map((it, i) => (
          <Item key={i} {...it} />
        ))}
      </div>
    </div>
  );
}
