"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

// Opens the Stripe billing portal (update card, view invoices, cancel).
// Drop onto any account/settings surface for active subscribers.
export default function ManageBillingButton({ label = "Manage billing" }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function onClick() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(data?.error || "Couldn't open billing. Please try again.");
    } catch {
      setNotice("Couldn't open billing. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={busy}
        className="mono inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-4 py-2.5 text-[12px] tracking-[0.06em] text-ink transition-all hover:border-signal disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} strokeWidth={1.8} />}
        {label}
      </button>
      {notice && <p className="mono mt-2 text-[11px] text-muted">{notice}</p>}
    </div>
  );
}
