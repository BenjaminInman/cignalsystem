// Stripe webhook → keeps profiles.tier in sync with subscription state.
// Verifies the signature, then maps the subscription's price back to a tier.
// Uses the service role (bypasses RLS) to write the profile.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getStripe } from "@/lib/stripe";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;

async function sbGet(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

async function patchProfileBy(filter, patch) {
  await fetch(`${SUPA}/rest/v1/profiles?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "content-type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

async function tierForPrice(priceId) {
  if (!priceId) return null;
  const rows = await sbGet(`tiers?stripe_price_id=eq.${priceId}&select=slug`);
  return rows?.[0]?.slug || null;
}

// Reflect a subscription's current state onto the member's profile.
async function syncSubscription(sub) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const priceId = sub.items?.data?.[0]?.price?.id;
  const tier = await tierForPrice(priceId);
  const status = sub.status; // active | trialing | past_due | canceled | ...
  // Recent Stripe API versions expose the billing period on the line item;
  // older ones put it on the subscription. Read item-level first, then fall back.
  const periodEndUnix =
    sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end ?? null;
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  // Active / trialing / past_due still grant access (past_due = grace period).
  const grants = ["active", "trialing", "past_due"].includes(status);

  const patch = {
    cancel_at_period_end: !!sub.cancel_at_period_end,
    stripe_subscription_id: sub.id,
    subscription_status: status,
    current_period_end: periodEnd,
    tier: grants && tier ? tier : "free",
    updated_at: new Date().toISOString(),
  };

  const uid = sub.metadata?.supabase_user_id;
  if (uid) await patchProfileBy(`id=eq.${uid}`, patch);
  else if (customerId)
    await patchProfileBy(`stripe_customer_id=eq.${customerId}`, patch);
}

export async function POST(req) {
  if (!WHSEC)
    return new Response("Webhook secret not configured", { status: 500 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, WHSEC);
  } catch (err) {
    return new Response(`Signature check failed: ${err.message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          if (session.client_reference_id && session.customer) {
            await patchProfileBy(`id=eq.${session.client_reference_id}`, {
              stripe_customer_id:
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer.id,
            });
          }
          const sub = await getStripe().subscriptions.retrieve(
            session.subscription
          );
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object;
        const customerId =
          typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId)
          await patchProfileBy(`stripe_customer_id=eq.${customerId}`, {
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          });
        break;
      }
    }
  } catch (err) {
    // Non-2xx → Stripe retries with backoff.
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }

  return Response.json({ received: true });
}
