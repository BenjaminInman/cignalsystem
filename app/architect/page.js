import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PortfolioArchitect from "@/components/PortfolioArchitect";

export const metadata = {
  title: "Portfolio Architect — Cignal System",
  description:
    "Strategy-first, cycle-conditional portfolio design. Set the phase and your target outcome, and the Architect maps which product classes, vintages, and market types to focus on.",
};

// Sandbox entry point: the same Architect engine as the Portfolio tab, but with
// no portfolio bound. Passing no `properties` puts it in pure strategy mode —
// the "what should I be buying in this phase" layer that feeds the other tools.
export default function ArchitectPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="headline text-4xl text-ink md:text-5xl">Portfolio Architect</h1>
          <p className="mt-3 max-w-2xl text-muted">
            The layer <span className="text-ink">upstream</span> of the deal. Set the phase the market is in
            and the outcome you&apos;re after, and the Architect maps the strategy — which product classes,
            vintages, market types, and risk posture to focus on. It&apos;s the answer to{" "}
            <span className="text-ink">&ldquo;what should I even be buying right now?&rdquo;</span> before you
            run a specific deal through the Underwriter, Litmus, or Exit tools.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
        <span>
          Modeling your <span className="text-ink">actual holdings</span> instead?{" "}
          <Link href="/portfolio" className="text-signal underline-offset-2 hover:underline">
            Open it in your Portfolio <ArrowUpRight size={12} className="inline" />
          </Link>
        </span>
      </div>

      <div className="mt-8">
        {/* No `properties` prop -> strategy sandbox. Same engine as the Portfolio
            tab's Architect, so the two can never drift. */}
        <PortfolioArchitect />
      </div>
    </div>
  );
}
