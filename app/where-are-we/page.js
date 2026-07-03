"use client";

import MarketReadWheel from "@/components/MarketReadWheel";

export default function WhereAreWePage() {
  return (
    <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-10">
      <div className="mb-8">
        <p className="kicker mb-2">Cignal+ · Market Read</p>
        <h1 className="headline text-4xl text-ink sm:text-5xl">Where Are We</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          The national cycle sets the clock; your market confirms or diverges from it.
          Enter a ZIP to blend the macro read with local fundamentals into a single
          four-phase cycle position — and see how each signal has been trending.
        </p>
      </div>

      <div className="card p-6 sm:p-8">
        <MarketReadWheel />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--line)] bg-bg2/40 p-5">
          <p className="kicker mb-2">How to read the wheel</p>
          <p className="text-[13px] leading-relaxed text-muted">
            The <span className="text-ink">outer ring</span> holds national signals — inflation,
            interest rates, consumer spending. The <span className="text-ink">inner ring</span> holds
            your local market — rent growth, vacancy, jobs, wages, unemployment, and county GDP. Each
            signal lights in the quadrant it is voting for. The center tallies green, neutral, and red
            across every live signal, and reports which phase the weight of signals is leaning toward.
            This is a balance of evidence, not a hard call.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-bg2/40 p-5">
          <p className="kicker mb-2">On grain &amp; honesty</p>
          <p className="text-[13px] leading-relaxed text-muted">
            Signals resolve at the finest grain the data honestly reaches: rent at the
            <span className="text-ink"> ZIP</span>, jobs, vacancy and unemployment at the
            <span className="text-ink"> metro</span>, GDP at the <span className="text-ink">county</span>.
            County GDP is annual and lagged — it reads as structural backdrop, not a live signal. Each
            row shows its own grain so you always know what you are looking at.
          </p>
        </div>
      </div>
    </main>
  );
}
