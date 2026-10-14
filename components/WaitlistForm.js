"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

// Email capture for a vertical that isn't live yet. Posts to /api/waitlist.
export default function WaitlistForm({ vertical, source = "hub", compact = false }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | busy | done | error
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setState("busy");
    setMsg("");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, vertical, source }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Couldn't save that. Please try again.");
      setState("done");
    } catch (err) {
      setState("error");
      setMsg(err.message);
    }
  }

  if (state === "done") {
    return (
      <p className="mono flex items-center gap-2 text-[12px] tracking-[0.06em] text-signal">
        <Check size={14} /> YOU&apos;RE ON THE LIST — WE&apos;LL EMAIL YOU AT LAUNCH
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "w-full" : "w-full max-w-md"}>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`wl-${vertical}`}>Email address</label>
        <input
          id={`wl-${vertical}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="min-w-0 flex-1 rounded-sm border border-[var(--line-strong)] bg-bg/70 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-signal/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="mono inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-signal/40 px-3.5 py-2.5 text-[11px] tracking-[0.08em] text-signal transition-colors hover:bg-signal/10 disabled:opacity-60"
        >
          {state === "busy" ? <Loader2 size={13} className="animate-spin" /> : <>EARLY ACCESS <ArrowRight size={13} /></>}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-down">{msg}</p>}
    </form>
  );
}
