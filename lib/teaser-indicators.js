// The ONLY indicators whose live values are exposed to free / anonymous callers
// of /api/indicators. This is the public home-page teaser set — the leading and
// trailing cards across every vertical. Everything else (the full catalogue, the
// numbers behind the charts and quarter-over-quarter reads) is paid-only.
//
// Derived from the actual card arrays so it stays in sync automatically: add or
// remove a home card and this set follows, with no second place to maintain.
import * as multifamily from "@/lib/data";
import * as generalRealEstate from "@/lib/content/general-real-estate";
import * as investor from "@/lib/content/investor";
import * as singleFamily from "@/lib/content/single-family";

const PACKS = [multifamily, generalRealEstate, investor, singleFamily];

const names = new Set();
for (const p of PACKS) {
  for (const c of [...(p.LEADING_CARDS || []), ...(p.TRAILING_CARDS || [])]) {
    if (c && c.name) names.add(c.name);
  }
}

export const TEASER_INDICATOR_NAMES = names;
