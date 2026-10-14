"use client";

// Opens Stripe Checkout as soon as the page loads. Used right after sign-up
// when the visitor already chose Pro, so there's no extra click.
import { useEffect, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import UpgradeCTA from "@/components/UpgradeCTA";

export default function AutoCheckout() {
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tier: "pro" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.url) window.location.href = d.url;
        else setError(d?.error || "Couldn't open checkout.");
      })
      .catch(() => setError("Couldn't open checkout."));
  }, []);

  return (
    <div className="mx-auto max-w-xl pt-24 pb-24 text-center fade-up">
      <ol className="mono mx-auto mb-10 grid max-w-sm grid-cols-2 gap-2 text-[11px] tracking-[0.06em]">
        <li className="rounded-md border border-up/40 bg-up/10 px-3 py-2 text-up">STEP 1 · DONE</li>
        <li className="rounded-md border border-signal/50 bg-signal/10 px-3 py-2 text-signal">STEP 2 · CHECKOUT</li>
      </ol>
      {error ? (
        <>
          <h1 className="headline text-3xl text-ink">Your account is ready.</h1>
          <p className="mt-3 text-muted">{error} Click below to continue to secure checkout.</p>
          <div className="mt-8 flex justify-center"><UpgradeCTA label="Continue to checkout" /></div>
        </>
      ) : (
        <>
          <Loader2 size={28} className="mx-auto animate-spin text-signal" />
          <h1 className="headline mt-6 text-3xl text-ink">Account created. Opening secure checkout…</h1>
          <p className="mono mt-4 inline-flex items-center gap-1.5 text-[12px] text-muted">
            <Lock size={12} /> Payments are processed by Stripe
          </p>
        </>
      )}
    </div>
  );
}
