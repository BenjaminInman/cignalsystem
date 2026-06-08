import { ArrowRight } from "lucide-react";

export default function ComingSoon({ vertical }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 py-24 text-center">
      <span className="flex items-center gap-2.5">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
          <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
          <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
        </svg>
        <span className="mono text-sm font-medium tracking-[0.16em] text-ink">
          CIGNAL<span className="text-signal">·</span>SYSTEM
        </span>
      </span>

      <p className="kicker mt-10 mb-3">{vertical.label}</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">{vertical.label} intelligence is on the way.</h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
        {vertical.blurb || `Cycle intelligence for ${vertical.label}, built on the same Cignal signals engine.`}{" "}
        We&apos;re tuning the indicators and signals for this vertical now.
      </p>

      <a href="https://multifamily.cignalsystem.com" className="mono mt-9 inline-flex items-center gap-2 rounded-sm bg-signal px-5 py-3 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">
        See the live Multifamily system <ArrowRight size={14} />
      </a>

      <p className="mono mt-10 text-[10px] tracking-[0.2em] text-muted">MORE VERTICALS COMING · ECONIQ</p>
    </div>
  );
}
