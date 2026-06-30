// Opens the Stripe billing portal so members can update payment, view invoices,
// or cancel. Authenticated members with a Stripe customer only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

  const r = await fetch(
    `${SUPA}/rest/v1/profiles?id=eq.${user.id}&select=stripe_customer_id`,
    { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` }, cache: "no-store" }
  );
  const prof = (await r.json())?.[0];
  if (!prof?.stripe_customer_id)
    return Response.json({ error: "No billing account yet." }, { status: 400 });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const portal = await getStripe().billingPortal.sessions.create({
    customer: prof.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  });

  return Response.json({ url: portal.url });
}
