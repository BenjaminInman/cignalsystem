"use client";

import { useState } from "react";
import { Sparkles, ArrowUp, Lock } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";

const SUGGESTIONS = [
  "Where are we in the multifamily cycle right now?",
  "Which markets show the strongest leading indicators?",
  "What's the risk from the debt maturity wall?",
  "Is rent growth bottoming?",
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

  const ask = async (q) => {
    const text = (q || "").trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    const id = Date.now();
    setThread((t) => [{ id, q: text, pending: true }, ...t]);
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text }),
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
    }
  };

  return (
    <div className="pt-12 pb-12">
      <p className="kicker mb-3 flex items-center gap-2"><Sparkles size={12} className="text-signal" /> Intelligence Desk</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Research Assistant</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Interrogate the market directly — ask a question and get a synthesized read drawn from Cignal&apos;s intelligence:
        leading vs. trailing indicators, cycle phase, and market-level signals.
      </p>

      {/* Prominent ask */}
      <div className="mt-12 flex flex-col items-center text-center">
        <h2 className="headline text-2xl text-ink md:text-3xl">Ask a Question</h2>
        <p className="mt-2 max-w-xl text-muted">Pose anything about the cycle, the signals, or a specific market.</p>

        <div className="mt-6 w-full max-w-2xl">
          <div className="pulse-gold rounded-2xl border border-signal/40 bg-signal/[0.05] p-2">
            <div className="flex items-center gap-3 rounded-xl bg-bg2 px-4 py-3.5">
              <Sparkles size={20} className="shrink-0 text-signal" strokeWidth={1.8} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(input)}
                disabled={loading}
                placeholder="Ask a question…"
                className="flex-1 bg-transparent text-base text-ink placeholder:text-muted/60 outline-none disabled:opacity-60"
              />
              <button onClick={() => ask(input)} disabled={loading} className="mono flex shrink-0 items-center gap-1.5 rounded-md bg-signal px-4 py-2.5 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50">
                {loading ? "…" : <>ASK <ArrowUp size={14} /></>}
              </button>
            </div>
          </div>

          {/* suggestions */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} disabled={loading} className="rounded-full border border-[var(--line)] bg-bg px-4 py-2 text-[13px] text-muted transition-colors hover:border-signal/40 hover:text-ink disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* thread */}
      {thread.length > 0 && (
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {thread.map((item) => (
            <div key={item.id} className="card p-5">
              <p className="font-medium text-ink">{item.q}</p>
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <span className="mono text-[10px] tracking-[0.16em] text-signal">CIGNAL DESK</span>
                {item.pending ? (
                  <p className="mono mt-2 animate-pulse text-[12px] text-muted">Analyzing live signals…</p>
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
        <Lock size={11} /> Cignal Pro — answers are grounded in your live indicators, signals, and migration data.
      </p>
    </div>
  );
}
