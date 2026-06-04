import Link from "next/link";
import { Activity, Radio, LineChart, BarChart3, BookOpen, Briefcase, ArrowRight } from "lucide-react";
import CommunityCTA from "@/components/CommunityCTA";

const SUITE = [
  { icon: Activity, name: "Indicators", desc: "Leading vs. trailing, scored and classified." },
  { icon: Radio, name: "Signals", desc: "Bull, bear, and watch calls as they fire." },
  { icon: LineChart, name: "Forecasts", desc: "Base, bull, and bear scenarios by market." },
  { icon: BarChart3, name: "Market Maps", desc: "Where the cycle is turning, geographically." },
  { icon: BookOpen, name: "Research", desc: "Ask the desk — synthesized analyst reads." },
  { icon: Briefcase, name: "Portfolio", desc: "Your assets, scored against the cycle." },
];

export default function AboutPage() {
  return (
    <div className="pt-12 pb-12">
      {/* Intro */}
      <p className="kicker mb-3">About Cignal System</p>
      <h1 className="headline max-w-3xl text-4xl leading-tight text-ink md:text-5xl">
        The signals the market sends <span className="text-signal">before</span> it moves.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
        Cignal System is market-cycle intelligence built for multifamily real estate — the instrument
        that tells operators and investors not just <span className="text-ink">how</span> to act, but
        <span className="text-ink"> when</span>.
      </p>

      {/* The gap */}
      <section className="mt-14 max-w-3xl">
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

      {/* 30x stat */}
      <section className="card mt-10 flex flex-col gap-6 p-8 md:flex-row md:items-center">
        <div className="shrink-0">
          <div className="headline text-6xl text-signal">30×</div>
          <p className="mono mt-1 text-[10px] tracking-[0.14em] text-muted">THE INSIGHT</p>
        </div>
        <p className="leading-relaxed text-muted">
          Operators spend roughly two months acquiring an asset and sixty months operating it — yet
          close to ninety percent of real estate education focuses on the purchase. Cignal focuses on
          the other <span className="text-ink">30×</span>: operating in rhythm with the cycle across
          the whole hold, not just the day you buy.
        </p>
      </section>

      {/* The four phases */}
      <section className="mt-14 max-w-3xl">
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

      {/* The suite */}
      <section className="mt-14">
        <p className="kicker mb-5">Inside the system</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUITE.map(({ icon: Icon, name, desc }) => (
            <div key={name} className="card p-5">
              <Icon size={18} className="text-signal" strokeWidth={1.8} />
              <h3 className="mt-3 font-semibold text-ink">{name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section className="mt-14 max-w-3xl">
        <p className="kicker mb-4">The founder</p>
        <h2 className="headline text-2xl text-ink">Benjamin Inman</h2>
        <p className="mt-4 leading-relaxed text-muted">
          Cignal System was created by Benjamin Inman, a multifamily operator and market-cycle
          researcher. Across fifteen years acquiring, operating, and disposing of assets — through the
          post-GFC recovery, the pandemic boom, and the 2022–2024 correction — he watched the same
          pattern repeat: capable operators caught on the wrong side of timing. Cignal is the system he
          built to read the cycle before it turns, and the frameworks behind it grew out of that work.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          His thesis fits on one line: <span className="text-signal">When &gt; How.</span>
        </p>
      </section>

      <CommunityCTA />

      {/* CTA */}
      <section className="card mt-14 flex flex-col items-start justify-between gap-5 p-8 md:flex-row md:items-center">
        <div>
          <h2 className="headline text-2xl text-ink">Read the signals the market doesn&apos;t broadcast.</h2>
          <p className="mt-2 text-muted">Create an account to access the full intelligence suite.</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Link href="/dashboard" className="mono flex items-center gap-2 rounded-sm bg-signal px-5 py-3 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">Get Access <ArrowRight size={14} /></Link>
          <Link href="/signals" className="mono rounded-sm border border-[var(--line-strong)] px-5 py-3 text-[12px] tracking-[0.08em] text-ink hover:bg-white/[0.04]">View Signals</Link>
        </div>
      </section>
    </div>
  );
}
