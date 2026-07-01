// Starts a Stripe Checkout session for an upgrade. Authenticated members only.
// Body: { tier: "pro" | "cignal_plus" }. Returns { url } to redirect to.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbGet(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}

async function patchProfile(id, patch) {
  await fetch(`${SUPA}/rest/v1/profiles?id=eq.${id}`, {
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

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

  let body = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  let tier = (body.tier || "pro").toString();
  if (!["pro", "cignal_plus"].includes(tier)) tier = "pro";

  // Resolve the Stripe price for the requested tier.
  const tiers = await sbGet(`tiers?slug=eq.${tier}&select=slug,name,stripe_price_id`);
  const row = tiers?.[0];
  if (!row?.stripe_price_id)
    return Response.json(
      { error: "This plan isn't open for checkout yet." },
      { status: 400 }
    );

  const profs = await sbGet(
    `profiles?id=eq.${user.id}&select=email,stripe_customer_id`
  );
  const prof = profs?.[0] || {};

  const stripe = getStripe();

  // Reuse the member's Stripe customer, or create + link one.
  let customerId = prof.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: prof.email || user.email || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await patchProfile(user.id, { stripe_customer_id: customerId });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: row.stripe_price_id, quantity: 1 }],
    subscription_data: { metadata: { supabase_user_id: user.id, tier } },
    allow_promotion_codes: true,
    custom_text: {
      submit: {
        message:
          "By subscribing, you acknowledge that Cignal System is provided for informational and educational purposes only and does not constitute investment, financial, legal, or tax advice.",
      },
    },
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/upgrade?canceled=1`,
  });

  return Response.json({ url: session.url });
}
