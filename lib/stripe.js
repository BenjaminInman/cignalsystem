// Server-side Stripe client. Lazy-instantiated so a missing key at build time
// never breaks the build — it only errors when a Stripe route is actually hit.
import Stripe from "stripe";

let _stripe = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!_stripe) {
    // No explicit apiVersion → use the SDK's pinned default (avoids version drift).
    _stripe = new Stripe(key, { appInfo: { name: "Cignal System" } });
  }
  return _stripe;
}
