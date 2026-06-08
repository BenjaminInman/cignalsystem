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

const ANSWERS = {
  "Where are we in the multifamily cycle right now?":
    "The composite signal reads BULLISH at 60% confidence — consistent with Phase II (Expansion). Leading indicators (permits down 6.1%, absorption up 1.2%) point to tightening supply meeting steady demand, while trailing indicators like cap rates (+12bps) still reflect the prior repricing. Net read: fundamentals are improving faster than the lagging capital-markets data suggests.",
  "Which markets show the strongest leading indicators?":
    "Austin (88), Nashville (84), and Atlanta (79) lead on the fundamentals that move first — rent growth, absorption, and in-migration. The Sun Belt broadly screens strongest; Gateway markets like San Francisco (52) and Chicago (45) lag on both demand and pricing power.",
  "What's the risk from the debt maturity wall?":
    "Roughly $32B in floating-rate multifamily debt matures in H2 2025. 2021-vintage acquisitions refinancing at current rates may need 15–25% equity recapitalization, creating forced-seller risk — and an entry opportunity for well-capitalized buyers. Treat it as a leading risk signal for distressed pricing into late 2025–2026.",
  "Is rent growth bottoming?":
    "Effective rent growth sits at +3.8% YoY, down from a +14.6% peak in Q3 2022 — but the rate of deceleration is slowing, suggesting a floor near +3.0–3.5%. With permits falling and absorption rising, the leading indicators argue the trough is close rather than ahead.",
};

const PREVIEW =
  "Full natural-language research goes live once your account is provisioned and the intelligence model is connected. For now, try one of the suggested questions above for a sample of the analysis.";

export default function ResearchPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "research")) return <ComingSoonInline vertical={vertical} title="Research" />;
  return <ResearchInner />;
}

function ResearchInner() {
  const [thread, setThread] = useState([]); // [{ q, a }]
  const [input, setInput] = useState("");

  const ask = (q) => {
    const text = (q || "").trim();
    if (!text) return;
    const a = ANSWERS[text] || PREVIEW;
    setThread((t) => [{ q: text, a }, ...t]);
    setInput("");
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
        <h2 className="headline text-2xl text-ink md:text-3xl">Ask a Research Question</h2>
        <p className="mt-2 max-w-xl text-muted">Pose anything about the cycle, the signals, or a specific market.</p>

        <div className="mt-6 w-full max-w-2xl">
          <div className="pulse-green rounded-2xl border border-up/40 bg-up/[0.05] p-2">
            <div className="flex items-center gap-3 rounded-xl bg-bg2 px-4 py-3.5">
              <Sparkles size={20} className="shrink-0 text-up" strokeWidth={1.8} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(input)}
                placeholder="Ask a research question…"
                className="flex-1 bg-transparent text-base text-ink placeholder:text-muted/60 outline-none"
              />
              <button onClick={() => ask(input)} className="mono flex shrink-0 items-center gap-1.5 rounded-md bg-up px-4 py-2.5 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90">
                ASK <ArrowUp size={14} />
              </button>
            </div>
          </div>

          {/* suggestions */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full border border-[var(--line)] bg-bg px-4 py-2 text-[13px] text-muted transition-colors hover:border-up/40 hover:text-ink">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* thread */}
      {thread.length > 0 && (
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {thread.map((item, i) => (
            <div key={i} className="card p-5">
              <p className="font-medium text-ink">{item.q}</p>
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <span className="mono text-[10px] tracking-[0.16em] text-signal">CIGNAL DESK</span>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mono mt-10 flex items-center justify-center gap-1.5 text-[11px] tracking-[0.06em] text-muted">
        <Lock size={11} /> Preview — connects to a live intelligence model once provisioned.
      </p>
    </div>
  );
}
