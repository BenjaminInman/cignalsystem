import Link from "@/components/VLink";
import { ArrowRight, Lock } from "lucide-react";
import { TERMINAL_GUIDE, GETTING_STARTED } from "@/lib/terminal-guide";

export const metadata = {
  title: "Terminal Guide · Cignal System",
  description: "What every tab in the Cignal System Terminal does, and when to use it.",
};

// Walkthrough recording of the Terminal menu (served from /public).
const VIDEO = "/media/terminal-walkthrough.mp4";
const POSTER = "/media/terminal-walkthrough.jpg";

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-5xl pt-14 pb-20 fade-up">
      <p className="kicker mb-3">Terminal guide</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">What every tab does, and when to use it.</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        The Terminal menu at the top of every page holds the whole system. Here&apos;s a two-minute tour, followed by a
        plain-English summary of each tab.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-[var(--line)] bg-bg2">
        <video controls preload="metadata" playsInline poster={POSTER} className="block aspect-video w-full bg-black">
          <source src={VIDEO} type="video/mp4" />
        </video>
      </div>

      <section className="mt-12">
        <p className="kicker mb-4">If you only do four things</p>
        <ol className="grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
          {GETTING_STARTED.map((s) => (
            <li key={s.step} className="bg-bg2 p-5">
              <p className="mono text-[11px] tracking-[0.2em] text-signal">{s.step}</p>
              <h3 className="mt-2 font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {TERMINAL_GUIDE.map((g) => (
        <section key={g.group} className="mt-12">
          <p className="kicker mb-4">{g.group}</p>
          <div className="space-y-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)]">
            {g.items.map((it) => (
              <div key={it.label} className="grid gap-3 bg-bg2 p-5 md:grid-cols-[180px_1fr_auto] md:items-center">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink">{it.label}</h3>
                  {it.pro && (
                    <span className="mono inline-flex items-center gap-1 rounded-sm border border-signal/30 px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-signal">
                      <Lock size={9} /> PRO
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-ink/90">{it.what}</p>
                  <p className="mono mt-1 text-[11px] tracking-[0.04em] text-muted">USE IT TO: {it.use.toUpperCase()}</p>
                </div>
                <Link href={it.href} className="mono inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] tracking-[0.08em] text-signal hover:opacity-80">
                  OPEN <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
