// Subscription tier ranking. Each tier unlocks everything below it.
//   free  <  pro  <  cignal_plus
// Cignal+ is the top tier, unlocked when a member migrates up from Pro. It
// carries everything Pro has, plus the Cignal+ overlays (FEMA disaster risk,
// structural debt/affordability layers, Fed housing-policy research, etc.).
//
// Use hasTier(userTier, requiredTier) for entitlement checks rather than
// comparing strings directly — exact-match checks (tier === "pro") wrongly
// lock a cignal_plus member out of Pro features.

export const TIER_ORDER = ["free", "pro", "cignal_plus"];

export const TIER_LABEL = {
  free: "Free",
  pro: "Pro",
  cignal_plus: "Cignal+",
};

export function tierRank(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? 0 : i; // unknown/null → treat as free
}

// True when userTier is at or above requiredTier.
export function hasTier(userTier, requiredTier = "pro") {
  return tierRank(userTier) >= tierRank(requiredTier);
}
