"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Activity, BarChart3, LineChart, Radio, BookOpen, Briefcase } from "lucide-react";

const SUITE = [
  { name: "Indicators", icon: Activity, desc: "Leading & trailing metrics across every major metro." },
  { name: "Market Maps", icon: BarChart3, desc: "Fundamentals scored and ranked across 42 MSAs." },
  { name: "Forecasts", icon: LineChart, desc: "5-year forward projections and scenario models." },
  { name: "Signals", icon: Radio, desc: "Synthesized alerts when a market shifts cycle phase." },
  { name: "Research", icon: BookOpen, desc: "In-depth briefings that turn data into a thesis." },
  { name: "Portfolio", icon: Briefcase, desc: "Your assets, scored against live market position." },
];

export default function DashboardPage() {
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setNotice("Accounts aren’t live yet — the subscriber terminal is being provisioned. Check back soon.");
  };

  return (
    <div className="pt-12 pb-16">
      <p className="kicker mb-3 flex items-center gap-2">
        <Lock size={12} className="text-signal" /> Access · Subscriber Terminal
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Unlock the Cignal terminal</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Create an account or sign in to access the full intelligence suite — indicators, market maps,
        forecasts, signals, research, and portfolio tracking.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* AUTH CARD */}
        <div className="card p-7">
          <div className="mb-6 inline-flex rounded-md border border-[var(--line)] p-1">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setNotice(""); }}
                className={`mono rounded px-4 py-2 text-[12px] tracking-[0.06em] transition-colors ${
                  mode === m ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"
                }`}
              >
                {m === "login" ? "Log In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="FULL NAME" type="text" placeholder="Jane Investor" />
            )}
            <Field label="EMAIL" type="email" placeholder="you@firm.com" />
            <Field label="PASSWORD" type="password" placeholder="••••••••" />

            <button
              type="submit"
              className="mono mt-2 w-full rounded-sm bg-signal py-3 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90"
            >
              {mode === "login" ? "SIGN IN →" : "CREATE ACCOUNT →"}
            </button>
          </form>

          {notice && (
            <p className="mono mt-4 rounded-sm border border-signal/30 bg-signal/10 p-3 text-[11px] leading-relaxed text-signal">
              {notice}
            </p>
          )}

          <p className="mono mt-5 text-center text-[11px] text-muted">
            {mode === "login" ? (
              <>No account yet?{" "}
                <button onClick={() => setMode("signup")} className="text-signal hover:underline">Create one</button>
              </>
            ) : (
              <>Already a subscriber?{" "}
                <button onClick={() => setMode("login")} className="text-signal hover:underline">Sign in</button>
              </>
            )}
          </p>
        </div>

        {/* WHAT YOU UNLOCK */}
        <div>
          <p className="kicker mb-4">What you unlock</p>
          <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {SUITE.map((s) => (
              <div key={s.name} className="relative bg-bg2 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/10">
                    <s.icon size={15} className="text-signal" strokeWidth={1.8} />
                  </span>
                  <Lock size={13} className="text-muted" />
                </div>
                <h3 className="font-semibold text-ink">{s.name}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="mono mt-4 text-[11px] tracking-[0.06em] text-muted">
            Public preview available on the <Link href="/" className="text-signal hover:underline">Home</Link> page. Full access requires an account.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, placeholder }) {
  return (
    <label className="block">
      <span className="kicker mb-2 block">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="mono w-full rounded-sm border border-[var(--line)] bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition-colors focus:border-signal/50"
      />
    </label>
  );
}
