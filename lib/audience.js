// Audience segmentation for admin surfaces.
//
// Every signup, assessment lead, and training application is stamped with the
// vertical of the site it came in through (derived SERVER-SIDE from the host,
// never from a client-supplied field). That stamp is what lets one admin panel
// segment the funnel by audience — Operator vs Investor vs Real Estate — while
// the data warehouse underneath stays shared.
//
// Deliberately NO fallback to "multifamily": an unstamped row reads UNSTAMPED
// rather than silently claiming an origin it may not have. A blank you can
// chase beats a value you'd wrongly trust.

import { VERTICALS } from "@/lib/verticals";

// Audience-facing names. These differ from the vertical labels on purpose:
// the vertical describes the SITE, the audience describes WHO came through it.
const AUDIENCE_LABELS = {
  multifamily: "Operator",
  investor: "Investor",
  "general-real-estate": "Real Estate",
  "real-estate-development": "Development",
  "small-business": "Small Business",
  "personal-finance": "Personal Finance",
};

export const UNSTAMPED = "unstamped";

export function audienceLabel(slug) {
  if (!slug) return "Unstamped";
  return AUDIENCE_LABELS[slug] || slug;
}

// Filter options built from rows actually present, so the admin never shows a
// tab for an audience with zero records. Always includes "all" first, and
// appends "unstamped" only when such rows exist.
export function audienceOptions(rows, key) {
  const seen = new Map();
  let unstamped = 0;
  for (const r of rows || []) {
    const v = r?.[key];
    if (!v) { unstamped += 1; continue; }
    seen.set(v, (seen.get(v) || 0) + 1);
  }
  const known = Object.keys(VERTICALS).filter((s) => seen.has(s));
  const extra = [...seen.keys()].filter((s) => !VERTICALS[s]);
  const opts = [{ value: "all", label: "All", count: (rows || []).length }];
  for (const s of [...known, ...extra]) {
    opts.push({ value: s, label: audienceLabel(s), count: seen.get(s) });
  }
  if (unstamped) opts.push({ value: UNSTAMPED, label: "Unstamped", count: unstamped });
  return opts;
}

export function matchesAudience(row, key, filter) {
  if (filter === "all") return true;
  if (filter === UNSTAMPED) return !row?.[key];
  return row?.[key] === filter;
}
