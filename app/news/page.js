"use client";

import { useState, useEffect } from "react";
import { Newspaper, ArrowUpRight, Mail, Check } from "lucide-react";
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

      <NewsletterSignup />

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

function NewsletterSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [freq, setFreq] = useState("weekly");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (status === "loading") return;
    const e = email.trim();
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setStatus("error");
      setMsg("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMsg("");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: e, frequency: freq }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setStatus("done");
      else {
        setStatus("error");
        setMsg(d.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.08] via-bg2/40 to-bg/20 flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/15">
          <Check size={18} className="text-signal" />
        </div>
        <div>
          <p className="font-semibold text-ink">You&apos;re on the list.</p>
          <p className="mt-0.5 text-sm text-muted">
            You&apos;ll receive {freq === "daily" ? "the daily industry brief" : "the weekly industry summary"} at {email}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.08] via-bg2/40 to-bg/20 p-6 md:p-7">
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
          <p className="kicker mb-2 flex items-center gap-2"><Mail size={12} className="text-signal" /> Newsletter</p>
          <h2 className="headline text-2xl text-ink">Get the industry brief in your inbox</h2>
          <p className="mt-2 text-sm text-muted">
            Curated multifamily and real-estate headlines — choose a daily delivery or a weekly summary.
          </p>
        </div>

        <div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-md border border-[var(--line)] bg-bg2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-signal/40"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              type="email"
              placeholder="Email address"
              className="rounded-md border border-[var(--line)] bg-bg2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-signal/40"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mono text-[10px] tracking-[0.12em] text-muted">DELIVERY</span>
            {[
              { k: "daily", label: "Daily" },
              { k: "weekly", label: "Weekly summary" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setFreq(o.k)}
                className={`mono rounded-md border px-3 py-1.5 text-[11px] tracking-[0.04em] ${freq === o.k ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={status === "loading"}
            className="mono mt-3 w-full rounded-md bg-signal px-4 py-2.5 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-6"
          >
            {status === "loading" ? "SUBSCRIBING…" : "SUBSCRIBE"}
          </button>

          {status === "error" && <p className="mt-2 text-[12px] text-down">{msg}</p>}
        </div>
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
