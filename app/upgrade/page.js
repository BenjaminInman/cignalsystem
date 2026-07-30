import Link from "next/link";
import { Lock, Check, LineChart, BookOpen, Briefcase, Users, Sparkles, Activity, TrendingUp, Layers, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PAGE_LABELS } from "@/lib/access";
import UpgradeCTA from "@/components/UpgradeCTA";
import IndicatorsDemo from "@/components/IndicatorsDemo";
import CycleClockDemo from "@/components/CycleClockDemo";

export const metadata = { title: "Upgrade · Cignal System" };
export const dynamic = "force-dynamic";

// These lists must match tier_access exactly. They previously promised Pro
// buyers Community and Market Maps (both Cignal+), and promised Cignal+ buyers
// FEMA risk overlays that do not exist yet — misrepresentation at the point of
// sale, on the one page whose whole job is to be trusted.
const PRO_FEATURES = [
  { icon: Activity, name: "Indicators", desc: "Every leading and trailing signal driving multifamily, with the full detail behind each." },
  { icon: LineChart, name: "Forecasts", desc: "5-year forward projections and scenario models." },
  { icon: BookOpen, name: "Research", desc: "In-depth briefings that turn data into a thesis." },
  { icon: Briefcase, name: "Portfolio", desc: "Your assets, scored against live market position." },
  { icon: TrendingUp, name: "Indices", desc: "The housing-economy equity complex, read as a confirmation signal." },
];

const PLUS_FEATURES = [
  { icon: Layers, name: "The Onion Framework", desc: "The proprietary lens at the core of the Cignal method — every signal organized into layered rings so you read the cycle from the outside in." },
  { icon: Briefcase, name: "Portfolio Architect", desc: "Cycle-conditional diversification — how your book should be weighted for the phase the market is actually in, not the one it was in when you bought." },
  { icon: BarChart3, name: "Market Maps", desc: "Place-based intelligence down to the submarket, ranked and scored." },
  { icon: Users, name: "Community", desc: "The members-only operator community." },
];

function formatPrice(cents) {
  if (cents == null) return null;
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`;
}

export default async function UpgradePage({ searchParams }) {
  const slug = searchParams?.page || "";
  const label = PAGE_LABELS[slug] || "this page";

  const supabase = createClient();
  const { data: tierRows } = await supabase
    .from("tiers")
    .select("slug, name, price_monthly_cents, active")
    .in("slug", ["pro", "cignal_plus"]);
  const pro = tierRows?.find((t) => t.slug === "pro");
  const plus = tierRows?.find((t) => t.slug === "cignal_plus");
  const price = formatPrice(pro?.price_monthly_cents);
  const plusPrice = formatPrice(plus?.price_monthly_cents);

  return (
    <div className="mx-auto max-w-3xl pt-14 pb-20 fade-up">
      <p className="kicker mb-3 flex items-center gap-2">
        <Lock size={12} className="text-signal" /> {pro?.name || "Cignal Pro"}
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">
        {label} is a Pro feature
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Your free account covers the core terminal. Upgrade to unlock {label} —
        plus forecasts, research, portfolio tracking, and the community.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <UpgradeCTA />
        {price && <span className="mono text-[13px] text-muted">{price}</span>}
        {!price && (
          <span className="mono text-[12px] text-muted">Pricing announced soon.</span>
        )}
        <Link href="/dashboard" className="mono text-[12px] tracking-[0.06em] text-muted hover-line">
          ← Back to dashboard
        </Link>
      </div>

      {slug === "indicators" && <IndicatorsDemo />}
      {slug === "where-are-we" && <CycleClockDemo />}

      <div className="mt-12">
        <p className="kicker mb-4">What Pro unlocks</p>
        <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
          {PRO_FEATURES.map((f) => (
            <div key={f.name} className="bg-bg2 p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/10">
                  <f.icon size={15} className="text-signal" strokeWidth={1.8} />
                </span>
                <h3 className="font-semibold text-ink">{f.name}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="mono mt-4 flex items-center gap-2 text-[12px] text-muted">
          <Check size={13} className="text-up" /> Everything in Free stays included — dashboard, signals, and Where Are We.
        </p>
      </div>

      <div className="mt-12">
        <div className="rounded-lg border border-signal/25 bg-signal/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="kicker flex items-center gap-2 text-signal">
              <Sparkles size={13} /> {plus?.name || "Cignal+"} — the top tier
            </p>
            <span className="mono rounded-full border border-signal/40 px-2.5 py-1 text-[11px] tracking-[0.08em] text-signal">
              {plus?.active ? (plusPrice || "Available now") : `Coming soon${plusPrice ? ` · ${plusPrice}` : ""}`}
            </span>
          </div>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
            Everything in Pro, plus the two tools the Cignal method actually runs on — the Onion Framework and the Portfolio Architect — along with Market Maps and the operator Community.
          </p>
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {PLUS_FEATURES.map((f) => (
              <div key={f.name} className="bg-bg2 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/10">
                    <f.icon size={15} className="text-signal" strokeWidth={1.8} />
                  </span>
                  <h3 className="font-semibold text-ink">{f.name}</h3>
                </div>
                <p className="text-[13px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
