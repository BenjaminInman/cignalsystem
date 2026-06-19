"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import SignalCard from "@/components/SignalCard";
import YieldCurve from "@/components/YieldCurve";
import { fetchSignals } from "@/lib/signals";
import { createClient } from "@/lib/supabase/client";

const FILTERS = ["All Signals", "Bull", "Bear", "Neutral"];
const MAP = { Bull: "bull", Bear: "bear", Neutral: "neutral" };

export default function SignalsPage() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(false);
  const [f, setF] = useState("All Signals");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMember(!!data.user));
    fetchSignals().then((s) => {
      setSignals(s);
      setLoading(false);
    });
  }, []);

  const rows = signals.filter((s) => f === "All Signals" || s.tone === MAP[f]);
  const counts = {
    bull: signals.filter((s) => s.tone === "bull").length,
    bear: signals.filter((s) => s.tone === "bear").length,
    neutral: signals.filter((s) => s.tone === "neutral").length,
  };

  return (
    <div className="pt-12 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="mono mb-3 flex items-center gap-2 text-[11px] tracking-[0.16em] text-signal">
            <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" /> LIVE FEED · From first-print data
          </p>
          <h1 className="headline text-4xl text-ink md:text-5xl">Market Signals</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Signals derived from leading and trailing indicators — computed on
            revision-0 first prints, refreshed daily.
          </p>
        </div>
        <div className="flex gap-3">
          <Tile n={counts.bull} label="Bullish" tone="#5FB97C" />
          <Tile n={counts.bear} label="Bearish" tone="#E5634D" />
          <Tile n={counts.neutral} label="Watching" tone="#E8B04B" />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <button key={x} onClick={() => setF(x)} className={`mono rounded-md border px-4 py-2 text-[12px] tracking-[0.04em] ${f === x ? "border-signal/40 bg-signal/10 text-signal" : "border-[var(--line)] text-muted hover:text-ink"}`}>{x}</button>
        ))}
      </div>

      {loading ? (
        <p className="mono mt-10 text-[13px] text-muted">Loading signals…</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {rows.map((s) => <SignalCard key={s.title} s={s} />)}
          </div>

          {!member && (
            <div className="card mt-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal/10">
                  <Lock size={15} className="text-signal" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="font-semibold text-ink">You&apos;re seeing the public teaser feed</p>
                  <p className="mt-1 text-sm text-muted">Create a free account to unlock the full live signal feed — every market signal, not just the highlights.</p>
                </div>
              </div>
              <Link href="/register" className="mono shrink-0 rounded-md bg-signal px-4 py-2.5 text-[13px] font-medium tracking-[0.06em] text-bg transition-all hover:brightness-110">
                Unlock full feed →
              </Link>
            </div>
          )}
        </>
      )}

      <YieldCurve />
    </div>
  );
}

function Tile({ n, label, tone }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-3" style={{ borderColor: `${tone}40` }}>
      <span className="headline text-2xl" style={{ color: tone }}>{n}</span>
      <span className="mono text-[10px] tracking-[0.1em] text-muted">{label}</span>
    </div>
  );
}
