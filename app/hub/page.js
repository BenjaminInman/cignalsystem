// cignalsystem.com — the cross-vertical hub. Served at "/" (middleware rewrites
// "/" onto this route; /hub itself redirects to "/"). Sells the shared method,
// shows the macro layer every audience shares, then routes each visitor to
// their market's subdirectory.
import { cookies } from "next/headers";
import { ArrowRight, ArrowUpRight, Building2, Briefcase, Home, LineChart } from "lucide-react";
import MacroRead from "@/components/hub/MacroRead";
import WaitlistForm from "@/components/WaitlistForm";
import { getHubMacro } from "@/lib/hub-macro";
import { getVerticalConfig } from "@/lib/verticals";
import { VERTICAL_COOKIE, VERTICAL_PATH, DEFAULT_VERTICAL } from "@/lib/vertical-slug";
import { createClient } from "@/lib/supabase/server";
import { socialLinks } from "@/lib/brand";
import { ICONS } from "@/components/SocialIcons";

export const dynamic = "force-dynamic";

const LENSES = [
  {
    vertical: "multifamily",
    icon: Building2,
    name: "Multifamily",
    who: "Operators, sponsors, owners, lenders",
    pain: "Know when supply, rents and rates are turning in your submarket before the comps show it.",
    samples: ["Absorption rate", "Multifamily starts", "Effective rent growth"],
    live: true,
  },
  {
    vertical: "investor",
    icon: LineChart,
    name: "Passive Investors",
    who: "LPs in syndications and funds",
    pain: "Judge whether a sponsor is buying at the right point in the cycle before you wire the money.",
    samples: ["Cap rate vs. 10Y spread", "National vacancy", "Debt service coverage"],
    live: true,
  },
  {
    vertical: "general-real-estate",
    icon: Home,
    name: "Real Estate Investors",
    who: "SFR, small multifamily, commercial",
    pain: "Time acquisitions, refinances and exits to the housing cycle rather than the headlines.",
    samples: ["Home sales", "Housing starts", "Rent growth"],
    live: true,
  },
  {
    vertical: "small-business",
    icon: Briefcase,
    name: "Business Owners",
    who: "Small and mid-size businesses",
    pain: "Plan hiring, inventory and expansion around the cycle your customers are actually in.",
    samples: ["Consumer sentiment", "Employment", "Credit spreads"],
    live: false,
  },
];

const PHASES = [
  { n: "01", name: "Recovery", line: "Occupancy bottoms, new construction is scarce. Fundamentals improve before sentiment does." },
  { n: "02", name: "Expansion", line: "Demand outruns supply, rents climb, and capital and construction follow the returns." },
  { n: "03", name: "Hypersupply", line: "Deliveries outrun demand. Concessions creep in while the headlines still read strong." },
  { n: "04", name: "Contraction", line: "Occupancy and rents fall, values reset. Hypersupply can persist well into this phase." },
];

const LAYERS = [
  ["Layer 3", "Macro", "Rates, inflation, jobs, sentiment. The tide every market swims in."],
  ["Layer 2", "Industry", "Starts, absorption, vacancy, credit. How your asset class is responding."],
  ["Layer 1", "Submarket", "Rents, concessions and days on market in your ZIP. Where deals are won."],
];

// Plain anchors on purpose: the hub and the verticals render different root
// layout chrome, and a client-side <Link> transition would keep the hub's
// layout (no market nav) on the vertical page. A full load swaps it cleanly.
const Link = ({ href: to, ...rest }) => <a href={to} {...rest} />;

const href = (vertical, path = "") => `/${VERTICAL_PATH[vertical]}${path}`;

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
      <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

async function signedIn() {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return !!data?.user;
  } catch {
    return false;
  }
}

export default async function Hub() {
  const remembered = cookies().get(VERTICAL_COOKIE)?.value;
  const last = VERTICAL_PATH[remembered] ? remembered : null;
  const home = last || DEFAULT_VERTICAL;
  const [macro, user] = await Promise.all([getHubMacro().catch(() => ({ items: [] })), signedIn()]);
  const lastLabel = last ? LENSES.find((l) => l.vertical === last)?.name || getVerticalConfig(last).label : null;

  return (
    <>
      {/* CONTINUE BAR — returning visitors */}
      {(last || user) && (
        <div className="border-b border-[var(--line)] bg-signal/[0.07]">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-2.5">
            <p className="mono text-[11px] tracking-[0.12em] text-muted">
              {user ? "WELCOME BACK" : "PICK UP WHERE YOU LEFT OFF"}
            </p>
            <Link href={href(home, user ? "/dashboard" : "")} className="mono inline-flex items-center gap-1.5 text-[12px] tracking-[0.08em] text-signal hover:opacity-80">
              {user ? "GO TO YOUR DASHBOARD" : `CONTINUE TO ${(lastLabel || "Multifamily").toUpperCase()}`} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-bg/80 backdrop-blur">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Cignal System home">
            <Mark />
            <span className="mono text-sm tracking-[0.16em] text-ink">CIGNAL<span className="text-signal">·</span>SYSTEM</span>
          </Link>
          <div className="flex items-center gap-5 md:gap-7">
            <a href="#markets" className="hover-line mono text-[12px] tracking-[0.08em] text-muted hover:text-ink">MARKETS</a>
            <a href="#method" className="hover-line mono hidden text-[12px] tracking-[0.08em] text-muted hover:text-ink sm:inline">METHOD</a>
            <Link href={href(home, "/training")} className="hover-line mono hidden text-[12px] tracking-[0.08em] text-muted hover:text-ink md:inline">TRAINING</Link>
            <a href="#pricing" className="hover-line mono hidden text-[12px] tracking-[0.08em] text-muted hover:text-ink md:inline">PRICING</a>
            {user ? (
              <Link href={href(home, "/dashboard")} className="mono rounded-sm bg-signal px-4 py-2 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">DASHBOARD</Link>
            ) : (
              <Link href={href(home, "/login")} className="mono rounded-sm border border-[var(--line-strong)] px-4 py-2 text-[12px] tracking-[0.08em] text-ink hover:border-signal/50">LOG IN</Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-6">
        {/* HERO */}
        <section className="fade-up relative pt-20 pb-14 md:pt-28">
          <p className="kicker mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-signal/60" />
            Market cycle intelligence · When &gt; How
          </p>
          <h1 className="headline max-w-5xl text-[2.6rem] text-ink sm:text-5xl md:text-7xl">
            Every market moves through 4 phases. The people who profit know which phase we&apos;re in{" "}
            <span className="text-signal">before the competition.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted">
            Cignal System separates leading indicators from trailing ones so you can see the turn while it&apos;s still forming,
            not after it shows up in the comps. Pick your market and read the cycle the way professionals do.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="#markets" className="mono inline-flex items-center gap-2 rounded-sm bg-signal px-6 py-3 text-[13px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90">
              FIND YOUR MARKET <ArrowRight size={14} />
            </a>
            <a href="#method" className="hover-line mono text-[13px] tracking-[0.08em] text-muted hover:text-ink">HOW THE METHOD WORKS</a>
          </div>
        </section>

        {/* MACRO STRIP — Layer 3 every audience shares */}
        {macro.items?.length > 0 && (
          <section aria-label="Macro indicators" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-5">
            {macro.items.map((m) => (
              <div key={m.key} className="bg-bg2 px-5 py-4">
                <p className="kicker">{m.label}</p>
                <p className="headline mt-2 text-2xl text-ink sm:text-3xl">{m.value}</p>
                <p className="mono mt-1 text-[11px] text-muted">
                  {[m.change, m.period].filter(Boolean).join(" · ")}
                </p>
              </div>
            ))}
          </section>
        )}
        {macro.attribution && <p className="mono mt-2 text-[10px] leading-relaxed tracking-[0.04em] text-muted">{macro.attribution}</p>}

        {/* MACRO READ */}
        <section className="mt-10">
          <MacroRead />
        </section>

        {/* CHOOSE YOUR LENS */}
        <section id="markets" className="scroll-mt-24 pt-20">
          <p className="kicker mb-3">Choose your lens</p>
          <h2 className="headline max-w-3xl text-4xl text-ink md:text-5xl">One method. Read for what you own.</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Each market gets its own indicators, signals and phase call, built on the same four-phase framework and the same macro layer.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {LENSES.map(({ vertical, icon: Icon, name, who, pain, samples, live }) => (
              <article key={vertical} className="card flex flex-col p-6 md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon size={22} className="text-signal" strokeWidth={1.8} />
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{name}</h3>
                      <p className="text-sm text-muted">{who}</p>
                    </div>
                  </div>
                  <span
                    className={`mono shrink-0 rounded-sm px-2 py-1 text-[10px] tracking-[0.14em] ${
                      live ? "bg-up/10 text-up" : "border border-[var(--line-strong)] text-muted"
                    }`}
                  >
                    {live ? "● LIVE" : "EARLY ACCESS"}
                  </span>
                </div>
                <p className="mt-5 leading-relaxed text-ink/90">{pain}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {samples.map((s) => (
                    <li key={s} className="mono rounded-sm border border-[var(--line)] px-2.5 py-1 text-[11px] text-muted">{s}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  {live ? (
                    <Link
                      href={href(vertical)}
                      className="mono inline-flex items-center gap-2 rounded-sm bg-signal px-5 py-2.5 text-[12px] tracking-[0.08em] text-bg hover:opacity-90"
                    >
                      ENTER {name.toUpperCase()} <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <WaitlistForm vertical={vertical} source="hub" compact />
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* METHOD */}
        <section id="method" className="scroll-mt-24 pt-24">
          <p className="kicker mb-3">The method</p>
          <h2 className="headline max-w-3xl text-4xl text-ink md:text-5xl">Timing beats selection.</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            A good asset bought in the wrong phase loses to an average one bought in the right phase. The framework is the same in every market:
            find the phase, then act on it.
          </p>

          <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] md:grid-cols-4">
            {PHASES.map((p) => (
              <li key={p.name} className="bg-bg2 p-6">
                <p className="mono text-[11px] tracking-[0.2em] text-signal">{p.n}</p>
                <h3 className="headline mt-3 text-2xl text-ink">{p.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.line}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="card p-6">
              <p className="kicker mb-3">Leading vs. trailing</p>
              <p className="leading-relaxed text-ink/90">
                Most investors react to trailing data: last quarter&apos;s vacancy, last year&apos;s rent growth. Cignal keeps leading
                indicators separate from trailing ones and never blends them, so the early warning isn&apos;t washed out by the lagging consensus.
              </p>
            </div>
            <div className="card p-6">
              <p className="kicker mb-4">Three layers, outside in</p>
              <div className="space-y-4">
                {LAYERS.map(([tag, name, line]) => (
                  <div key={tag} className="grid grid-cols-[86px_1fr] gap-4">
                    <p className="mono pt-0.5 text-[11px] tracking-[0.12em] text-signal">{tag.toUpperCase()}</p>
                    <p className="text-sm leading-relaxed text-muted"><span className="font-semibold text-ink">{name}.</span> {line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link href={href(home, "/training")} className="hover-line mono mt-6 inline-flex items-center gap-1.5 text-[12px] tracking-[0.08em] text-muted hover:text-ink">
            LEARN THE FULL METHOD: ECONIQ TRAINING <ArrowUpRight size={13} />
          </Link>
        </section>

        {/* PRICING */}
        <section id="pricing" className="scroll-mt-24 pt-24">
          <p className="kicker mb-3">Pricing</p>
          <h2 className="headline max-w-3xl text-4xl text-ink md:text-5xl">Start free. Upgrade when the signal pays for itself.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="card flex flex-col p-7">
              <p className="kicker">Free account</p>
              <p className="headline mt-3 text-5xl text-ink">$0</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted">
                <li>Dashboard and live signal feed</li>
                <li>Cycle Clock</li>
                <li>Daily market ticker and news</li>
              </ul>
              <Link href={href(home, "/register")} className="mono mt-8 inline-flex w-fit items-center gap-2 rounded-sm border border-[var(--line-strong)] px-5 py-2.5 text-[12px] tracking-[0.08em] text-ink hover:border-signal/50">
                CREATE FREE ACCOUNT <ArrowRight size={13} />
              </Link>
            </div>
            <div className="card flex flex-col border-signal/30 p-7">
              <p className="kicker text-signal">Cignal Pro</p>
              <p className="headline mt-3 text-5xl text-ink">
                $179<span className="text-xl text-muted">/mo</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted">
                <li>Everything in Free</li>
                <li>Full indicator library, forecasts and market maps</li>
                <li>Submarket benchmarks, portfolio tracking and underwriting tools</li>
              </ul>
              <Link href={href(home, "/register")} className="mono mt-8 inline-flex w-fit items-center gap-2 rounded-sm bg-signal px-5 py-2.5 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">
                START FREE, UPGRADE INSIDE <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-24 border-t border-[var(--line)] bg-bg/60">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Mark />
              <span className="mono text-sm tracking-[0.16em] text-ink">CIGNAL<span className="text-signal">·</span>SYSTEM</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Market cycle intelligence for multifamily operators, passive investors, real estate investors and business owners.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socialLinks().map(({ key, label, href: url }) => {
                const Icon = ICONS[key];
                return (
                  <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-muted transition-colors hover:border-signal/40 hover:text-signal">
                    {Icon && <Icon className="h-4 w-4" />}
                  </a>
                );
              })}
            </div>
          </div>
          <div>
            <p className="kicker mb-4">Markets</p>
            <ul className="space-y-2.5">
              {LENSES.map((l) => (
                <li key={l.vertical}>
                  <Link href={href(l.vertical)} className="text-sm text-muted hover:text-ink">{l.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="kicker mb-4">Company</p>
            <ul className="space-y-2.5">
              {[["About", "/about"], ["Training & Certification", "/training"], ["FAQ", "/faq"], ["Terms", "/terms"], ["Privacy", "/privacy"], ["Disclaimer", "/disclaimer"]].map(([label, p]) => (
                <li key={label}>
                  <Link href={href(home, p)} className="text-sm text-muted hover:text-ink">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mono border-t border-[var(--line)] py-5 text-center text-[10px] tracking-[0.2em] text-muted">
          © {new Date().getFullYear()} CIGNAL SYSTEM LLC · ALL RIGHTS RESERVED · NASHVILLE, TN / WEST PALM BEACH, FL
        </p>
      </footer>
    </>
  );
}
