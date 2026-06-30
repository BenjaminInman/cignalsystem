// Member account & billing. Shows current plan, status, renewal/cancellation
// date, and the self-service controls (manage/cancel via Stripe portal, or
// upgrade for free members). Auth-gated in middleware; free members allowed.
import { CreditCard, Check, ArrowRight, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TIER_LABEL } from "@/lib/tiers";
import UpgradeCTA from "@/components/UpgradeCTA";
import ManageBillingButton from "@/components/ManageBillingButton";

export const metadata = { title: "Account · Cignal System" };
export const dynamic = "force-dynamic";

function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function price(cents) {
  if (cents == null) return null;
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`;
}

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prof } = await supabase
    .from("profiles")
    .select(
      "email, tier, subscription_status, current_period_end, cancel_at_period_end, stripe_customer_id"
    )
    .eq("id", user.id)
    .single();

  const tier = prof?.tier || "free";
  const isPaid = tier !== "free";
  const hasCustomer = !!prof?.stripe_customer_id;
  const status = prof?.subscription_status || null;
  const periodEnd = fmtDate(prof?.current_period_end);
  const canceling = !!prof?.cancel_at_period_end;
  const pastDue = status === "past_due";

  const { data: tierRows } = await supabase
    .from("tiers")
    .select("slug, name, price_monthly_cents")
    .in("slug", [tier, "pro"]);
  const current = tierRows?.find((t) => t.slug === tier);
  const planLabel = current?.name || TIER_LABEL[tier] || "Free";
  const planPrice = price(current?.price_monthly_cents);

  return (
    <div className="mx-auto max-w-3xl pt-14 pb-20 fade-up">
      <p className="kicker mb-3 flex items-center gap-2">
        <CreditCard size={12} className="text-signal" /> Account &amp; Billing
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Your membership</h1>
      <p className="mt-3 max-w-xl text-muted">
        Signed in as{" "}
        <span className="mono text-[13px] text-ink">{prof?.email || user.email}</span>.
      </p>

      {/* Plan card */}
      <div className="mt-8 overflow-hidden rounded-lg border border-[var(--line-strong)] bg-bg2">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <p className="kicker mb-1">Current plan</p>
            <p className="text-2xl font-semibold text-ink">
              {planLabel}{" "}
              {planPrice && planPrice !== "Free" && (
                <span className="mono text-[13px] font-normal text-muted">
                  · {planPrice}
                </span>
              )}
            </p>
          </div>
          <span
            className={`mono rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${
              pastDue
                ? "border-down/40 text-down"
                : isPaid
                ? "border-signal/40 text-signal"
                : "border-[var(--line-strong)] text-muted"
            }`}
          >
            {pastDue ? "PAYMENT ISSUE" : isPaid ? "ACTIVE" : "FREE"}
          </span>
        </div>

        <div className="p-6">
          {pastDue && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md border border-down/30 bg-down/5 p-3.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-down" strokeWidth={1.8} />
              <p className="text-[13px] leading-relaxed text-ink">
                Your last payment didn&apos;t go through. Update your card in the
                billing portal to keep your access from lapsing.
              </p>
            </div>
          )}

          {isPaid && periodEnd && (
            <p className="mb-5 text-[14px] leading-relaxed text-muted">
              {canceling ? (
                <>
                  Your plan is set to cancel. You&apos;ll keep{" "}
                  <span className="text-ink">{planLabel}</span> access until{" "}
                  <span className="text-ink">{periodEnd}</span>, then move to the
                  Free plan automatically.
                </>
              ) : (
                <>
                  Renews on <span className="text-ink">{periodEnd}</span>. Cancel
                  anytime — you&apos;ll keep access through the end of your paid
                  period, then drop to Free.
                </>
              )}
            </p>
          )}

          {!isPaid && (
            <p className="mb-5 text-[14px] leading-relaxed text-muted">
              You&apos;re on the Free plan — the core terminal. Upgrade to unlock
              forecasts, research, market maps, portfolio tracking, and the
              community.
            </p>
          )}

          {/* Controls */}
          {hasCustomer ? (
            <ManageBillingButton
              label={isPaid ? "Manage or cancel subscription" : "Manage billing"}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <UpgradeCTA />
              {planPrice && planPrice !== "Free" && (
                <span className="mono text-[13px] text-muted">{planPrice}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mono mt-5 text-[11px] leading-relaxed text-muted">
        Billing is handled securely by Stripe. Updating your card, viewing
        invoices, and cancellation all happen in the Stripe billing portal.
      </p>
    </div>
  );
}
