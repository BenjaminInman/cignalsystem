"use client";

import Link from "next/link";
import CanaryMark from "@/components/CanaryMark";

// Reusable "Ask Canary" affordance. Drop it anywhere with a pre-filled question;
// it deep-links into the Canary desk (/research?ask=...), which auto-submits it.
//   variant="pill"   -> gold outline pill (primary, for cards/panels)
//   variant="inline" -> quiet dashed-underline link (for tight rows)
export default function AskCanary({ question, label = "Ask Canary", variant = "pill", className = "", metro, cbsa }) {
  const params = new URLSearchParams({ ask: question || label });
  if (metro) params.set("m", metro);
  if (cbsa) params.set("c", cbsa);
  const href = `/research?${params.toString()}`;

  if (variant === "icon") {
    return (
      <Link
        href={href}
        aria-label={`Ask Canary: ${question || label}`}
        title={`Ask Canary — ${question || label}`}
        className={`inline-flex shrink-0 align-middle text-signal/70 transition-colors hover:text-signal ${className}`}
      >
        <CanaryMark size={15} />
      </Link>
    );
  }

  if (variant === "inline") {
    return (
      <Link
        href={href}
        aria-label={`Ask Canary: ${question || label}`}
        className={`group inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink ${className}`}
      >
        <CanaryMark size={14} className="shrink-0 text-signal" />
        <span className="mono border-b border-dashed border-[var(--line-strong)] pb-px text-[12px] group-hover:border-signal/60">
          {label} &rarr;
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={`Ask Canary: ${question || label}`}
      className={`inline-flex items-center gap-2 rounded-full border border-signal/45 bg-signal/[0.06] px-3 py-1.5 transition-colors hover:bg-signal/[0.12] ${className}`}
    >
      <CanaryMark size={16} className="shrink-0 text-signal" />
      <span className="mono text-[11px] font-medium tracking-[0.12em] text-signal">{label.toUpperCase()}</span>
    </Link>
  );
}
