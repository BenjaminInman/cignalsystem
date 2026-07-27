"use client";

// Non-live PREVIEW of the Indicators tab shown to free members (served in place
// of the real page via the middleware upgrade rewrite). Everything here is
// frozen sample data — no live values, no /api/indicators, no /api/compare — so
// the real intelligence never leaves the paywall. It exists to show the shape of
// the product: the tiles, the expandable detail, the chart, and the
// quarter-over-quarter read, on illustrative numbers only.

import Link from "next/link";
import { Lock } from "lucide-react";
import IndicatorRow from "@/components/IndicatorRow";

const PERIODS = ["Sep '25", "Oct '25", "Nov '25", "Dec '25", "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26"];

// Illustrative only. Values, trends and QoQ are hand-set sample data.
const SAMPLE = [
  {
    cat: "CAPITAL", type: "LEADING", name: "10-Year Treasury", sub: "sample",
    value: "4.28", unit: "%", change: "+0.06 MoM", tone: "neutral", goodUp: false,
    note: "Benchmark cost of capital",
    measures: "The yield on the 10-year US Treasury — the base cost of capital that reprices every asset, cap rates included.",
    impact: "When the 10-year rises, cap rates tend to follow and values compress. It's the most-watched leading input on the capital side.",
    trend: [3.9, 4.0, 4.1, 4.05, 4.2, 4.3, 4.25, 4.28, 4.28], periods: PERIODS, zeroBased: false,
    staticQoQ: [
      { label: "Q3 '25", delta: "+0.10pp", sign: 0.10 },
      { label: "Q4 '25", delta: "+0.18pp", sign: 0.18 },
      { label: "Q1 '26", delta: "+0.07pp", sign: 0.07 },
      { label: "Q2 '26", delta: "-0.03pp", sign: -0.03 },
    ],
  },
  {
    cat: "PERFORMANCE", type: "TRAILING", name: "National Vacancy Rate", sub: "sample",
    value: "5.2", unit: "%", change: "-0.1 MoM", tone: "bull", goodUp: false,
    note: "Occupancy tightness",
    measures: "Share of rental units sitting empty nationally. The clearest lagging read on whether demand is keeping pace with supply.",
    impact: "Falling vacancy tightens the market and gives owners pricing power; rising vacancy is the first hard sign supply has overshot demand.",
    trend: [6.0, 5.9, 5.8, 5.7, 5.6, 5.5, 5.4, 5.3, 5.2], periods: PERIODS, zeroBased: false,
    staticQoQ: [
      { label: "Q3 '25", delta: "-0.20pp", sign: -0.20 },
      { label: "Q4 '25", delta: "-0.25pp", sign: -0.25 },
      { label: "Q1 '26", delta: "-0.20pp", sign: -0.20 },
      { label: "Q2 '26", delta: "-0.15pp", sign: -0.15 },
    ],
  },
  {
    cat: "SUPPLY", type: "LEADING", name: "Multifamily Starts", sub: "sample",
    value: "328", unit: "K units (ann.)", change: "-6.1% MoM", tone: "bull", goodUp: false,
    note: "New supply pipeline",
    measures: "Annualized multifamily housing starts — the leading read on the supply wave that will hit the market in 12–24 months.",
    impact: "Falling starts today ease the supply pressure of tomorrow, setting up firmer fundamentals once the current pipeline delivers.",
    trend: [392, 380, 371, 360, 355, 344, 339, 331, 328], periods: PERIODS, zeroBased: false,
    staticQoQ: [
      { label: "Q3 '25", delta: "-3.1%", sign: -3.1 },
      { label: "Q4 '25", delta: "-4.6%", sign: -4.6 },
      { label: "Q1 '26", delta: "-2.9%", sign: -2.9 },
      { label: "Q2 '26", delta: "-3.4%", sign: -3.4 },
    ],
  },
  {
    cat: "MACRO", type: "COINCIDENT", name: "Personal Saving Rate", sub: "sample",
    value: "3.0", unit: "% of income", change: "+0.0pp MoM", tone: "bear", goodUp: true,
    note: "Consumer cushion",
    measures: "Personal saving as a share of disposable income — the cushion households build in good times and draw down when they're stretched.",
    impact: "Watch it through expansion and hypersupply: a falling saving rate while spending holds means consumers are tapping reserves — stress that surfaces in renter delinquency before it reaches vacancy.",
    trend: [4.3, 3.9, 3.8, 3.6, 4.4, 3.8, 3.5, 3.0, 3.0], periods: PERIODS, zeroBased: false,
    staticQoQ: [
      { label: "Q3 '25", delta: "-0.60pp", sign: -0.60 },
      { label: "Q4 '25", delta: "-0.63pp", sign: -0.63 },
      { label: "Q1 '26", delta: "+0.13pp", sign: 0.13 },
      { label: "Q2 '26", delta: "-0.90pp", sign: -0.90 },
    ],
  },
  {
    cat: "DEMAND", type: "COINCIDENT", name: "Market Rent Growth", sub: "sample",
    value: "+3.8", unit: "% YoY", change: "-0.2 MoM", tone: "neutral", goodUp: true,
    note: "Pricing power",
    measures: "Year-over-year growth in effective market rents — the coincident read on landlord pricing power right now.",
    impact: "Decelerating rent growth is the market telling you pricing power is normalizing; the pace of the slowdown is what separates a soft landing from a turn.",
    trend: [5.1, 4.8, 4.6, 4.4, 4.2, 4.1, 4.0, 3.9, 3.8], periods: PERIODS, zeroBased: false,
    staticQoQ: [
      { label: "Q3 '25", delta: "-0.40pp", sign: -0.40 },
      { label: "Q4 '25", delta: "-0.30pp", sign: -0.30 },
      { label: "Q1 '26", delta: "-0.20pp", sign: -0.20 },
      { label: "Q2 '26", delta: "-0.20pp", sign: -0.20 },
    ],
  },
];

export default function IndicatorsDemo() {
  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-center gap-3">
        <p className="kicker text-signal">Live preview</p>
        <span className="mono rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] tracking-[0.1em] text-muted">
          SAMPLE DATA · NOT LIVE
        </span>
      </div>
      <h2 className="headline mt-3 text-2xl text-ink md:text-3xl">See how an indicator reads</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
        A handful of indicators on illustrative numbers. Expand any tile for the detail, the historical
        trend, and the quarter-over-quarter read. Pro unlocks all 68 with live values, full-history charts,
        the Onion Framework, and the comparison studio.
      </p>

      <div className="mt-6 space-y-4">
        {SAMPLE.map((row) => (
          <IndicatorRow key={row.name} row={row} />
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-bg/40 px-4 py-3">
        <Lock size={13} className="text-signal" />
        <p className="mono text-[11px] text-muted">
          The full catalogue, live values, and quarter-over-quarter comparisons are Pro.
          <Link href="/dashboard" className="ml-2 text-signal hover-line">Upgrade to unlock →</Link>
        </p>
      </div>
    </div>
  );
}
