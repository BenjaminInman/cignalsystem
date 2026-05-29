import { BookOpen } from "lucide-react";
import { RESEARCH } from "@/lib/data";

export default function ResearchPage() {
  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">Research</h1>
      <p className="mt-3 max-w-2xl text-muted">In-depth analysis and market commentary for multifamily professionals.</p>

      <div className="mt-8 space-y-4">
        {RESEARCH.map((a) => (
          <article key={a.title} className="card group flex items-start justify-between gap-6 p-6 transition-colors hover:border-[var(--line-strong)]">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mono rounded-sm border border-signal/30 bg-signal/10 px-2 py-1 text-[10px] tracking-[0.08em] text-signal">{a.cat}</span>
                {a.tags.map((t) => (
                  <span key={t} className="mono rounded bg-white/[0.04] px-2 py-1 text-[10px] tracking-wide text-muted">{t}</span>
                ))}
              </div>
              <h2 className="text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-signal">{a.title}</h2>
              <p className="mono mt-3 text-[11px] tracking-wide text-muted">{a.date} · {a.read}</p>
            </div>
            <BookOpen size={18} className="mt-1 shrink-0 text-muted" strokeWidth={1.6} />
          </article>
        ))}
      </div>
    </div>
  );
}
