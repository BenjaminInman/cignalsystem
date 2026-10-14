"use client";

// Hub sign-up box: the visitor picks a market explicitly (never inferred from
// the last market they browsed) and a plan. Pro links carry ?plan=pro so
// sign-up flows straight into checkout.
import { useEffect, useState } from "react";
import { ArrowRight, Building2, Briefcase, Home, LineChart } from "lucide-react";

const MARKETS = [
  { path: "multifamily", icon: Building2, name: "Multifamily", who: "Owners, operators, syndicators, lenders, property management and asset managers", live: true },
  { path: "investors", icon: LineChart, name: "Passive Investors", who: "LPs in syndications, funds and JV partnerships", live: true },
  { path: "realestate", icon: Home, name: "Real Estate Investors", who: "SFR, small multifamily, commercial, self storage, hotel, retail, medical and land", live: true },
  { path: "business", icon: Briefcase, name: "Business Owners", who: "Small to mid-size businesses: retail, restaurants, contractors, professional services and local service companies planning hiring, inventory and expansion", live: false },
];

export default function SignupChooser() {
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#signup-pro") setPlan("pro");
      else if (window.location.hash === "#signup") setPlan("free");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const tab = (value, label) => (
    <button
      type="button"
      onClick={() => setPlan(value)}
      aria-pressed={plan === value}
      className={`mono rounded-md px-3.5 py-2 text-[11px] tracking-[0.08em] transition-colors ${
        plan === value ? "bg-signal text-bg" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div id="signup" className="card mt-4 scroll-mt-24 p-6 md:p-7">
      <span id="signup-pro" className="block scroll-mt-24" aria-hidden="true" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Choose your market</p>
          <h3 className="headline text-2xl text-ink md:text-3xl">Which market are you signing up for?</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            One account works across every Cignal market. This sets the one you start in, and you can switch any time.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-[var(--line-strong)] p-1" role="group" aria-label="Plan">
          {tab("free", "FREE")}
          {tab("pro", "PRO · $179/MO")}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MARKETS.map(({ path, icon: Icon, name, who, live }) =>
          live ? (
            <a
              key={path}
              href={`/${path}/register${plan === "pro" ? "?plan=pro" : ""}`}
              className="group flex items-start gap-3 rounded-lg border border-[var(--line-strong)] p-4 transition-colors hover:border-signal/60 hover:bg-signal/[0.05]"
            >
              <Icon size={20} className="mt-0.5 shrink-0 text-signal" strokeWidth={1.8} />
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{name}</span>
                <span className="block text-xs text-muted">{who}</span>
                <span className="mono mt-2 inline-flex items-center gap-1 text-[11px] tracking-[0.08em] text-signal">
                  {plan === "pro" ? "START PRO" : "SIGN UP FREE"} <ArrowRight size={12} />
                </span>
              </span>
            </a>
          ) : (
            <a
              key={path}
              href="#markets"
              className="flex items-start gap-3 rounded-lg border border-dashed border-[var(--line-strong)] p-4 transition-colors hover:border-signal/40"
            >
              <Icon size={20} className="mt-0.5 shrink-0 text-muted" strokeWidth={1.8} />
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{name}</span>
                <span className="block text-xs text-muted">{who}</span>
                <span className="mono mt-2 inline-flex items-center gap-1 text-[11px] tracking-[0.08em] text-muted">
                  EARLY ACCESS LIST <ArrowRight size={12} />
                </span>
              </span>
            </a>
          )
        )}
      </div>
    </div>
  );
}
