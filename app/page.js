"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Newspaper, ArrowUpRight, Building2, SlidersHorizontal, TrendingUp, Users } from "lucide-react";
import { toneColor, Sparkline, StatusPill } from "@/components/ui";
import SignalCard from "@/components/SignalCard";
import PerformanceTrends from "@/components/PerformanceTrends";
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

  const [latestNews, setLatestNews] = useState(NEWS.slice(0, 3));
  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => { if (d.items && d.items.length) setLatestNews(d.items.slice(0, 3)); })
      .catch(() => {});
  }, []);

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

      {/* WHO THIS IS FOR */}
      <section className="relative mt-14 overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-bg2/70 via-bg2/30 to-bg/20 px-6 py-12 md:px-10">
        {/* ambient market-signal backdrop */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 420" aria-hidden="true">
          <defs>
            <radialGradient id="whoGlow" cx="78%" cy="6%" r="75%">
              <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="420" fill="url(#whoGlow)" />
          <path d="M0,250 C120,180 200,300 320,235 C440,175 520,300 640,225 C760,160 840,290 960,215 C1080,150 1150,250 1200,205" fill="none" stroke="#F5B544" strokeOpacity="0.13" strokeWidth="2" />
          <path d="M0,310 C140,265 220,350 360,295 C500,245 580,340 720,285 C860,235 940,330 1080,280 C1140,258 1175,270 1200,262" fill="none" stroke="#F5B544" strokeOpacity="0.06" strokeWidth="1.5" />
          <g fill="#F5B544" fillOpacity="0.35">
            <circle cx="320" cy="235" r="3" />
            <circle cx="640" cy="225" r="3" />
            <circle cx="960" cy="215" r="3" />
          </g>
        </svg>

        <div className="relative">
          <p className="kicker mb-3">Who this is for</p>
          <h2 className="headline max-w-3xl text-3xl text-ink md:text-4xl">
            Built for the people who live inside the multifamily cycle.
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            Cignal System is market intelligence for multifamily real estate — it turns the economic data that
            moves rents, occupancy, and values into a clear read on where the cycle is headed. If you own,
            operate, invest in, or manage apartments, it&apos;s built for you.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Building2, name: "Owners", desc: "Time acquisitions, refinances, and dispositions to the cycle — not the headlines." },
              { icon: SlidersHorizontal, name: "Operators", desc: "See where rents, occupancy, and concessions are heading before they hit your P&L." },
              { icon: TrendingUp, name: "Investors", desc: "Underwrite with leading indicators and spot the markets turning first." },
              { icon: Users, name: "Management Firms", desc: "Give every property a cycle-aware read to guide pricing and strategy." },
            ].map(({ icon: Icon, name, desc }) => (
              <div key={name} className="card p-5">
                <Icon size={20} className="text-signal" strokeWidth={1.8} />
                <h3 className="mt-3 font-semibold text-ink">{name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
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
      <section className="relative mt-14 overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-bg2/70 via-bg2/30 to-bg/10 px-6 py-10 md:px-10">
        {/* ambient signal-pulse backdrop */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 420" aria-hidden="true">
          <defs>
            <radialGradient id="sigGlow" cx="16%" cy="6%" r="75%">
              <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="420" fill="url(#sigGlow)" />
          <g stroke="#F5B544" strokeOpacity="0.05" strokeWidth="1">
            <line x1="300" y1="0" x2="300" y2="420" />
            <line x1="600" y1="0" x2="600" y2="420" />
            <line x1="900" y1="0" x2="900" y2="420" />
          </g>
          <path d="M0,250 L180,250 L210,162 L232,330 L255,250 L520,250 L548,150 L570,340 L595,250 L860,250 L888,172 L910,330 L935,250 L1200,250" fill="none" stroke="#F5B544" strokeOpacity="0.13" strokeWidth="2" strokeLinejoin="round" />
          <g fill="#F5B544" fillOpacity="0.4">
            <circle cx="210" cy="162" r="3" />
            <circle cx="548" cy="150" r="3" />
            <circle cx="888" cy="172" r="3" />
          </g>
        </svg>

        <div className="relative">
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
        </div>
      </section>

      {/* 12-MONTH PERFORMANCE TRENDS + TOP MARKETS */}
      <div className="mt-14 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-stretch">
        <PerformanceTrends />

        {/* TOP MARKETS */}
        <section>
          <div className="card h-full p-6 md:p-8">
            <h2 className="headline mb-5 text-2xl text-ink md:text-3xl">Top Markets</h2>
            <div>
              {TOP_MARKETS.map((m, i) => (
                <div key={m.city} className={`flex items-center justify-between py-3.5 ${i ? "border-t border-[var(--line)]" : ""}`}>
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
          </div>
        </section>
      </div>

      {/* PRO CTA */}
      <section className="relative mt-14 overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-bg2/70 via-bg2/30 to-bg/10 px-6 py-8 md:px-10">
        {/* ambient market-signal backdrop */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 360" aria-hidden="true">
          <defs>
            <radialGradient id="proGlow" cx="82%" cy="6%" r="75%">
              <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="360" fill="url(#proGlow)" />
          <path d="M0,210 C120,150 200,250 320,200 C440,150 520,250 640,195 C760,140 840,240 960,185 C1080,135 1150,210 1200,175" fill="none" stroke="#F5B544" strokeOpacity="0.10" strokeWidth="2" />
          <g fill="#F5B544" fillOpacity="0.3">
            <circle cx="320" cy="200" r="3" />
            <circle cx="640" cy="195" r="3" />
            <circle cx="960" cy="185" r="3" />
          </g>
        </svg>

        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
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
          {latestNews.map((a, i) => {
            const external = a.link && a.link.startsWith("http");
            const Wrap = external ? "a" : Link;
            const wp = external ? { href: a.link, target: "_blank", rel: "noopener noreferrer" } : { href: "/news" };
            return (
              <Wrap key={i} {...wp} className="card group flex flex-col p-6 transition-colors hover:border-[var(--line-strong)]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="mono rounded bg-white/[0.04] px-2 py-1 text-[10px] tracking-wide text-muted">{a.source || a.cat}</span>
                  <span className="mono text-[11px] tracking-wide text-muted">{a.date}</span>
                </div>
                <h3 className="text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-signal">{a.title}</h3>
                {a.excerpt && <p className="mt-2 text-[13px] leading-relaxed text-muted">{a.excerpt}</p>}
                <span className="mono mt-4 inline-flex items-center gap-1 text-[11px] tracking-[0.06em] text-signal">READ <ArrowUpRight size={12} /></span>
              </Wrap>
            );
          })}
        </div>
      </section>
    </div>
  );
}
