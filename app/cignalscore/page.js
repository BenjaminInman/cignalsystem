"use client";

import { useState, useEffect } from "react";
import { Lock, ShieldCheck, ArrowRight, ArrowLeft, ScanLine, Check, FileWarning, Mail } from "lucide-react";
import { QUESTIONS, DIMS, BIAS_COPY, bandBlurb } from "@/lib/cignalscore";

// Platform ascension ladder. Training tiers (Recon/Special Ops/Commander) get
// wired in once those pages exist; for now we ascend free -> Pro.
const PLATFORM = [
  { key: "free", name: "Cignal Dashboard", price: "Free", line: "Indicators, market maps, and indices — the core terminal to start reading the cycle." },
  { key: "pro", name: "Cignal Pro", price: "$79/mo", line: "Everything in Free, plus forecasts, the research desk, portfolio, and community." },
];

function platformHeadline(level, score) {
  return {
    1: `You scored ${score}. Start seeing the signals you're missing — free.`,
    2: `You scored ${score}. Get the live signals in front of you every day.`,
    3: `You scored ${score}. You read the cycle — now operate on live data.`,
    4: `You scored ${score}. Few reach this. Cignal Pro keeps you ahead in real time.`,
  }[level];
}

const TONE_HEX = { up: "#5FB97C", signal: "#F5B544", down: "#E5634D" };
const TONE_TEXT = { up: "text-up", signal: "text-signal", down: "text-down" };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Copy with apostrophes lives here so it renders as expressions (lint-safe).
const COPY = {
  headA: "What most investors can't see,",
  headB: "you're about to.",
  intro: "The market cycle leaves signals everywhere — leading and trailing. Most operators read the wrong ones, too late. This is a real test of how clearly you read the cycle, and it pinpoints the single blind spot costing you the most. Most operators don't break Cycle Reader.",
  introNote: "Free to take. Your score and blind-spot report reveal the moment you finish.",
  gateHead: "Your Cignal Score has been calculated.",
  gateSub: "Enter your email to unlock your results instantly — your score, your full signal breakdown, and the single blind spot costing you most.",
  gateMicro: "We'll use this to send you cycle intelligence and your ascension path. No spam. Unsubscribe anytime.",
};

export default function CignalScorePage() {
  const [stage, setStage] = useState("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [source, setSource] = useState("website");

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const s = p.get("source") || p.get("utm_source");
      if (s) setSource(s.slice(0, 120));
    } catch {}
  }, []);

  const emailValid = EMAIL_RE.test(email.trim());

  function choose(oi) {
    setAnswers((a) => ({ ...a, [idx]: oi }));
    setTimeout(() => {
      if (idx < QUESTIONS.length - 1) setIdx((i) => i + 1);
      else setStage("gate");
    }, 220);
  }

  async function declassify() {
    setTouched(true);
    setError("");
    if (!emailValid || loading) return;
    setLoading(true);
    try {
      const r = await fetch("/api/cignalscore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, email: email.trim(), source }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Something went wrong. Please try again.");
      } else {
        setResult(d);
        setStage("results");
        setTimeout(() => setRevealed(true), 420);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pt-10 pb-16 md:pt-14">
      {stage === "intro" && <Intro onStart={() => setStage("quiz")} />}
      {stage === "quiz" && (
        <Quiz idx={idx} answers={answers} onChoose={choose} onBack={() => (idx > 0 ? setIdx(idx - 1) : setStage("intro"))} />
      )}
      {stage === "gate" && (
        <Gate
          email={email} setEmail={setEmail} touched={touched} emailValid={emailValid}
          loading={loading} error={error} onSubmit={declassify}
          onBack={() => { setStage("quiz"); setIdx(QUESTIONS.length - 1); }}
        />
      )}
      {stage === "results" && result && <Results result={result} revealed={revealed} />}
    </div>
  );
}

function Intro({ onStart }) {
  const chips = ["18 QUESTIONS", "~5 MINUTES", "NO COST"];
  return (
    <div className="fade-up">
      <p className="kicker">Cignal Score™ · Cycle Intelligence Assessment</p>
      <h1 className="headline mt-5 text-4xl text-ink md:text-6xl">
        {COPY.headA}
        <br />
        <span className="text-signal">{COPY.headB}</span>
      </h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">{COPY.intro}</p>
      <div className="mono mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] tracking-[0.12em] text-muted">
        {chips.map((c) => <span key={c}>{c}</span>)}
        <span className="text-signal">BUILT ON THE 4 PHASE FRAMEWORK</span>
      </div>
      <button onClick={onStart} className="mono mt-9 inline-flex items-center gap-2 rounded-md bg-signal px-6 py-3 text-[13px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90">
        Begin assessment <ArrowRight size={16} />
      </button>
      <p className="mt-4 text-[12px] text-muted/70">{COPY.introNote}</p>
    </div>
  );
}

function Quiz({ idx, answers, onChoose, onBack }) {
  const qq = QUESTIONS[idx];
  const selected = answers[idx];
  const pct = Math.round((idx / QUESTIONS.length) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="kicker">File {String(idx + 1).padStart(2, "0")} / {QUESTIONS.length}</span>
        <span className="kicker">{DIMS[qq.dim]}</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full bg-signal transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <h2 key={idx} className="fade-up headline mt-9 text-2xl leading-snug text-ink md:text-[28px]">{qq.q}</h2>

      <div className="mt-7 grid gap-2.5">
        {qq.options.map((o, oi) => {
          const isSel = selected === oi;
          return (
            <button
              key={oi}
              onClick={() => onChoose(oi)}
              className={`flex items-center gap-3.5 rounded-lg border px-4 py-4 text-left text-[15px] leading-snug transition-colors ${
                isSel ? "border-signal bg-signal/[0.08] text-ink" : "border-[var(--line)] bg-bg2 text-ink hover:border-signal/40 hover:bg-signal/[0.04]"
              }`}
            >
              <span className={`mono flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] ${isSel ? "bg-signal text-bg" : "border border-[var(--line-strong)] text-muted"}`}>
                {isSel ? <Check size={13} /> : String.fromCharCode(65 + oi)}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>

      <button onClick={onBack} className="mono mt-7 inline-flex items-center gap-2 rounded-md border border-[var(--line-strong)] px-4 py-2 text-[11px] tracking-[0.1em] text-muted transition-colors hover:text-ink">
        <ArrowLeft size={14} /> Back
      </button>
    </div>
  );
}

function Gate({ email, setEmail, touched, emailValid, loading, error, onSubmit, onBack }) {
  return (
    <div className="fade-up">
      <p className="kicker flex items-center gap-2 text-up"><ShieldCheck size={12} /> Assessment complete</p>
      <h2 className="headline mt-4 text-3xl text-ink md:text-[40px]">{COPY.gateHead}</h2>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">{COPY.gateSub}</p>

      <div className="card relative mt-7 overflow-hidden p-6">
        <span className="mono absolute right-4 top-4 flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-down"><Lock size={11} /> CLASSIFIED</span>
        <p className="kicker">Cignal Score</p>
        <div className="mt-2 mb-5 flex items-baseline gap-2">
          <span className="redact headline text-5xl">00</span>
          <span className="headline text-3xl text-muted/40">/ 100</span>
        </div>
        <p className="kicker">Clearance Level</p>
        <p className="redact mt-2 mb-5 inline-block text-xl">████████████</p>
        <p className="kicker">Dominant Blind Spot</p>
        <p className="redact mt-2 inline-block text-xl">██████████████</p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="you@company.com"
            className={`w-full rounded-md border bg-bg px-4 py-3.5 pl-11 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-signal ${
              touched && !emailValid ? "border-down" : "border-[var(--line-strong)]"
            }`}
          />
        </div>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="mono inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-signal px-6 py-3.5 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ScanLine size={16} /> {loading ? "Declassifying…" : "Declassify results"}
        </button>
      </div>
      {touched && !emailValid && <p className="mono mt-2.5 text-[12px] text-down">Enter a valid email to unlock your file.</p>}
      {error && <p className="mono mt-2.5 text-[12px] text-down">{error}</p>}
      <p className="mt-3.5 max-w-md text-[12px] leading-relaxed text-muted/70">{COPY.gateMicro}</p>

      <button onClick={onBack} className="mono mt-6 inline-flex items-center gap-2 rounded-md border border-[var(--line-strong)] px-4 py-2 text-[11px] tracking-[0.1em] text-muted transition-colors hover:text-ink">
        <ArrowLeft size={14} /> Back to questions
      </button>
    </div>
  );
}

function Results({ result, revealed }) {
  const { score, band, dominant_bias, dimension_scores } = result;
  const bias = dominant_bias ? BIAS_COPY[dominant_bias] : null;
  const recPlatform = band.level >= 3 ? "pro" : "free";

  return (
    <div className="fade-up">
      <p className="kicker flex items-center gap-2 text-up"><ShieldCheck size={12} /> File declassified · access granted</p>

      <div className="mt-6 flex flex-wrap items-center gap-7">
        <ScoreRing score={score} tone={band.tone} revealed={revealed} />
        <div>
          <p className="kicker">Clearance Level {band.level} of 4</p>
          <p className={`headline text-4xl md:text-5xl ${TONE_TEXT[band.tone]}`}>{band.label}</p>
          <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted">{bandBlurb(band.level)}</p>
        </div>
      </div>

      {/* Signal breakdown */}
      <div className="mt-9 border-t border-[var(--line)] pt-7">
        <p className="kicker">Signal breakdown</p>
        <div className="mt-5 grid gap-4">
          {dimension_scores.map((d, i) => (
            <div key={d.key}>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="text-ink">{d.name}</span>
                <span className={`mono ${TONE_TEXT[d.tone]}`}>{d.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: revealed ? `${d.pct}%` : "0%",
                    background: TONE_HEX[d.tone],
                    transition: `width 0.8s cubic-bezier(.2,.7,.2,1) ${i * 0.08}s`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dominant blind spot */}
      {bias && (
        <div className="mt-8 rounded-xl border border-down/40 bg-down/[0.05] p-6">
          <p className="kicker flex items-center gap-2 text-down"><FileWarning size={12} /> Your dominant blind spot</p>
          <p className="headline mt-2.5 text-2xl text-ink">{bias.name}</p>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">{bias.body}</p>
        </div>
      )}

      {/* Ascension path — platform (training tiers come later) */}
      <div className="mt-8 rounded-xl border border-signal/30 bg-gradient-to-b from-signal/[0.06] to-transparent p-6 md:p-7">
        <p className="kicker">Your next move</p>
        <h3 className="headline mt-3 text-2xl leading-snug text-ink">{platformHeadline(band.level, score)}</h3>
        <div className="mt-5 grid gap-2.5">
          {PLATFORM.map((t) => {
            const rec = t.key === recPlatform;
            return (
              <div key={t.key} className={`flex items-center gap-4 rounded-lg border p-4 ${rec ? "border-signal bg-signal/[0.07]" : "border-[var(--line)] bg-bg2"}`}>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-lg text-ink">{t.name}</span>
                    {rec && <span className="mono rounded bg-signal px-1.5 py-0.5 text-[9px] tracking-[0.14em] text-bg">RECOMMENDED</span>}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-muted">{t.line}</p>
                </div>
                <span className={`mono text-[15px] ${rec ? "text-signal" : "text-ink"}`}>{t.price}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <a href="/register" className={`mono inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-[13px] tracking-[0.08em] transition-colors ${recPlatform === "free" ? "bg-signal text-bg hover:opacity-90" : "border border-signal/40 text-signal hover:bg-signal hover:text-bg"}`}>
            <Check size={15} /> Create your free account
          </a>
          <a href="/upgrade" className={`mono inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-[13px] tracking-[0.08em] transition-colors ${recPlatform === "pro" ? "bg-signal text-bg hover:opacity-90" : "border border-signal/40 text-signal hover:bg-signal hover:text-bg"}`}>
            Go Pro — $79/mo <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <p className="mono mt-6 text-[11px] tracking-[0.06em] text-muted/60">RESULTS UNLOCKED // LEAD RECORDED // STATUS: ASSESSMENT USER</p>
    </div>
  );
}

function ScoreRing({ score, tone, revealed }) {
  const r = 52, circ = 2 * Math.PI * r;
  const off = circ - (revealed ? score / 100 : 0) * circ;
  const hex = TONE_HEX[tone];
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="66" cy="66" r={r} fill="none" stroke={hex} strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 66 66)" style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="headline text-5xl" style={{ color: hex }}>{revealed ? score : 0}</div>
          <div className="mono mt-0.5 text-[9px] tracking-[0.18em] text-muted">/ 100</div>
        </div>
      </div>
    </div>
  );
}
