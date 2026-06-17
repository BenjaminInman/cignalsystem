"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BarChart3, LineChart, Radio, BookOpen, Briefcase, ArrowUpRight } from "lucide-react";
import { useVertical, useContent } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import { createClient } from "@/lib/supabase/client";

const SUITE = [
  { name: "Indicators", href: "/indicators", icon: Activity, desc: "Leading & trailing metrics across every major metro." },
  { name: "Market Maps", href: "/market-maps", icon: BarChart3, desc: "Fundamentals scored and ranked across 42 MSAs." },
  { name: "Forecasts", href: "/forecasts", icon: LineChart, desc: "5-year forward projections and scenario models." },
  { name: "Signals", href: "/signals", icon: Radio, desc: "Synthesized alerts when a market shifts cycle phase." },
  { name: "Research", href: "/research", icon: BookOpen, desc: "In-depth briefings that turn data into a thesis." },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase, desc: "Your assets, scored against live market position." },
];

export default function DashboardPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "dashboard")) return <ComingSoonInline vertical={vertical} title="Dashboard" />;
  return <DashboardInner />;
}

function DashboardInner() {
  const { DASH_STATS = [] } = useContent();
  const mt = DASH_STATS.find((s) => s.label === "MARKETS TRACKED");
  const markets = mt ? `${mt.value} ${mt.unit}` : "every major metro";
  const suite = SUITE.map((s) =>
    s.name === "Market Maps" ? { ...s, desc: `Fundamentals scored and ranked across ${markets}.` } : s
  );

  const [email, setEmail] = useState("");
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);

  return (
    <div className="pt-12 pb-16">
      <p className="kicker mb-3 flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-up" /> Subscriber Terminal · Live
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Command center</h1>
      <p className="mt-3 max-w-2xl text-muted">
        {email ? <>Signed in as <span className="text-ink">{email}</span>. </> : null}
        Your full intelligence suite is unlocked — jump into any module below.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* LEFT: placeholder panel — swap for featured content (cycle phase, portfolio snapshot, etc.) */}
        <div className="card p-7">
          <p className="kicker mb-3">Market snapshot</p>
          <h2 className="headline text-2xl text-ink">Cycle phase</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The four-phase cycle read for your markets surfaces here once the phase
            engine is online. For now, start with the indicators that feed it.
          </p>
          <Link
            href="/indicators"
            className="mono mt-5 inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[13px] font-medium tracking-[0.06em] text-bg transition-all hover:brightness-110"
          >
            Open indicators <ArrowUpRight size={15} strokeWidth={2} />
          </Link>
        </div>

        {/* RIGHT: live suite navigation (unlocked — these are now active links) */}
        <div>
          <p className="kicker mb-4">Your suite</p>
          <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {suite.map((s) => (
              <Link
                key={s.name}
                href={s.href}
                className="group relative bg-bg2 p-6 transition-colors hover:bg-white/[0.03]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/10">
                    <s.icon size={15} className="text-signal" strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight size={15} className="text-muted transition-colors group-hover:text-signal" />
                </div>
                <h3 className="font-semibold text-ink">{s.name}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
