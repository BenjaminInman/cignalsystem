"use client";

// Wrap any feature to gate it by tier. Members at or above `minTier` (and
// admins) see the real thing; everyone else sees an upgrade card naming the
// tier they actually need.
//
//   <PaywallBlur page="indicators" title="Indicator Comparison" blurb="...">
//     <IndicatorCompare />                      // defaults to Pro
//   </PaywallBlur>
//
//   <PaywallBlur minTier="cignal_plus" hard ...>
//     <OnionFramework />                        // Cignal+ only
//   </PaywallBlur>
//
// Modes:
//   default  -> blurred teaser behind the upgrade card ("look what you're
//               missing"). The child still mounts, so its data loads in the
//               browser even while blurred.
//   hard      -> the child is NOT rendered at all for non-Pro users; they see
//               only the upgrade card. Use this for IP that must stay hidden.
//
// RLS/route gating is the real boundary; this controls in-page UX.

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasTier, TIER_LABEL } from "@/lib/tiers";

export default function PaywallBlur({
  page = "indicators",
  title = "Pro feature",
  blurb,
  hard = false,
  minTier = "pro",
  wrapClass = "mt-14",
  children,
}) {
  // Label the tier the member actually needs. Hard-coding "Pro" here sent
  // Cignal+-only features to an "Upgrade to Pro" button that a Pro member had
  // already bought — a dead end.
  const needLabel = TIER_LABEL[minTier] || "Pro";
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
          setStatus(data?.is_admin || hasTier(data?.tier, minTier) ? "allowed" : "locked");
        });
    });
    return () => {
      active = false;
    };
  }, [minTier]);

  // Pro / admin: render the real feature, untouched.
  if (status === "allowed") return children;

  // Brief load: neutral placeholder so free users never see a flash of the real thing.
  if (status === "loading") {
    return (
      <div className={`${wrapClass} rounded-2xl border border-[var(--line)] bg-bg2/40 px-6 py-16 text-center`}>
        <span className="mono text-[11px] tracking-[0.14em] text-muted">LOADING…</span>
      </div>
    );
  }

  const card = (
    <div className="max-w-sm px-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-signal/40 bg-signal/10">
        <Lock size={16} className="text-signal" />
      </div>
      <p className="kicker mb-1.5">{needLabel} feature</p>
      <h3 className="headline mb-2 text-xl text-ink">{title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-muted">
        {blurb || `Unlock this with a ${needLabel} subscription.`}
      </p>
      <a
        href={`/upgrade?page=${page}`}
        className="mono inline-flex items-center gap-1.5 rounded-md bg-signal px-4 py-2 text-[12px] tracking-[0.06em] text-bg hover:brightness-110"
      >
        <Lock size={12} /> Upgrade to {needLabel}
      </a>
    </div>
  );

  // Hard lock: no protected content in the DOM at all. Rendered as a compact
  // HORIZONTAL banner (not a tall block) so the content below stays visible and
  // the page doesn't read as a dead end — keeps bounce down.
  if (hard) {
    return (
      <div className={`${wrapClass} flex flex-col items-center gap-4 rounded-2xl border border-signal/25 bg-bg2/40 px-6 py-6 text-center sm:flex-row sm:justify-between sm:gap-6 sm:text-left`}>
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-signal/40 bg-signal/10">
            <Lock size={16} className="text-signal" />
          </span>
          <div className="min-w-0">
            <p className="kicker mb-0.5">{needLabel} feature</p>
            <h3 className="headline text-lg text-ink">{title}</h3>
            {blurb && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">{blurb}</p>}
          </div>
        </div>
        <a
          href={`/upgrade?page=${page}`}
          className="mono inline-flex shrink-0 items-center gap-1.5 rounded-md bg-signal px-4 py-2 text-[12px] tracking-[0.06em] text-bg hover:brightness-110"
        >
          <Lock size={12} /> Upgrade to {needLabel}
        </a>
      </div>
    );
  }

  // Soft lock: blurred teaser + upgrade card overlay.
  return (
    <div className={`relative ${wrapClass} overflow-hidden rounded-2xl border border-signal/25`}>
      <div
        className="pointer-events-none select-none opacity-60 blur-[6px] saturate-[0.4] [&>*]:!mt-0"
        aria-hidden="true"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-bg/50 backdrop-blur-[1px]">
        {card}
      </div>
    </div>
  );
}
