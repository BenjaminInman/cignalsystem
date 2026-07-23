"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";

const ROLES = ["Owner", "Operator", "Investor", "Management firm", "Lender / Equity", "Other"];

export default function TrainingForm() {
  const vertical = useVertical();
  const [f, setF] = useState({ name: "", email: "", company: "", phone: "", role: "", portfolio: "", goals: "" });
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [err, setErr] = useState("");

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (state === "sending") return;
    if (!f.name.trim()) return setErr("Please enter your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setErr("Please enter a valid email address.");
    setErr("");
    setState("sending");
    try {
      const r = await fetch("/api/training", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Stamp the vertical the lead came in through so the admin panel can
        // segment applications by audience (Operator / Investor / …). The route
        // defaults to "multifamily" if this is omitted, which would mis-file
        // Investor-site leads — so pass it explicitly.
        body: JSON.stringify({ ...f, vertical: vertical?.slug || "multifamily" }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Something went wrong."); setState("error"); return; }
      setState("done");
    } catch {
      setErr("Something went wrong. Please try again.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-xl border border-signal/30 bg-signal/[0.06] p-6">
        <div className="flex items-center gap-2 text-signal">
          <Check size={18} />
          <p className="mono text-[12px] tracking-[0.12em]">APPLICATION RECEIVED</p>
        </div>
        <p className="mt-3 leading-relaxed text-muted">
          Thanks, {f.name.split(" ")[0] || "there"}. We&apos;ve got your application and will follow up about
          fit. Keep an eye on {f.email}.
        </p>
      </div>
    );
  }

  const input = "w-full rounded-lg border border-[var(--line)] bg-bg/50 px-4 py-3 text-sm text-ink placeholder:text-muted/60 outline-none transition-colors focus:border-signal/50";
  const label = "mono mb-1.5 block text-[10px] tracking-[0.14em] text-muted";

  return (
    <div className="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>NAME *</label>
          <input className={input} value={f.name} onChange={set("name")} placeholder="Jane Smith" />
        </div>
        <div>
          <label className={label}>EMAIL *</label>
          <input className={input} type="email" value={f.email} onChange={set("email")} placeholder="jane@company.com" />
        </div>
        <div>
          <label className={label}>COMPANY</label>
          <input className={input} value={f.company} onChange={set("company")} placeholder="Company name" />
        </div>
        <div>
          <label className={label}>PHONE</label>
          <input className={input} value={f.phone} onChange={set("phone")} placeholder="(optional)" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>YOUR ROLE</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setF((p) => ({ ...p, role: r }))}
                className={`mono rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors ${
                  f.role === r ? "border-signal/50 bg-signal/[0.08] text-signal" : "border-[var(--line)] text-muted hover:border-signal/30 hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>PORTFOLIO / MARKETS</label>
          <input className={input} value={f.portfolio} onChange={set("portfolio")} placeholder="e.g. 1,200 units across TX & FL" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>WHAT DO YOU WANT TO GET OUT OF THE TRAINING?</label>
          <textarea className={`${input} min-h-[110px] resize-y`} value={f.goals} onChange={set("goals")} placeholder="A sentence or two on what you're hoping to learn or solve." />
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-down">{err}</p>}

      <button
        onClick={submit}
        disabled={state === "sending"}
        className="mono group mt-5 inline-flex items-center gap-2 rounded-sm bg-signal px-6 py-3 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {state === "sending" ? "SUBMITTING…" : "SUBMIT APPLICATION"}
        {state !== "sending" && <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />}
      </button>
      <p className="mt-3 text-[12px] text-muted">Enrollment is selective. We&apos;ll review and follow up about fit — no payment required to apply.</p>
    </div>
  );
}
