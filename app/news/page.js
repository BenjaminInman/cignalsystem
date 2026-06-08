"use client";

import { useState, useEffect } from "react";
import { Newspaper, ArrowUpRight } from "lucide-react";
import { useContent } from "@/components/VerticalProvider";
import CommunityCTA from "@/components/CommunityCTA";
import CignalScoreCTA from "@/components/CignalScoreCTA";

export default function NewsPage() {
  const { NEWS = [] } = useContent();
  const [items, setItems] = useState(null); // null = loading
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => {
        if (d.items && d.items.length) { setItems(d.items); setLive(true); }
        else setItems(NEWS);
      })
      .catch(() => setItems(NEWS));
  }, [NEWS]);

  return (
    <div className="pt-12 pb-10">
      <p className="kicker mb-3 flex items-center gap-2"><Newspaper size={12} className="text-signal" /> Industry News</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">The latest on the market</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Headlines aggregated from The Real Deal, Multifamily Dive, Multi-Housing News, and MultifamilyBiz — refreshed throughout the day.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          {items === null ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card animate-pulse p-7"><div className="h-4 w-1/3 rounded bg-white/[0.05]" /><div className="mt-4 h-5 w-3/4 rounded bg-white/[0.06]" /></div>
              ))}
              <p className="mono text-[11px] tracking-[0.06em] text-muted">Pulling the latest headlines…</p>
            </div>
          ) : (
            <Feed items={items} live={live} />
          )}
        </div>
        <aside>
          <div className="lg:sticky lg:top-24">
            <CommunityCTA variant="sidebar" />
            <div className="mt-4">
              <CignalScoreCTA />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({ a, lead }) {
  const external = a.link && a.link.startsWith("http");
  const Wrapper = external ? "a" : "div";
  const props = external ? { href: a.link, target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Wrapper {...props} className={`card group flex flex-col transition-colors hover:border-[var(--line-strong)] ${lead ? "p-7" : "p-6"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mono rounded-sm border border-signal/30 bg-signal/10 px-2 py-1 text-[10px] tracking-[0.08em] text-signal">{a.source}</span>
        <span className="mono text-[11px] tracking-wide text-muted">{a.cat}{a.date ? ` · ${a.date}` : ""}</span>
      </div>
      <h2 className={`font-semibold leading-snug text-ink transition-colors group-hover:text-signal ${lead ? "text-2xl" : "text-lg"}`}>{a.title}</h2>
      {a.excerpt && <p className={`mt-2 leading-relaxed text-muted ${lead ? "max-w-3xl" : "text-sm"}`}>{a.excerpt}</p>}
      <span className="mono mt-4 inline-flex items-center gap-1 text-[11px] tracking-[0.06em] text-signal">READ AT SOURCE <ArrowUpRight size={12} /></span>
    </Wrapper>
  );
}

function Feed({ items, live }) {
  const [lead, ...rest] = items;
  return (
    <>
      <div><Card a={lead} lead /></div>
      <div className="mt-4 grid gap-4">
        {rest.map((a, i) => <Card key={i} a={a} />)}
      </div>
      <p className="mono mt-8 flex items-center gap-2 text-[11px] tracking-[0.06em] text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-flicker bg-signal" : "bg-muted"}`} />
        {live ? "Live feed · aggregated headlines link back to each publisher" : "Showing sample headlines — live feeds resume when sources are reachable"}
      </p>
    </>
  );
}
