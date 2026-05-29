"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Newspaper, ArrowUpRight } from "lucide-react";
import { toneColor, Sparkline, StatusPill } from "@/components/ui";
import SignalCard from "@/components/SignalCard";
import {
  COMPOSITE, DASH_STATS, LEADING_CARDS, TRAILING_CARDS, TOP_MARKETS, SIGNALS, NEWS,
} from "@/lib/data";

function IndicatorCard({ c }) {
  const color = toneColor(c.tone);
  const arrow = c.dir === "up" ? "↑" : "↓";
  return (
    <div className="card p-6">
      <div className="mb-5 flex items-start justify-between">
        <span className="kicker">{c.cat}</span>
        <StatusPill tone={c.tone} />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{c.name}</h3>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="headline text-3xl text-ink">{c.value}</div>
          <div className="mono mt-1 text-[12px]" style={{ color }}>{arrow} {c.delta}</div>
        </div>
        <Sparkline series={c.series} color={color} />
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-muted">{c.note}</p>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("leading");
  const cards = tab === "leading" ? LEADING_CARDS : TRAILING_CARDS;
  const compColor = toneColor(COMPOSITE.tone);

  // Featured signals rotate daily to entice sign-ups (stable within a day).
  const [featured, setFeatured] = useState(SIGNALS.slice(0, 4));
  useEffect(() => {
    const day = Math.floor(Date.now() / 86400000);
    const start = day % SIGNALS.length;
    const rotated = [...SIGNALS.slice(start), ...SIGNALS.slice(0, start)].slice(0, 4);
    setFeatured(rotated);
  }, []);

  const latestNews = NEWS.slice(0, 3);

  return (
    <div className="pb-10">
      {/* HERO */}
      <section className="fade-up relative pt-20 pb-16 md:pt-28">
        <p className="kicker mb-6 flex items-center gap-3">
          <span className="h-px w-8 bg-signal/60" />
          Market Intelligence · Multifamily Real Estate
        </p>
        <h1 className="headline max-w-4xl text-5xl text-ink md:text-7xl">
          The signals the market<br />doesn&apos;t <span className="text-signal">broadcast.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
          Cignal System decodes the economic data moving multifamily real estate — separating the{" "}
          <span className="text-ink">leading indicators</span> that predict the next phase from the{" "}
          <span className="text-ink">trailing noise</span> everyone else reacts to.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/signals" className="mono rounded-sm bg-signal px-6 py-3 text-[13px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90">
            VIEW LIVE SIGNALS →
          </Link>
          <Link href="/forecasts" className="hover-line mono text-[13px] tracking-[0.08em] text-muted hover:text-ink">
            SEE THE FORECASTS
          </Link>
        </div>
      </section>

      {/* DASHBOARD HEADER + COMPOSITE */}
      <section className="grid gap-6 border-t border-[var(--line)] pt-12 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <p className="mono mb-3 inline-flex items-center gap-2 rounded-sm border border-signal/30 bg-signal/10 px-2.5 py-1 text-[10px] tracking-[0.16em] text-signal">
            <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" /> SYSTEM STATUS: ACTIVE
          </p>
          <h2 className="headline text-4xl text-ink md:text-5xl">Market Intelligence Dashboard</h2>
          <p className="mt-3 max-w-xl text-muted">Real-time leading &amp; trailing economic indicators for multifamily real estate.</p>
        </div>
        <div className="card w-full p-6 md:w-72">
          <p className="kicker mb-3">Composite Signal</p>
          <div className="flex items-end justify-between">
            <span className="headline text-4xl" style={{ color: compColor }}>{COMPOSITE.label}</span>
            <span className="text-right"><span className="headline text-2xl text-ink">{COMPOSITE.confidence}%</span><br /><span className="mono text-[10px] text-muted">confidence</span></span>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full" style={{ background: "linear-gradient(to right,#E5634D,#E8B04B,#5FB97C)" }} />
          <div className="mono mt-2 flex justify-between text-[10px] text-muted"><span>BEAR</span><span>NEUTRAL</span><span>BULL</span></div>
        </div>
      </section>

      {/* STAT CARDS */}
      <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {DASH_STATS.map((s) => (
          <div key={s.label} className="bg-bg2 p-6">
            <p className="kicker mb-4">{s.label}</p>
            <p className="headline text-4xl" style={{ color: toneColor(s.tone) }}>
              {s.value}<span className="mono ml-1 text-sm text-muted">{s.unit}</span>
            </p>
          </div>
        ))}
      </section>

      {/* LEADING / TRAILING */}
      <section className="mt-10">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="inline-flex rounded-md border border-[var(--line)] p-1">
            {["leading", "trailing"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`mono rounded px-4 py-2 text-[12px] tracking-[0.06em] capitalize transition-colors ${
                  tab === t ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"
                }`}
              >
                {t} Indicators
              </button>
            ))}
          </div>
          <span className="mono text-[12px] text-muted">
            {tab === "leading" ? "Forward-looking signals predicting future conditions" : "Confirming signals reflecting realized conditions"}
          </span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.name} className="bg-bg2"><IndicatorCard c={c} /></div>
          ))}
        </div>
      </section>

      {/* LATEST SIGNALS (rotates daily) */}
      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="kicker mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" /> Today&apos;s featured signals
            </p>
            <h2 className="headline text-3xl text-ink md:text-4xl">Latest Signals</h2>
          </div>
          <Link href="/signals" className="hover-line mono text-[12px] tracking-[0.08em] text-muted hover:text-ink">VIEW ALL →</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {featured.map((s) => <SignalCard key={s.title} s={s} />)}
        </div>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--line-strong)] p-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-muted">
            These rotate daily. <span className="text-ink">Sign up to unlock the full signal feed</span> and set custom alerts.
          </p>
          <Link href="/dashboard" className="mono shrink-0 rounded-sm bg-signal px-5 py-2.5 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">UNLOCK ALL SIGNALS →</Link>
        </div>
      </section>

      {/* TOP MARKETS */}
      <section className="mt-14">
        <h2 className="headline mb-6 text-3xl text-ink md:text-4xl">Top Markets</h2>
        <div className="overflow-hidden rounded-lg border border-[var(--line)]">
          {TOP_MARKETS.map((m, i) => (
            <div key={m.city} className={`flex items-center justify-between px-6 py-4 ${i ? "border-t border-[var(--line)]" : ""} bg-bg2`}>
              <div>
                <p className="font-semibold text-ink">{m.city}</p>
                <p className="mono mt-0.5 text-[11px] text-muted">Rent: {m.rent} &nbsp; Vac: {m.vac}</p>
              </div>
              <div className="flex items-center gap-5">
                <span className="headline text-2xl" style={{ color: toneColor(m.tone) }}>{m.score}</span>
                <StatusPill tone={m.tone} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRO CTA */}
      <section className="mt-14">
        <div className="card flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="kicker mb-3 flex items-center gap-2"><Lock size={12} className="text-signal" /> Pro Intelligence</p>
            <h3 className="headline text-3xl text-ink">Go deeper with Cignal Pro</h3>
            <p className="mt-3 text-muted">Access submarket-level indicators, custom alert thresholds, portfolio stress testing, and quarterly forecast models across 200+ MSAs.</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link href="/signals" className="mono flex items-center gap-2 rounded-sm bg-signal px-5 py-3 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">View Live Signals <ArrowRight size={14} /></Link>
            <Link href="/forecasts" className="mono rounded-sm border border-[var(--line-strong)] px-5 py-3 text-[12px] tracking-[0.08em] text-ink hover:bg-white/[0.04]">See Forecasts</Link>
          </div>
        </div>
      </section>

      {/* FEATURED INDUSTRY NEWS */}
      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="kicker mb-3 flex items-center gap-2"><Newspaper size={12} className="text-signal" /> Industry News</p>
            <h2 className="headline text-3xl text-ink md:text-4xl">Latest Headlines</h2>
          </div>
          <Link href="/news" className="hover-line mono text-[12px] tracking-[0.08em] text-muted hover:text-ink">VIEW ALL NEWS →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {latestNews.map((a) => (
            <Link key={a.id} href="/news" className="card group flex flex-col p-6 transition-colors hover:border-[var(--line-strong)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="mono rounded bg-white/[0.04] px-2 py-1 text-[10px] tracking-wide text-muted">{a.cat}</span>
                <span className="mono text-[11px] tracking-wide text-muted">{a.date}</span>
              </div>
              <h3 className="text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-signal">{a.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{a.excerpt}</p>
              <span className="mono mt-4 inline-flex items-center gap-1 text-[11px] tracking-[0.06em] text-signal">READ <ArrowUpRight size={12} /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
