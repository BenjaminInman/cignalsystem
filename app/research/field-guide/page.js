"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import { FIELD_GUIDE } from "@/lib/field-guide";

const TONE = { signal: "var(--signal)", up: "var(--up)", down: "var(--down)" };

function Concept({ c }) {
  const accent = TONE[c.tone] || "var(--signal)";
  return (
    <div className="card p-5 md:p-6" style={{ borderLeft: `2px solid ${accent}` }}>
      <p className="mono text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>{c.kicker}</p>
      <h3 className="headline mt-1.5 text-xl text-ink md:text-2xl">{c.title}</h3>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">{c.body}</p>
      <div className="mt-4 flex items-start gap-2.5 border-t border-[var(--line)] pt-3">
        <span className="mono mt-0.5 text-[9px] tracking-[0.14em]" style={{ color: accent }}>TAKEAWAY</span>
        <p className="text-[13px] font-medium leading-relaxed text-ink">{c.takeaway}</p>
      </div>
    </div>
  );
}

export default function FieldGuidePage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "research")) return <ComingSoonInline vertical={vertical} title="Field Guide" />;

  return (
    <div className="pt-12 pb-16">
      <Link href="/research" className="mono mb-6 inline-flex items-center gap-2 text-[12px] tracking-[0.04em] text-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to Canary
      </Link>

      <p className="kicker mb-3">Cignal Intelligence</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Field Guide</h1>
      <p className="mt-4 max-w-2xl text-muted">
        The vocabulary behind the numbers. Anatomy pulls apart <span className="text-ink">what</span> the
        indicators are made of; the Field Guide pulls apart <span className="text-ink">how to think</span> about
        them — the cycle, the difference between what leads and what lags, and the traps that catch investors who
        read the data without a framework.
      </p>

      <div className="mt-8 space-y-4">
        {FIELD_GUIDE.map((c) => <Concept key={c.slug} c={c} />)}
      </div>

      <div className="mt-8 rounded-xl border border-signal/25 bg-signal/[0.05] p-5">
        <p className="text-[14px] leading-relaxed text-muted">
          These are the ideas the whole platform runs on. Want to see them at work?{" "}
          <Link href="/research/anatomy" className="text-signal hover:underline">Open Anatomy</Link> to watch
          leading and lagging parts sit inside a single number, or{" "}
          <Link href="/research" className="text-signal hover:underline">ask Canary</Link> where the cycle is turning.
        </p>
      </div>
    </div>
  );
}
