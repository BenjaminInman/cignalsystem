"use client";

// Command Center plan banner:
//   ?upgraded=1           -> welcome to Pro
//   ?checkout=canceled    -> they backed out of payment; offer to finish
//   free tier (otherwise) -> slim "you're on Free" upgrade prompt
// Pro members with no query string see nothing.
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import UpgradeCTA from "@/components/UpgradeCTA";

export default function PlanBanner({ tier }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("upgraded") === "1") setState("welcome");
    else if (q.get("checkout") === "canceled") setState("canceled");
    else setState("none");
  }, []);

  if (state === null || tier === null) return null;

  if (state === "welcome") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-up/30 bg-up/[0.06] p-5">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-up" />
        <div>
          <p className="font-semibold text-ink">Welcome to Cignal Pro. Everything is unlocked.</p>
          <p className="mt-1 text-sm text-muted">
            Start with the four moves below, or open the Terminal menu at the top to explore any tool.
          </p>
        </div>
      </div>
    );
  }

  if (tier === "free") {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-signal/30 bg-signal/[0.05] px-5 py-4">
        <p className="text-sm text-ink">
          {state === "canceled"
            ? "You didn't finish upgrading. You're on the Free plan for now."
            : "You're on the Free plan."}{" "}
          <span className="text-muted">Pro unlocks indicators, forecasts, market maps, the Underwriter and your portfolio.</span>
        </p>
        <UpgradeCTA label={state === "canceled" ? "Finish upgrading to Pro" : "Upgrade to Pro"} />
      </div>
    );
  }

  return null;
}
