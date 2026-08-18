import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TrainingForm from "@/components/TrainingForm";
import { getActiveContent } from "@/lib/active-vertical";

export const metadata = {
  title: "Training & Certification — Cignal System",
  description:
    "A selective coaching and certification track that teaches the method behind the signals — how to navigate the four phases of the market cycle and act on the read.",
};

export default async function TrainingPage() {
  const COPY = (await getActiveContent())?.copy || {};
  const asset = COPY.aboutAsset || "multifamily";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:py-16">
      <Link
        href="/about"
        className="mono inline-flex items-center gap-2 text-[12px] tracking-[0.06em] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} strokeWidth={1.8} /> Back to About
      </Link>

      <div className="mt-8">
        <p className="kicker mb-4">Learn to apply the signals</p>
        <h1 className="headline text-3xl text-ink md:text-4xl">Training &amp; certification</h1>

        <p className="mt-5 leading-relaxed text-muted md:text-[17px]">
          The platform gives you the read. The training teaches you to{" "}
          <span className="text-ink">act on it</span> — how to navigate the four phases of the cycle,
          tell a leading signal from a lagging one, and translate the divergence into decisions for your
          investment, operations, or management business. It&apos;s the difference between seeing the cycle
          and knowing what to do about it.
        </p>
        <p className="mt-4 leading-relaxed text-muted md:text-[17px]">
          The track is built for serious owners, operators, investors, and {asset} management firms, and
          moves from foundations to advanced certification. Enrollment is selective — tell us about your
          business and what you want to get out of it, and we&apos;ll follow up about fit.
        </p>
      </div>

      <section className="mt-10 rounded-2xl border border-signal/25 bg-gradient-to-b from-signal/[0.06] via-bg2/30 to-bg/10 p-6 md:p-8">
        <p className="mono mb-6 text-[11px] tracking-[0.2em] text-signal">APPLY FOR ENROLLMENT</p>
        <TrainingForm />
      </section>
    </main>
  );
}
