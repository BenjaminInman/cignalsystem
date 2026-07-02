import Link from "next/link";
import { HelpCircle, ArrowRight } from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata = { title: "FAQ · Cignal System" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-14 pb-24 fade-up">
      <p className="kicker mb-3 flex items-center gap-2">
        <HelpCircle size={12} className="text-signal" /> Intel Briefing
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Frequently Asked Questions</h1>
      <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
        Everything you need to know about how Cignal System reads the multifamily cycle &mdash; the
        data behind it, what the dashboard unlocks, and how to get started. Tap any question to
        reveal the answer.
      </p>

      <FaqAccordion />

      <div className="mt-16 rounded-lg border border-[var(--line)] bg-bg2 p-8 text-center md:p-10">
        <h2 className="headline text-2xl text-ink md:text-3xl">Still have questions?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          The fastest way to understand what Cignal System does is to see it. Create a free
          account and explore the live dashboard.
        </p>
        <Link
          href="/register"
          className="group mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition hover:brightness-110"
          style={{ backgroundColor: "#F5B544", color: "#0A0B0D" }}
        >
          Get started
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
