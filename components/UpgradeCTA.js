"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

// Placeholder until Stripe Checkout is wired. When billing is live this will
// POST to /api/stripe/checkout and redirect to the Stripe-hosted session.
export default function UpgradeCTA() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function onClick() {
    setBusy(true);
    // TODO: const res = await fetch("/api/stripe/checkout", { method: "POST" });
    //       const { url } = await res.json(); window.location.href = url;
    setTimeout(() => {
      setNotice("Billing goes live shortly — checkout isn't connected yet.");
      setBusy(false);
    }, 400);
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={busy}
        className="mono inline-flex items-center gap-2 rounded-md bg-signal px-5 py-3 text-[13px] font-medium tracking-[0.06em] text-bg transition-all hover:brightness-110 disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} strokeWidth={2} />}
        Upgrade to Pro
      </button>
      {notice && <p className="mono mt-3 text-[12px] text-muted">{notice}</p>}
    </div>
  );
}
