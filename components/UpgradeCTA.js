"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

// Starts Stripe Checkout for an upgrade and redirects to the hosted session.
// `tier` defaults to "pro"; pass "cignal_plus" to sell the top tier.
export default function UpgradeCTA({ tier = "pro", label = "Upgrade to Pro" }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function onClick() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(data?.error || "Couldn't start checkout. Please try again.");
    } catch {
      setNotice("Couldn't start checkout. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={busy}
        className="mono inline-flex items-center gap-2 rounded-md bg-signal px-5 py-3 text-[13px] font-medium tracking-[0.06em] text-bg transition-all hover:brightness-110 disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} strokeWidth={2} />}
        {label}
      </button>
      {notice && <p className="mono mt-3 text-[12px] text-muted">{notice}</p>}
    </div>
  );
}
