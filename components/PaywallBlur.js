"use client";

// Wrap any feature to make it Pro-only with a blurred teaser + upgrade overlay.
// Pro users (and admins) see the real thing; everyone else sees it blurred
// behind an "Upgrade to Pro" card.
//
//   <PaywallBlur page="indicators" title="Indicator Comparison" blurb="...">
//     <IndicatorCompare />
//   </PaywallBlur>
//
// Note: this is a visual tease — the underlying component still mounts, so its
// data technically loads in the browser even while blurred. For a hard lock
// (no data sent to free users), gate it server-side instead. Good enough for a
// "look what you're missing" upsell.

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PaywallBlur({ page = "indicators", title = "Pro feature", blurb, children }) {
  const [status, setStatus] = useState("loading"); // loading | allowed | locked

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        if (active) setStatus("locked");
        return;
      }
      supabase
        .from("profiles")
        .select("is_admin, tier")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!active) return;
          setStatus(data?.is_admin || data?.tier === "pro" ? "allowed" : "locked");
        });
    });
    return () => {
      active = false;
    };
  }, []);

  // Pro / admin: render the real feature, untouched.
  if (status === "allowed") return children;

  // Brief load: neutral placeholder so free users never see a flash of the real thing.
  if (status === "loading") {
    return (
      <div className="mt-14 rounded-2xl border border-[var(--line)] bg-bg2/40 px-6 py-16 text-center">
        <span className="mono text-[11px] tracking-[0.14em] text-muted">LOADING…</span>
      </div>
    );
  }

  // Locked: blurred teaser + upgrade card.
  return (
    <div className="relative mt-14 overflow-hidden rounded-2xl border border-signal/25">
      <div
        className="pointer-events-none select-none opacity-60 blur-[6px] saturate-[0.4] [&>*]:!mt-0"
        aria-hidden="true"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-bg/50 backdrop-blur-[1px]">
        <div className="max-w-sm px-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-signal/40 bg-signal/10">
            <Lock size={16} className="text-signal" />
          </div>
          <p className="kicker mb-1.5">Pro feature</p>
          <h3 className="headline mb-2 text-xl text-ink">{title}</h3>
          <p className="mb-5 text-sm leading-relaxed text-muted">
            {blurb || "Unlock this with a Pro subscription."}
          </p>
          <a
            href={`/upgrade?page=${page}`}
            className="mono inline-flex items-center gap-1.5 rounded-md bg-signal px-4 py-2 text-[12px] tracking-[0.06em] text-bg hover:brightness-110"
          >
            <Lock size={12} /> Upgrade to Pro
          </a>
        </div>
      </div>
    </div>
  );
}
