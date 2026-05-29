import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";

const SUITE = [
  { name: "Indicators", desc: "Leading and trailing metrics tracked across every major metro.", code: "01" },
  { name: "Market Maps", desc: "Geospatial heat layers for rent, supply, and absorption.", code: "02" },
  { name: "Forecasts", desc: "Forward curves on rents, cap rates, and deliveries.", code: "03" },
  { name: "Signals", desc: "Threshold alerts when a market shifts cycle phase.", code: "04" },
  { name: "Research", desc: "Briefings translating raw data into a thesis.", code: "05" },
  { name: "Portfolio", desc: "Your assets, scored against live market position.", code: "06" },
];

const PHASES = [
  { n: "I", name: "Recovery", note: "Occupancy tightening, concessions burning off." },
  { n: "II", name: "Expansion", note: "Rent growth accelerates, new supply chases demand." },
  { n: "III", name: "Hyper-Supply", note: "Deliveries overshoot, absorption softens." },
  { n: "IV", name: "Recession", note: "Rents compress, distress surfaces, value re-rates." },
];

export default function Page() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Ticker />

      {/* HERO */}
      <section id="intelligence" className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
        <div className="fade-up max-w-4xl">
          <p className="kicker mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-signal/60" />
            Market Intelligence · Multifamily Real Estate
          </p>
          <h1 className="headline text-5xl text-ink md:text-7xl">
            The signals the market
            <br />
            doesn&apos;t <span className="text-signal">broadcast.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
            Cignal System decodes the economic data moving multifamily real estate —
            separating the <span className="text-ink">leading indicators</span> that
            predict the next phase from the <span className="text-ink">trailing noise</span>{" "}
            everyone else reacts to. The edge isn&apos;t more data. It&apos;s knowing which data
            matters, and when.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#"
              className="mono rounded-sm bg-signal px-6 py-3 text-[13px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90"
            >
              REQUEST ACCESS →
            </a>
            <a
              href="#method"
              className="hover-line mono text-[13px] tracking-[0.08em] text-muted hover:text-ink"
            >
              SEE THE METHOD
            </a>
          </div>
        </div>

        {/* decorative dossier stamp */}
        <div className="mono pointer-events-none absolute right-6 top-28 hidden text-right text-[10px] leading-relaxed tracking-[0.2em] text-muted/50 lg:block">
          CLASSIFICATION: <span className="text-signal/70">SIGNAL</span>
          <br />
          DATASET: <span className="redact">XXXXXXXX</span>
          <br />
          UPDATED: DAILY
        </div>
      </section>

      {/* WHAT CIGNAL DOES */}
      <section className="border-t border-[var(--line)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="kicker mb-4">What we do</p>
            <h2 className="headline text-3xl text-ink md:text-4xl">
              Intelligence,
              <br />
              not dashboards.
            </h2>
          </div>
          <div className="space-y-6 text-muted">
            <p className="text-lg leading-relaxed">
              Most platforms hand you charts and walk away. Cignal System reads the
              market the way an analyst would — connecting rent growth, supply,
              absorption, capital costs, and distress into a single coherent picture of
              where a market sits in its cycle.
            </p>
            <p className="leading-relaxed">
              We surface what experienced operators watch and newer investors miss:
              the difference between <span className="text-ink">correlation</span> and{" "}
              <span className="text-ink">causation</span>, and the lead time between a
              signal firing and a market turning.
            </p>
          </div>
        </div>
      </section>

      {/* GATED SUITE */}
      <section id="indicators" className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="kicker mb-4">Inside the terminal</p>
              <h2 className="headline text-3xl text-ink md:text-4xl">The suite</h2>
            </div>
            <span className="mono hidden text-[11px] tracking-[0.16em] text-muted sm:block">
              ACCESS REQUIRED
            </span>
          </div>

          <div className="grid gap-px overflow-hidden rounded-md border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
            {SUITE.map((s) => (
              <div
                key={s.name}
                className="group relative bg-bg2 p-7 transition-colors hover:bg-bg"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="mono text-[11px] tracking-[0.2em] text-signal/70">
                    {s.code}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 14 14" className="text-muted">
                    <rect x="2.5" y="6" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
                    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1" fill="none" />
                  </svg>
                </div>
                <h3 className="headline text-xl text-ink">{s.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
                <span className="mono absolute bottom-7 right-7 text-[10px] tracking-[0.16em] text-muted/0 transition-colors group-hover:text-muted">
                  LOCKED
                </span>
              </div>
            ))}
          </div>
          <p className="mono mt-6 text-[11px] tracking-[0.1em] text-muted">
            Unlocks after sign-up. Dashboard access is being provisioned.
          </p>
        </div>
      </section>

      {/* MARKET CYCLE METHOD */}
      <section id="method" className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="kicker mb-4">The method · Four phases</p>
          <h2 className="headline mb-12 max-w-2xl text-3xl text-ink md:text-4xl">
            Every market is somewhere in the cycle. We tell you where.
          </h2>
          <div className="grid gap-px overflow-hidden rounded-md border border-[var(--line)] bg-[var(--line)] md:grid-cols-4">
            {PHASES.map((p) => (
              <div key={p.n} className="bg-bg2 p-6">
                <div className="mono mb-4 text-3xl text-signal/80">{p.n}</div>
                <h3 className="headline text-lg text-ink">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 md:flex-row md:items-center">
          <div>
            <span className="mono text-sm tracking-[0.18em] text-ink">
              CIGNAL<span className="text-signal">·</span>SYSTEM
            </span>
            <p className="mono mt-2 text-[11px] tracking-[0.1em] text-muted">
              MARKET INTELLIGENCE · MULTIFAMILY REAL ESTATE
            </p>
          </div>
          <p className="mono max-w-sm text-[11px] leading-relaxed tracking-[0.06em] text-muted/70">
            Figures shown are illustrative pending live data integration. Not investment
            advice. © {new Date().getFullYear()} Cignal System.
          </p>
        </div>
      </footer>
    </main>
  );
}
