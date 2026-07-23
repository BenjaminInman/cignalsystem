"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const SENT = "#E5634D";
const FUND = "#5B8DEF";

const TESTS = [
  { q: "Does housing cost explain the gap?", a: "No — adding shelter and mortgage rates widens it" },
  { q: "Does the gap forecast home prices?", a: "No — the relationship runs backwards" },
  { q: "Does the gap forecast rents or vacancy?", a: "No — weakest forward rent growth follows the deepest gaps" },
  { q: "Does the gap forecast unemployment?", a: "No — flat across every quintile" },
  { q: "How does the gap close?", a: "Sentiment corrects, fundamentals barely move" },
];

function Chart({ series }) {
  if (!series?.length) return null;

  const W = 860;
  const H = 260;
  const P = { t: 14, r: 14, b: 26, l: 34 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;

  const lo = -3.2;
  const hi = 2.6;
  const x = (i) => P.l + (i / (series.length - 1)) * iw;
  const y = (v) => P.t + ((hi - v) / (hi - lo)) * ih;

  const path = (key) =>
    series.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(" ");

  // Area between the two legs, split so the fill colour can carry the sign.
  const band =
    series.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(r.s).toFixed(1)}`).join(" ") +
    " " +
    series
      .slice()
      .reverse()
      .map((r, i) => `L${x(series.length - 1 - i).toFixed(1)} ${y(r.f).toFixed(1)}`)
      .join(" ") +
    " Z";

  const years = [];
  series.forEach((r, i) => {
    const yr = parseInt(r.d.slice(0, 4), 10);
    if (yr % 5 === 0 && r.d.slice(5, 7) === "01") years.push({ i, yr });
  });

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label="Consumer sentiment against economic fundamentals, both standardised, 1987 to 2026. Sentiment has run far below fundamentals since 2022.">
        {[-3, -2, -1, 0, 1, 2].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)}
              stroke={v === 0 ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.07)"} strokeWidth="1" />
            <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" className="mono"
              fill="rgba(255,255,255,.42)" fontSize="9.5">{v}</text>
          </g>
        ))}
        {years.map(({ i, yr }) => (
          <line key={`g${yr}`} x1={x(i)} x2={x(i)} y1={P.t} y2={H - P.b}
            stroke="rgba(255,255,255,.05)" strokeWidth="1" />
        ))}
        <path d={band} fill="rgba(229,99,77,.13)" />
        <path d={path("f")} fill="none" stroke={FUND} strokeWidth="1.5" strokeDasharray="5 4" />
        <path d={path("s")} fill="none" stroke={SENT} strokeWidth="1.6" />
        {years.map(({ i, yr }) => (
          <text key={yr} x={x(i)} y={H - 8} textAnchor="middle" className="mono"
            fill="rgba(255,255,255,.42)" fontSize="9.5">{yr}</text>
        ))}
      </svg>
      <div className="mono mt-2 flex flex-wrap gap-x-5 gap-y-1.5 px-1 text-[9.5px] tracking-[0.08em] text-muted">
        <span className="flex items-center gap-1.5">
          <span style={{ width: 14, height: 2, background: SENT, display: "inline-block" }} /> SENTIMENT
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 14, height: 0, borderTop: `2px dashed ${FUND}`, display: "inline-block" }} /> FUNDAMENTALS
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mono text-[9.5px] tracking-[0.12em] text-muted">{label}</div>
      <div className="headline mt-1.5 text-2xl text-ink">{value}</div>
      {sub ? <div className="mt-0.5 text-[11.5px] text-muted">{sub}</div> : null}
    </div>
  );
}

export default function FundamentalsGapPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/fundamentals-gap")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr(true));
  }, []);

  const asOf = data?.asOf
    ? new Date(data.asOf + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
      <Link href="/research" className="mono inline-flex items-center gap-2 text-[10px] tracking-[0.12em] text-muted hover:text-ink">
        <ArrowLeft size={13} /> RESEARCH
      </Link>

      <div className="mono mt-7 flex flex-wrap items-center gap-2 text-[9.5px] tracking-[0.12em]">
        <span className="rounded px-2 py-1" style={{ color: "var(--signal)", border: "1px solid rgba(245,181,68,.35)" }}>
          LEADING MINUS TRAILING
        </span>
        <span className="text-muted">CIGNAL CONSTRUCT</span>
      </div>

      <h1 className="headline mt-3 text-4xl text-ink md:text-5xl">The Fundamentals Gap</h1>
      <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted">
        How consumers say they feel about the economy, measured against what the economy is
        actually doing. Both legs standardised against their own history, then differenced.
      </p>

      {err ? (
        <p className="mt-8 text-[13px] text-muted">Data unavailable right now.</p>
      ) : !data ? (
        <p className="mt-8 text-[13px] text-muted">Loading&hellip;</p>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat label="CURRENT READING" value={`${data.current > 0 ? "+" : ""}${data.current.toFixed(2)} sd`} sub={asOf ? `as of ${asOf}` : null} />
            <Stat label="PERCENTILE SINCE 1987" value={`${data.percentile.toFixed(1)}%`} sub={`${data.count} monthly readings`} />
            <Stat label="MONTHS AT OR BELOW −1 SD" value={String(data.streak)} sub="consecutive, through the latest print" />
          </div>

          <Chart series={data.series} />

          <h2 className="headline mt-12 text-2xl text-ink">What we tested</h2>
          <div className="mt-4 border-t border-white/10">
            {TESTS.map((t) => (
              <div key={t.q} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-white/10 py-3">
                <span className="text-[13.5px] text-ink">{t.q}</span>
                <span className="text-[13px] text-muted">{t.a}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border p-5 md:p-6" style={{ borderColor: "rgba(245,181,68,.32)", background: "rgba(245,181,68,.06)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} color="#F5B544" />
              <span className="mono text-[10px] tracking-[0.12em]" style={{ color: "var(--signal)" }}>
                THIS IS NOT A TIMING SIGNAL
              </span>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
              The gap forecasts nothing we could measure. Across four independent episodes since
              1987, extreme readings carried no usable information about forward home prices,
              rents, vacancy, or employment &mdash; and where a relationship appeared at all, it
              ran opposite to the intuitive one. We publish it because the divergence is real and
              the lesson is worth more than the indicator: a series can sit at a forty-year
              extreme, look unmistakably leading, and still tell you nothing about what happens
              next. Read it as context, never as an entry signal.
            </p>
          </div>

          <p className="mt-8 text-[11.5px] leading-relaxed text-muted">
            Sources: University of Michigan Surveys of Consumers; U.S. Bureau of Labor Statistics;
            U.S. Bureau of Economic Analysis &mdash; all retrieved via FRED, Federal Reserve Bank
            of St. Louis. Method after Federal Reserve Bank of Richmond. Sentiment is released to
            FRED on a one-month delay at the source&apos;s request, so the sentiment leg dates to{" "}
            {asOf || "the latest available month"} while the fundamentals legs may be one month
            more current.
          </p>
        </>
      )}
    </main>
  );
}
