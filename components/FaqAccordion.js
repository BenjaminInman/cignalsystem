"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const GROUPS = [
  {
    cat: "The Platform",
    items: [
      {
        q: "What is Cignal System?",
        a: "Cignal System is a market-intelligence platform for the multifamily real estate industry. It gathers the economic indicators that actually drive the property cycle — from national data down to individual metros — and organizes them so you can see where a market is, where it's heading, and why. The point is to help owners, operators, investors, and lenders make timing decisions with evidence instead of gut feel.",
      },
      {
        q: "What makes it different from other real estate data tools?",
        a: "Most tools describe what a market looks like today. Cignal System is built around when — where a market sits in its cycle. It separates leading indicators, the ones that move first, from lagging ones that only confirm what already happened, so you can see a shift forming before it reaches the headlines. That's the difference between reacting to the market and positioning ahead of it.",
      },
      {
        q: "Who is Cignal System for?",
        a: "Multifamily owners and operators, active and passive investors, management firms, and lenders or equity groups — anyone whose returns depend on buying, selling, financing, or operating at the right point in the cycle.",
      },
    ],
  },
  {
    cat: "The Method",
    items: [
      {
        q: "What are the four phases of a market cycle?",
        a: "Recovery, Expansion, Hypersupply, and Contraction. Each phase has a distinct fingerprint across occupancy, rent growth, construction, and demand. Knowing which phase a market is in — and which one it's rotating toward — is what separates buying at the right time from buying at the top.",
      },
      {
        q: "What's the difference between leading and lagging indicators?",
        a: "Leading indicators — building permits, interest rates, job growth — tend to move before the cycle turns, so they act as an early warning. Lagging indicators — unemployment, wages, realized rents — confirm a turn after it has already happened. Watching the two layers together is the heart of the platform: when the leading layer starts to diverge from the lagging one, a phase change is forming.",
      },
      {
        q: "Does Cignal System predict the market?",
        a: "No one can predict a market with certainty, and we don't pretend to. What we do is lay out the weight of the evidence — where each indicator sits, which way it's moving, and how strongly they agree — so you can make your own informed call. We only name a cycle phase once the confirming indicators line up, and we flag a forming shift separately, so an early signal is never mistaken for a done deal.",
      },
      {
        q: "How do you handle correlation versus causation?",
        a: "Carefully, and transparently. A pattern that correlates isn't necessarily one that drives an outcome, so we keep each indicator attributed to its own source and construct rather than blending unlike measures into a single black-box number. You can see the relationships and judge them for yourself.",
      },
    ],
  },
  {
    cat: "The Data",
    items: [
      {
        q: "Where does your data come from?",
        a: "Exclusively from reputable, publicly available sources — federal agencies and established industry datasets such as the Federal Reserve (FRED), the U.S. Census Bureau, the Bureau of Labor Statistics, The Conference Board, and public housing data. Every reading traces back to a primary source you can verify. Third-party indexes remain the property of their publishers — for example, the Consumer Confidence Index® is a registered trademark of The Conference Board — and are shown here with attribution.",
      },
      {
        q: "How often is the data updated?",
        a: "As each source releases it. Some series update daily, like the 10-year Treasury; others are monthly, quarterly, or annual depending on the publisher's schedule. We key each reading to its reference period, so indicators on different release cadences still line up correctly.",
      },
      {
        q: "What geographies do you cover?",
        a: "National indicators plus hundreds of metro markets, with select data down to finer grains where public data allows. We're upfront about the limits — some series simply aren't published below a certain level, and we won't manufacture detail that doesn't exist.",
      },
    ],
  },
  {
    cat: "The Dashboard",
    items: [
      {
        q: "What do I get access to once I sign up?",
        a: "The dashboard opens a full suite of tools: Indicators (the underlying data), Market Maps (side-by-side geographic comparison), Forecasts (forward-looking drivers), Signals (leading-versus-lagging divergence), Research (deeper analysis), and a Portfolio tracker for your own holdings.",
      },
      {
        q: "What's free, and what requires an account?",
        a: "The home page — daily multifamily and real estate news plus the live data ticker — is open to everyone, no login required. The dashboard tools require a free account, with more advanced capabilities available on paid plans.",
      },
      {
        q: "Can I track my own portfolio?",
        a: "Yes. The Portfolio tool lets you enter your properties and see how their fundamentals stack up against the live market read — so you can tell which holdings are riding a tailwind and which are exposed to a turn.",
      },
    ],
  },
  {
    cat: "Getting Started",
    items: [
      {
        q: "Is any of this investment advice?",
        a: "No. Everything on the platform is for informational and educational purposes only — analytical tools meant to inform your own judgment, not recommendations to buy, sell, or finance anything. Always verify with primary sources and consult your own licensed professionals. See our Disclaimer for the full statement.",
      },
      {
        q: "How do I get started?",
        a: "Create a free account to unlock the dashboard, then start with the cycle read on the home page and drill into the markets you care about. If you want to go deeper on the methodology itself — how to actually navigate the four phases as an investor or operator — that's what our coaching and certification track is built for.",
      },
    ],
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState("0-0");
  return (
    <div className="mt-12 space-y-12">
      {GROUPS.map((g, gi) => (
        <section key={gi}>
          <p className="kicker mb-4 text-signal/80">{g.cat}</p>
          <div className="overflow-hidden rounded-lg border border-[var(--line)]">
            {g.items.map((it, ii) => {
              const key = `${gi}-${ii}`;
              const isOpen = open === key;
              return (
                <div key={ii} className={ii ? "border-t border-[var(--line)]" : ""}>
                  <button
                    onClick={() => setOpen(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 bg-bg2 px-5 py-4 text-left transition-colors hover:bg-[var(--line)]/30"
                  >
                    <span className="text-[15px] font-medium text-ink">{it.q}</span>
                    <span className="shrink-0 text-signal">{isOpen ? <Minus size={17} /> : <Plus size={17} />}</span>
                  </button>
                  {isOpen && (
                    <div className="bg-bg2/40 px-5 pb-5">
                      <p className="max-w-2xl text-[14px] leading-relaxed text-muted">{it.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
