import Link from "next/link";
import { Activity, Radio, LineChart, BarChart3, BookOpen, Briefcase, ArrowRight } from "lucide-react";
import CommunityCTA from "@/components/CommunityCTA";
import CignalScoreCTA from "@/components/CignalScoreCTA";
import CanaryMark from "@/components/CanaryMark";
import AskCanary from "@/components/AskCanary";
import { getActiveContent } from "@/lib/active-vertical";

const SUITE = [
  {
    icon: Activity,
    name: "Indicators",
    desc: "Dozens of leading and lagging indicators that drive multifamily, each classified by whether it turns before or after the cycle and grouped by supply, demand, capital, and macro. Live values, full history, and submarket lookup down to your ZIP — so you track the signals that move first, not the ones that only confirm the move.",
  },
  {
    icon: Radio,
    name: "Signals",
    desc: "Plain-language bull, bear, and watch calls the moment the underlying data flips, so you know what a shift actually means without digging through charts. Includes the yield-curve read for the capital-market backdrop sitting behind every call.",
  },
  {
    icon: LineChart,
    name: "Forecasts",
    desc: "Where the cycle sits today and where it projects next — base, bull, and bear scenarios across the leading indicators. The Brief sets the expert consensus against the live signal, showing exactly where the crowd and the data disagree.",
  },
  {
    icon: BarChart3,
    name: "Market Maps",
    desc: "Hundreds of U.S. metros scored and ranked on the fundamentals that matter — rent momentum, supply, jobs, and migration — with emerging markets and consensus picks surfaced for you. Drill into any market to see where it sits in the cycle and how the sources agree or diverge.",
  },
  {
    icon: BookOpen,
    name: "Canary",
    desc: "An intelligence desk you can just ask. Pose any question about the cycle, a signal, or a specific market and get a synthesized, source-grounded answer in seconds — analyst-grade work without the wait.",
  },
  {
    icon: Briefcase,
    name: "Portfolio",
    desc: "Track your properties against the live market read to see which holdings ride a tailwind and which are exposed to a turn. Auto-fill the numbers straight from a rent roll or income statement, with NOI, expenses, and cycle position in one place.",
  },
];

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function MarketCycle({ axisLabel = "OCCUPANCY", phaseDescs }) {
  const descs = phaseDescs || ["Occupancy rising", "Demand > supply", "Supply > demand", "Occupancy falling"];
  const W = 820, H = 380, padL = 24, padR = 24, padT = 48, padB = 70;
  const innerW = W - padL - padR;
  const plotTop = padT, plotBottom = H - padB;
  const innerH = plotBottom - plotTop;
  const fx = (f) => padL + f * innerW;
  const fy = (occ) => plotBottom - occ * innerH;

  const pts = [
    { x: fx(0), y: fy(0.14) },
    { x: fx(0.25), y: fy(0.5) },
    { x: fx(0.5), y: fy(0.9) },
    { x: fx(0.75), y: fy(0.5) },
    { x: fx(1), y: fy(0.14) },
  ];
  const line = smoothPath(pts);
  const area = `${line} L ${fx(1)} ${plotBottom} L ${fx(0)} ${plotBottom} Z`;
  const ltY = fy(0.5);
  const dividers = [0.25, 0.5, 0.75].map(fx);
  const phases = [
    { name: "Recovery", desc: descs[0], color: "#4FA8C7", c: 0.125 },
    { name: "Expansion", desc: descs[1], color: "#5FB97C", c: 0.375 },
    { name: "Hypersupply", desc: descs[2], color: "#E8B04B", c: 0.625 },
    { name: "Contraction", desc: descs[3], color: "#E5634D", c: 0.875 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      <defs>
        <linearGradient id="cycleStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4FA8C7" />
          <stop offset="33%" stopColor="#5FB97C" />
          <stop offset="66%" stopColor="#E8B04B" />
          <stop offset="100%" stopColor="#E5634D" />
        </linearGradient>
        <linearGradient id="cycleFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
        </linearGradient>
      </defs>

      {dividers.map((x, i) => (
        <line key={i} x1={x} y1={plotTop} x2={x} y2={plotBottom} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 5" />
      ))}

      <line x1={padL} y1={plotBottom} x2={W - padR} y2={plotBottom} stroke="var(--line)" strokeWidth="1" />
      <line x1={padL} y1={ltY} x2={W - padR} y2={ltY} stroke="var(--muted)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="5 5" />
      <text x={padL + 4} y={ltY - 8} fontSize="10" fill="var(--muted)" fontFamily="monospace" letterSpacing="1">LONG-TERM {axisLabel} AVERAGE</text>

      <path d={area} fill="url(#cycleFill)" />
      <path d={line} fill="none" stroke="url(#cycleStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx={fx(0.5)} cy={fy(0.9)} r="4" fill="#5FB97C" />
      <text x={fx(0.5)} y={fy(0.9) - 12} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="monospace" letterSpacing="1">PEAK · EQUILIBRIUM</text>

      {phases.map((p) => (
        <g key={p.name}>
          <text x={fx(p.c)} y={plotBottom + 26} textAnchor="middle" fontSize="14" fill={p.color} fontWeight="600">{p.name}</text>
          <text x={fx(p.c)} y={plotBottom + 44} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="monospace">{p.desc}</text>
        </g>
      ))}
    </svg>
  );
}

export default function AboutPage() {
  const { COPY = {} } = getActiveContent();
  return (
    <div className="pt-12 pb-12">
      {/* Intro — full width */}
      <p className="kicker mb-3">About Cignal System</p>
      <h1 className="headline max-w-3xl text-4xl leading-tight text-ink md:text-5xl">
        The signals the market sends <span className="text-signal">before</span> it moves.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
        Cignal System is market-cycle intelligence built for {COPY.aboutAsset} — the instrument
        that tells operators and investors not just <span className="text-ink">how</span> to act, but
        <span className="text-ink"> when</span>.
      </p>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        Most market data tells you what already happened. Cignal reads the market the way a cycle actually
        turns — separating the <span className="text-ink">leading</span> indicators that move first from the
        <span className="text-ink"> lagging</span> ones that only confirm what&apos;s already priced in, and
        placing where you stand inside the four phases of the cycle: recovery, expansion, hyper-supply, and
        recession. The whole system is built on one idea — <span className="text-signal">timing beats
        tactics</span>. Knowing <span className="text-ink">when</span> you are in the cycle changes every
        decision that follows: when to buy, when to hold, when to reposition, and when to sit out.
      </p>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        The platform hands you the read. If you want to learn to apply it yourself — to your investment,
        operations, or management business — we offer a coaching and certification track that teaches the
        method behind the signals. It&apos;s selective, and you can <span className="text-ink">apply
        below</span>.
      </p>

      {/* Body + sidebar */}
      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="space-y-14">
          {/* The gap */}
          <section className="max-w-3xl">
            <p className="kicker mb-4">The gap we close</p>
            <p className="leading-relaxed text-muted">
              Every course teaches you how to invest. Almost none teach you when. That omission is
              expensive: the right strategy at the wrong point in the cycle loses, while an average
              strategy at the right point wins. Timing is the highest-leverage variable in real estate —
              and it&apos;s the one the industry consistently ignores.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Cignal exists to make timing legible. It reads the market the way an intelligence desk reads
              a theater of operations: separating signal from noise, leading indicators from trailing ones,
              and correlation from causation — so a decision rests on where the cycle is actually headed,
              not on where it&apos;s already been.
            </p>
          </section>

          {/* Four phases of the market cycle */}
          <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-bg2/70 via-bg2/30 to-bg/10 p-6 md:p-8">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 360" aria-hidden="true">
              <defs>
                <radialGradient id="phasesGlow" cx="85%" cy="6%" r="80%">
                  <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="1200" height="360" fill="url(#phasesGlow)" />
              <path d="M0,250 C150,200 250,300 400,250 C550,200 650,300 800,250 C950,200 1050,300 1200,250" fill="none" stroke="#F5B544" strokeOpacity="0.08" strokeWidth="2" />
            </svg>
            <div className="relative">
              <p className="kicker mb-1">The market cycle</p>
              <h2 className="headline text-2xl text-ink">The four phases</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Acquisition, Operations, and Disposition all play out across four repeating phases —
                <span className="text-ink"> Recovery</span>,
                <span className="text-ink"> Expansion</span>,
                <span className="text-ink"> Hypersupply</span>, and
                <span className="text-ink"> Contraction</span>. Knowing which one you&apos;re in — and which way it&apos;s
                turning — drives every sound investment and operating decision.
              </p>
              <div className="mt-6">
                <MarketCycle axisLabel={COPY.cycleMetric} phaseDescs={COPY.cyclePhases} />
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
                Cignal System was built as the instrument for the <span className="text-signal">Onion Framework</span> —
                a layered method for navigating these four phases. It peels the market back one layer at a time: from the
                outer macro signals, through leading and trailing indicators, down to the core decision for the phase
                you&apos;re actually in — so your strategy is matched to the moment instead of fighting against it.
              </p>
            </div>
          </section>

          {/* Phases */}
          <section className="max-w-3xl">
            <p className="kicker mb-4">How it reads the market</p>
            <p className="leading-relaxed text-muted">
              Every read maps to one of the four phases of the market cycle —
              <span className="text-ink"> Recovery</span>,
              <span className="text-ink"> Expansion</span>,
              <span className="text-ink"> Hypersupply</span>, and
              <span className="text-ink"> Contraction</span> — and is weighed against more than forty years
              of charted history. Today&apos;s data is never seen in isolation; it&apos;s placed against every
              comparable cycle that came before it.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Generic market dashboards track data. Cignal tracks <span className="text-ink">signals</span> —
              classified, triangulated, and tuned to where you operate. The difference is the difference
              between watching the weather and reading the radar.
            </p>
          </section>

          {/* Suite */}
          <section>
            <p className="kicker mb-5">Inside the system</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {SUITE.map(({ icon: Icon, name, desc }) => (
                <div key={name} className="card p-5">
                  <Icon size={18} className="text-signal" strokeWidth={1.8} />
                  <h3 className="mt-3 font-semibold text-ink">{name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Canary */}
          <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-bg2/70 via-bg2/30 to-bg/10 p-6 md:p-8">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 360" aria-hidden="true">
              <defs>
                <radialGradient id="canaryGlow" cx="85%" cy="6%" r="80%">
                  <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="1200" height="360" fill="url(#canaryGlow)" />
              <path d="M0,250 C150,200 250,300 400,250 C550,200 650,300 800,250 C950,200 1050,300 1200,250" fill="none" stroke="#F5B544" strokeOpacity="0.08" strokeWidth="2" />
            </svg>
            <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-signal">
                <CanaryMark size={42} className="text-bg" title="Canary" />
              </span>
              <div>
                <p className="kicker mb-1">Meet Canary</p>
                <h2 className="headline text-2xl text-ink">The original leading indicator</h2>
                <p className="mt-4 leading-relaxed text-muted">
                  Miners carried a canary underground because the bird registered danger long before any person
                  could. It was the signal that arrived before the evidence &mdash; which is exactly what a leading
                  indicator is, and exactly how Cignal reads a market.
                </p>
                <p className="mt-4 leading-relaxed text-muted">
                  Canary is the intelligence desk at the center of the system. Ask it where the cycle is turning,
                  whether the leading data agrees with the lagging, or how a specific market is moving, and it
                  answers from Cignal&apos;s live market intelligence &mdash; in seconds, grounded in the data, and
                  candid when a question falls outside what it can see.
                </p>

                <div className="mt-6 rounded-xl border border-[var(--line)] bg-bg/40 p-5">
                  <p className="mono text-[11px] tracking-[0.16em] text-signal">WHEN YOU SEE THE BIRD</p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm leading-relaxed text-muted">
                    <span>Wherever this mark appears</span>
                    <AskCanary variant="pill" question="Where are we in the market cycle right now?" />
                    <span>
                      &mdash; on an indicator, a market, or the cycle wheel &mdash; you can ask about that exact thing
                      in one click. Canary opens with the question already posed and the live read in hand.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Training / Apply */}
          <section className="relative overflow-hidden rounded-2xl border border-signal/25 bg-gradient-to-b from-signal/[0.06] via-bg2/30 to-bg/10 p-6 md:p-8">
            <div className="relative max-w-2xl">
              <p className="kicker mb-4">Learn to apply the signals</p>
              <h2 className="headline text-2xl text-ink">Training &amp; certification</h2>
              <p className="mt-4 leading-relaxed text-muted">
                The platform gives you the read. The training teaches you to <span className="text-ink">act
                on it</span> — how to navigate the four phases of the cycle, tell a leading signal from a
                lagging one, and translate the divergence into decisions for your investment, operations, or
                management business. It&apos;s the difference between seeing the cycle and knowing what to do
                about it.
              </p>
              <p className="mt-4 leading-relaxed text-muted">
                The track is built for serious owners, operators, investors, and management firms, and moves
                from foundations to advanced certification. Enrollment is selective — tell us about your
                business and what you want to get out of it, and we&apos;ll follow up about fit.
              </p>
              <a
                href="mailto:info@cignalsystem.com?subject=Training%20application%20%E2%80%94%20Cignal%20System&body=Tell%20us%20a%20bit%20about%20you%3A%0A%0A-%20Name%3A%0A-%20Company%3A%0A-%20Your%20role%20(owner%20%2F%20operator%20%2F%20investor%20%2F%20management%20firm)%3A%0A-%20Portfolio%20size%20or%20markets%3A%0A-%20What%20you%20want%20to%20get%20out%20of%20the%20training%3A%0A"
                className="mono group mt-6 inline-flex items-center gap-2 rounded-sm bg-signal px-5 py-3 text-[12px] tracking-[0.08em] text-bg hover:opacity-90"
              >
                Apply for training
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          <div className="lg:sticky lg:top-24">
            <CommunityCTA variant="sidebar" />
            <div className="mt-4">
              <CignalScoreCTA />
            </div>
          </div>
        </aside>
      </div>

      {/* CTA — full width */}
      <section className="card mt-14 flex flex-col items-start justify-between gap-5 p-8 md:flex-row md:items-center">
        <div>
          <h2 className="headline text-2xl text-ink">Read the signals the market doesn&apos;t broadcast.</h2>
          <p className="mt-2 text-muted">Create an account for the full intelligence suite — or <a href="mailto:info@cignalsystem.com?subject=Training%20application%20%E2%80%94%20Cignal%20System" className="text-signal underline-offset-2 hover:underline">apply for training</a> to learn the method behind it.</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Link href="/dashboard" className="mono flex items-center gap-2 rounded-sm bg-signal px-5 py-3 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">Get Access <ArrowRight size={14} /></Link>
          <Link href="/signals" className="mono rounded-sm border border-[var(--line-strong)] px-5 py-3 text-[12px] tracking-[0.08em] text-ink hover:bg-white/[0.04]">View Signals</Link>
        </div>
      </section>
    </div>
  );
}
