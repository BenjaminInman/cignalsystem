import { Newspaper, ArrowUpRight } from "lucide-react";
import { NEWS } from "@/lib/data";

export default function NewsPage() {
  const [lead, ...rest] = NEWS;
  return (
    <div className="pt-12 pb-10">
      <p className="kicker mb-3 flex items-center gap-2"><Newspaper size={12} className="text-signal" /> Industry News</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">The latest on the market</h1>
      <p className="mt-3 max-w-2xl text-muted">Economic and multifamily headlines, curated for owners and operators.</p>

      {/* Featured lead story */}
      <a href="#" className="card group mt-8 block p-7 transition-colors hover:border-[var(--line-strong)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="mono rounded-sm border border-signal/30 bg-signal/10 px-2 py-1 text-[10px] tracking-[0.08em] text-signal">{lead.cat}</span>
          <span className="mono text-[11px] tracking-wide text-muted">{lead.source} · {lead.date}</span>
        </div>
        <h2 className="text-2xl font-semibold leading-snug text-ink transition-colors group-hover:text-signal">{lead.title}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">{lead.excerpt}</p>
        <span className="mono mt-4 inline-flex items-center gap-1 text-[12px] tracking-[0.06em] text-signal">READ <ArrowUpRight size={13} /></span>
      </a>

      {/* Rest */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {rest.map((a) => (
          <a key={a.id} href="#" className="card group flex flex-col p-6 transition-colors hover:border-[var(--line-strong)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="mono rounded bg-white/[0.04] px-2 py-1 text-[10px] tracking-wide text-muted">{a.cat}</span>
              <span className="mono text-[11px] tracking-wide text-muted">{a.date}</span>
            </div>
            <h3 className="text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-signal">{a.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a.excerpt}</p>
            <span className="mono mt-4 inline-flex items-center gap-1 text-[11px] tracking-[0.06em] text-signal">READ <ArrowUpRight size={12} /></span>
          </a>
        ))}
      </div>

      <p className="mono mt-8 text-[11px] tracking-[0.06em] text-muted">Sample headlines — a live curated news feed will replace these for production.</p>
    </div>
  );
}
