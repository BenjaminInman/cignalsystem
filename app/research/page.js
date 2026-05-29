"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, Lock } from "lucide-react";

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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const ask = (q) => {
    const text = q.trim();
    if (!text) return;
    const answer = ANSWERS[text] || PREVIEW;
    setMessages((m) => [...m, { role: "user", text }, { role: "assistant", text: answer }]);
    setInput("");
  };

  return (
    <div className="pt-12 pb-10">
      <p className="kicker mb-3 flex items-center gap-2"><Sparkles size={12} className="text-signal" /> Intelligence Desk</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Research Assistant</h1>
      <p className="mt-3 max-w-2xl text-muted">Ask a research question and get a synthesized answer drawn from Cignal&apos;s market intelligence — leading vs. trailing indicators, cycle phase, and market-level reads.</p>

      <div className="card mt-8 flex h-[460px] flex-col overflow-hidden">
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles size={26} className="text-signal/70" />
              <p className="mt-4 max-w-sm text-sm text-muted">Ask anything about the market — or start with one of these:</p>
              <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-md border border-[var(--line)] bg-bg p-3 text-left text-[13px] text-ink transition-colors hover:border-signal/40 hover:bg-signal/5">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-signal/15 text-ink" : "border border-[var(--line)] bg-bg text-muted"}`}>
                {m.role === "assistant" && <span className="mono mb-1 block text-[10px] tracking-[0.16em] text-signal">CIGNAL DESK</span>}
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-[var(--line)] p-4">
          <div className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-bg px-3 py-2 focus-within:border-signal/50">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="Ask a research question…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted/60 outline-none"
            />
            <button onClick={() => ask(input)} className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-bg transition-opacity hover:opacity-90">
              <ArrowUp size={16} />
            </button>
          </div>
          <p className="mono mt-2 flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-muted">
            <Lock size={10} /> Preview — connects to a live intelligence model once provisioned.
          </p>
        </div>
      </div>
    </div>
  );
}
