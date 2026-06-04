import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

export default function CommunityCTA() {
  return (
    <section className="card mt-14 flex flex-col items-start justify-between gap-5 p-8 md:flex-row md:items-center">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-signal/10">
          <Users size={20} className="text-signal" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="headline text-2xl text-ink">Join The Signal Room</h2>
          <p className="mt-1 max-w-xl text-muted">
            Debate the signals with other operators and compare reads on the cycle — on-platform, not lost in a feed. Or follow the latest on X.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3">
        <Link href="/community" className="mono flex items-center gap-2 rounded-sm bg-signal px-5 py-3 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">
          Enter The Signal Room <ArrowRight size={14} />
        </Link>
        <a href="https://x.com/thecignalsystem" target="_blank" rel="noopener noreferrer" className="mono flex items-center gap-2 rounded-sm border border-[var(--line-strong)] px-5 py-3 text-[12px] tracking-[0.08em] text-ink hover:bg-white/[0.04]">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Follow on X
        </a>
      </div>
    </section>
  );
}
