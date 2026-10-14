"use client";

// "What now?" panel for the Command Center. Shown until the member dismisses
// it (remembered per browser); the full guide stays one click away at /guide.
import { useEffect, useState } from "react";
import { ArrowRight, Lock, X, Compass } from "lucide-react";
import Link from "@/components/VLink";
import { GETTING_STARTED } from "@/lib/terminal-guide";

const KEY = "cs_getting_started_dismissed";

export default function GettingStarted({ isPro }) {
  const [hidden, setHidden] = useState(true); // avoid a flash before we read storage

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch {}
    setHidden(dismissed);
  }, []);

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setHidden(true);
  }

  if (hidden) {
    return (
      <Link href="/guide" className="hover-line mono mt-6 inline-flex items-center gap-1.5 text-[12px] tracking-[0.08em] text-muted hover:text-ink">
        <Compass size={13} /> TERMINAL GUIDE: WHAT EVERY TAB DOES
      </Link>
    );
  }

  return (
    <section className="relative mt-8 rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.07] via-bg2/50 to-bg/20 p-6 md:p-8">
      <button onClick={dismiss} aria-label="Hide the getting-started guide" className="absolute right-4 top-4 rounded p-1 text-muted hover:text-ink">
        <X size={16} />
      </button>
      <p className="kicker mb-2">Start here</p>
      <h2 className="headline text-2xl text-ink md:text-3xl">What now? Four moves to get value on day one.</h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GETTING_STARTED.map((s) => {
          const locked = s.pro && !isPro;
          const href = locked ? "/upgrade?page=underwrite" : s.href;
          const isAnchor = href.startsWith("#");
          const Cta = isAnchor ? "a" : Link;
          return (
            <li key={s.step} className="flex flex-col rounded-lg border border-[var(--line)] bg-bg2/80 p-5">
              <p className="mono text-[11px] tracking-[0.2em] text-signal">{s.step}</p>
              <h3 className="mt-2 font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
              <Cta href={href} className="mono mt-4 inline-flex items-center gap-1.5 text-[11px] tracking-[0.08em] text-signal hover:opacity-80">
                {locked ? <><Lock size={11} /> PRO: UNLOCK</> : <>{s.cta.toUpperCase()} <ArrowRight size={12} /></>}
              </Cta>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
        <Link href="/guide" className="mono inline-flex items-center gap-1.5 text-[12px] tracking-[0.08em] text-ink hover:text-signal">
          <Compass size={14} /> SEE WHAT EVERY TERMINAL TAB DOES <ArrowRight size={13} />
        </Link>
        <button onClick={dismiss} className="mono text-[11px] tracking-[0.08em] text-muted hover:text-ink">
          GOT IT, HIDE THIS
        </button>
      </div>
    </section>
  );
}
