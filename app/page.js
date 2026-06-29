"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Newspaper, ArrowUpRight, Building2, SlidersHorizontal, TrendingUp, Users } from "lucide-react";
import { toneColor, Sparkline, StatusPill } from "@/components/ui";
import SignalCard from "@/components/SignalCard";
import CycleWheel from "@/components/CycleWheel";
import { useContent } from "@/components/VerticalProvider";
import { fetchTeaserSignals } from "@/lib/signals";

const AUD_ICONS = { Building2, SlidersHorizontal, TrendingUp, Users };

const fmtK = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}MM` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;

// Map a teaser card to its live indicator (by the name getLiveIndicators uses).
function mergeLiveCard(card, live) {
  const map = {
    "Multifamily Permit Activity": "Multifamily Building Permits",
    "Lease-Up Absorption Rate": "Net Absorption Rate",
    "Net Renter Migration Index": "Net Renter Migration Index",
    "National Vacancy Rate": "National Vacancy Rate",
    "Market Rent Growth": "Market Rent Growth (All Rentals)",
    "Cap Rate (National Avg)": "Cap Rate (National Avg)",
    "Debt Service Coverage": "Debt Service Coverage",
  };
  const key = map[card.name];
  const L = key && live[key];
  if (!L) return card;
  const delta = (L.change || "").replace(/\s*(MoM|QoQ|WoW|YoY|vs prior).*$/, "").trim() || card.delta;
  const dir = (L.change || "").trim().startsWith("-") ? "down" : "up";
  return {
    ...card,
    value: L.value ?? card.value,
    delta,
    dir,
    tone: L.tone ?? card.tone,
    series: L.trend && L.trend.length ? L.trend : card.series,
  };
}

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
  const {
    COMPOSITE = {}, DASH_STATS = [], LEADING_CARDS = [], TRAILING_CARDS = [],
    TOP_MARKETS = [], SIGNALS = [], NEWS = [], COPY = {},
  } = useContent();
  const [tab, setTab] = useState("leading");
  const [liveInd, setLiveInd] = useState({});
  const [composite, setComposite] = useState(COMPOSITE);
  const [stats, setStats] = useState(DASH_STATS);
  const cards = (tab === "leading" ? LEADING_CARDS : TRAILING_CARDS).map((c) => mergeLiveCard(c, liveInd));
  const compColor = toneColor(composite.tone);

  // Public teaser signals (live from the DB) to entice sign-ups.
  const [featured, setFeatured] = useState([]);
  useEffect(() => {
    fetchTeaserSignals(4).then(setFeatured);
  }, []);

  // Live indicator values for the teaser tiles.
  useEffect(() => {
    fetch("/api/indicators")
      .then((r) => r.json())
      .then((d) => { if (d?.items) setLiveInd(d.items); })
      .catch(() => {});
  }, []);

  // Live composite signal (weighted from the signal feed).
  useEffect(() => {
    fetch("/api/composite")
      .then((r) => r.json())
      .then((d) => { if (d?.composite) setComposite({ label: d.composite.label, confidence: d.composite.confidence, tone: d.composite.tone }); })
      .catch(() => {});
  }, []);

  // Live platform stats strip.
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        const s = d?.stats;
        if (!s) return;
        const total = (s.bull_count || 0) + (s.bear_count || 0) + (s.neutral_count || 0);
        setStats([
          { label: "BULLISH SIGNALS", value: String(s.bull_count ?? 0), unit: total ? `/${total}` : "", tone: "bull" },
          { label: "BEARISH SIGNALS", value: String(s.bear_count ?? 0), unit: total ? `/${total}` : "", tone: "bear" },
          { label: "MARKETS TRACKED", value: String(s.msa_count ?? 0), unit: "MSAs", tone: "ink" },
          { label: "DATA POINTS", value: fmtK(s.obs_count ?? 0), unit: "live", tone: "signal" },
        ]);
      })
      .catch(() => {});
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
          {COPY.heroKicker}
        </p>
        <h1 className="headline max-w-4xl text-5xl text-ink md:text-7xl">
          Better Signals. Better Decisions.<br />Better <span className="text-signal">Returns.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
          {COPY.heroLead}
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
            {COPY.whoHeadline}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            {COPY.whoLead}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(COPY.audiences || []).map(({ icon, name, desc }) => {
              const Icon = AUD_ICONS[icon] || Building2;
              return (
                <div key={name} className="card p-5">
                  <Icon size={20} className="text-signal" strokeWidth={1.8} />
                  <h3 className="mt-3 font-semibold text-ink">{name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              );
            })}
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
          <p className="mt-3 max-w-xl text-muted">{COPY.dashLead}</p>
        </div>
        <div className="card w-full p-6 md:w-72">
          <p className="kicker mb-3">Composite Signal</p>
          <div className="flex items-end justify-between">
            <span className="headline text-4xl" style={{ color: compColor }}>{composite.label}</span>
            <span className="text-right"><span className="headline text-2xl text-ink">{composite.confidence}%</span><br /><span className="mono text-[10px] text-muted">confidence</span></span>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full" style={{ background: "linear-gradient(to right,#E5634D,#E8B04B,#5FB97C)" }} />
          <div className="mono mt-2 flex justify-between text-[10px] text-muted"><span>BEAR</span><span>NEUTRAL</span><span>BULL</span></div>
        </div>
      </section>

      {/* STAT CARDS */}
      <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
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
              These are public highlights. <span className="text-ink">Sign up to unlock the full signal feed</span> and set custom alerts.
            </p>
            <Link href="/register" className="mono shrink-0 rounded-sm bg-signal px-5 py-2.5 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">UNLOCK ALL SIGNALS →</Link>
          </div>
        </div>
      </section>

      {/* VALUE PROP + MARKET CYCLE */}
      <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.5fr] lg:items-stretch">
        <section>
          <div className="card flex h-full flex-col p-8 md:p-10">
            <p className="kicker mb-7 flex items-center gap-2">
              <TrendingUp size={13} className="text-signal" /> Market Intelligence
            </p>

            <div className="space-y-6">
              <div>
                <p className="headline text-6xl leading-none text-ink md:text-7xl">Monitor.</p>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
                  Every indicator that drives the multifamily cycle &mdash; leading to lagging,
                  national to metro &mdash; updated the moment each new print lands.
                </p>
              </div>
              <div>
                <p className="headline text-6xl leading-none text-ink md:text-7xl">Compare.</p>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
                  Watch the leading signals pull ahead of the lagging ones, and measure the
                  hard data against what the consensus is calling.
                </p>
              </div>
              <div>
                <p className="headline text-6xl leading-none text-signal md:text-7xl">Confirm.</p>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
                  Pin down where the market truly sits in the cycle, so you can time capital
                  and adjust strategy with conviction &mdash; not guesswork.
                </p>
              </div>
            </div>

            <div className="mt-auto border-t border-[var(--line)] pt-6">
              <p className="mono text-[10.5px] tracking-[0.08em] text-muted">
                70 INDICATORS &middot; LEADING TO LAGGING &middot; UPDATED ON RELEASE
              </p>
              <Link
                href="/indicators"
                className="group mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[0.01em] text-signal transition-colors hover:text-ink"
              >
                See the live signals
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
        <CycleWheel />
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
            <p className="mt-3 text-muted">Access submarket-level indicators, custom alert thresholds, portfolio stress testing, and quarterly forecast models across 390+ MSAs.</p>
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
