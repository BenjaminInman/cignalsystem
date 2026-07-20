"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ArrowUp, ArrowUpRight, Lock } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import CanaryMark from "@/components/CanaryMark";

const SUGGESTIONS = [
  "Where are we in the multifamily cycle right now?",
  "What are the leading indicators saying versus the lagging ones?",
  "How does Austin look right now — rent, jobs, and vacancy?",
  "Which markets rank highest for in-migration?",
];

export default function ResearchPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "research")) return <ComingSoonInline vertical={vertical} title="Research" />;
  return <ResearchInner />;
}

function ResearchInner() {
  const [thread, setThread] = useState([]); // [{ id, q, a, error, upgrade, pending }]
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (q, focus) => {
    const text = (q || "").trim();
    if (!text || loading) return;
    setInput(text); // keep the question visible in the box while Canary works
    setLoading(true);
    const id = Date.now();
    setThread((t) => [{ id, q: text, pending: true }, ...t]);
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, ...(focus || {}) }),
      });
      const d = await r.json().catch(() => ({}));
      setThread((t) =>
        t.map((it) =>
          it.id === id
            ? { id, q: text, a: r.ok ? d.answer : null, error: r.ok ? null : d.error || "Something went wrong. Please try again.", upgrade: d.upgrade }
            : it
        )
      );
    } catch {
      setThread((t) => t.map((it) => (it.id === id ? { id, q: text, error: "Network error. Please try again." } : it)));
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("ask");
    if (p) {
      ask(p, { metro: sp.get("m") || undefined, cbsa: sp.get("c") || undefined });
      window.history.replaceState(null, "", "/research");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answerRef = useRef(null);
  useEffect(() => {
    if (thread.length > 0 && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [thread.length]);

  return (
    <div className="pt-12 pb-12">
      {/* top zone — Canary lives here as one unit: intro + ask on the left,
          how-to on the right. Anatomy is a separate destination, so it sits
          below both rather than splitting the Canary story. */}
      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12">

        {/* LEFT: identity, intro, and the ask */}
        <div>
          <p className="kicker mb-3 flex items-center gap-2"><CanaryMark size={13} className="text-signal" /> Intelligence Desk</p>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-signal">
              <CanaryMark size={30} className="text-bg" title="Canary" />
            </span>
            <h1 className="headline text-4xl text-ink md:text-5xl">Canary</h1>
          </div>
          <p className="mt-5 text-muted">
            Canary is the original leading indicator &mdash; the signal that sounds before the trouble shows.
            Ask it where the multifamily cycle is turning, how the leading data compares to the lagging, and how
            the major markets are moving. It reads Cignal&apos;s live intelligence and tells you plainly when a
            question is outside its view.
          </p>

          {/* the ask box, directly under the intro */}
          <div className="mt-7">
            <p className="mono mb-3 text-[11px] tracking-[0.2em] text-signal">ASK CANARY</p>
            <div className={`rounded-2xl border p-2 transition-colors ${loading ? "border-signal/60 bg-signal/[0.08]" : "pulse-gold border-signal/40 bg-signal/[0.05]"}`}>
              <div className="flex items-center gap-3 rounded-xl bg-bg2 px-5 py-4">
                <CanaryMark size={22} className={`shrink-0 text-signal ${loading ? "canary-bob" : ""}`} />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask(input)}
                  disabled={loading}
                  placeholder="Ask a question…"
                  className="flex-1 bg-transparent text-base text-ink placeholder:text-muted/60 outline-none disabled:opacity-90"
                />
                <button onClick={() => ask(input)} disabled={loading} className="mono flex shrink-0 items-center gap-1.5 rounded-md bg-signal px-5 py-3 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50">
                  {loading ? "…" : <>ASK <ArrowUp size={14} /></>}
                </button>
              </div>
              {loading && (
                <div className="flex items-center gap-2.5 px-5 py-3">
                  <CanaryMark size={16} className="canary-bob text-signal" />
                  <span className="mono text-[12px] tracking-[0.04em] text-signal">Canary is reading the live signals — your answer forms below &darr;</span>
                </div>
              )}
            </div>

            {thread.length === 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} disabled={loading} className="rounded-full border border-[var(--line)] bg-bg px-4 py-2 text-left text-[13px] text-muted transition-colors hover:border-signal/40 hover:text-ink disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: how to use Canary — part of the Canary story, kept beside it */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-signal/60" />
            <h3 className="mono text-[12px] tracking-[0.2em] text-signal">HOW TO USE CANARY</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Canary is a grounded analyst, not a web search &mdash; it reads Cignal&apos;s live market
            intelligence and stays focused on the multifamily cycle. The more specific and on-cycle your
            question, the sharper the read; when something falls outside its view, it&apos;ll tell you
            plainly rather than guess.
          </p>

          <div className="mt-5 space-y-4">
            <div className="card p-5">
              <p className="mono mb-3 text-[10px] tracking-[0.16em] text-up">WORKS WELL</p>
              <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-muted marker:text-up/60">
                <li>Where the cycle sits, and which phase the data points to</li>
                <li>What the leading indicators signal &mdash; and whether the lagging ones confirm</li>
                <li>How a major market is moving &mdash; rent, jobs, and vacancy</li>
                <li>A national indicator&apos;s latest value and which way it&apos;s moving</li>
                <li>The composite signal and how much conviction is behind it</li>
                <li>Which markets are leading on in-migration and growth</li>
              </ul>
            </div>
            <div className="card p-5">
              <p className="mono mb-3 text-[10px] tracking-[0.16em] text-muted">OUTSIDE ITS SCOPE</p>
              <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-muted marker:text-muted/50">
                <li>Cap rates, rents, or pricing for a specific property or deal</li>
                <li>Smaller submarkets or ZIP-level detail beyond the major metros</li>
                <li>General web search, headlines, or historical events</li>
                <li>Exact forecasts &mdash; it reads today&apos;s signals, it won&apos;t invent future numbers</li>
              </ul>
            </div>
          </div>

          <p className="mono mt-5 text-[11px] leading-relaxed text-muted">
            Tip: be specific and frame it around the cycle or a named indicator. Tap an example to see the shape of a question that lands.
          </p>
        </div>
      </div>

      {/* Anatomy — full-width band spanning both columns, the hand-off to a
          separate section. Always present, so it doesn't vanish once you ask. */}
      <Link href="/research/anatomy" className="group mt-10 block overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-r from-signal/[0.10] via-signal/[0.04] to-transparent p-6 transition-colors hover:border-signal/55 md:p-7">
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-signal/40 bg-signal/[0.08]">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#F5B544" strokeWidth="1.6">
                <path d="M12 3 L15 9 L9 9 Z" /><path d="M21 12 L15 15 L15 9 Z" />
                <path d="M12 21 L9 15 L15 15 Z" /><path d="M3 12 L9 9 L9 15 Z" />
              </svg>
            </span>
            <div>
              <p className="mono text-[10px] tracking-[0.22em] text-signal">ANATOMY</p>
              <p className="mt-1.5 text-lg font-semibold text-ink">How a headline number is built</p>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
                CPI, GDP, AIMI, the yield spread &mdash; pulled apart to show what&apos;s inside, and which parts lead the cycle while others lag.
              </p>
            </div>
          </div>
          <ArrowUpRight size={22} className="shrink-0 text-signal/70 transition-colors group-hover:text-signal" />
        </div>
      </Link>

      {/* thread */}
      {thread.length > 0 && (
        <div className="mt-10 space-y-4">
          <div ref={answerRef} className="scroll-mt-24" />
          {thread.map((item) => (
            <div key={item.id} className="card p-5">
              <p className="font-medium text-ink">{item.q}</p>
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <span className="mono text-[10px] tracking-[0.16em] text-signal">CANARY</span>
                {item.pending ? (
                  <div className="mt-2 flex items-center gap-2">
                    <CanaryMark size={15} className="canary-bob text-signal" />
                    <span className="mono text-[12px] text-signal">Canary is reading the live signals…</span>
                  </div>
                ) : item.error ? (
                  <div className="mt-1">
                    <p className="text-sm leading-relaxed text-muted">{item.error}</p>
                    {item.upgrade && (
                      <a href="/upgrade?page=research" className="mono mt-2 inline-block rounded-md bg-signal/15 px-3 py-1.5 text-[12px] tracking-[0.06em] text-signal hover:bg-signal/25">
                        UPGRADE TO PRO
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{item.a}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mono mt-10 flex items-center justify-center gap-1.5 text-[11px] tracking-[0.06em] text-muted">
        <Lock size={11} /> Cignal Pro — Canary is grounded in Cignal&apos;s live market intelligence.
      </p>
    </div>
  );
}
