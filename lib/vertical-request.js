// Vertical detection for API route handlers.
//
// /api/* is outside the middleware matcher, so route handlers resolve the
// vertical themselves, in order:
//   1. x-vertical header (server components / internal calls)
//   2. a legacy vertical subdomain in the Host (old webhooks, cached clients)
//   3. the subdirectory of the page that made the call (Referer:
//      www.cignalsystem.com/investors/... -> investor)
//   4. the cs_vertical cookie middleware sets while browsing a vertical
//   5. multifamily
// Every handler that calls this is force-dynamic, so per-vertical answers are
// never shared through a cache keyed only on the URL.
import {
  DEFAULT_VERTICAL,
  HUB,
  VERTICAL_COOKIE,
  VERTICAL_PATH,
  splitVerticalPath,
  verticalFromSubdomain,
} from "@/lib/vertical-slug";

function fromCookie(req) {
  const raw = req?.headers?.get?.("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${VERTICAL_COOKIE}=([^;]+)`).exec(raw);
  const v = m ? decodeURIComponent(m[1]) : null;
  return v && VERTICAL_PATH[v] ? v : null;
}

function fromReferer(req) {
  try {
    const ref = req?.headers?.get?.("referer");
    if (!ref) return null;
    return splitVerticalPath(new URL(ref).pathname).vertical;
  } catch {
    return null;
  }
}

export function verticalFromRequest(req) {
  try {
    const hdr = req?.headers?.get?.("x-vertical");
    if (hdr && hdr !== HUB) return hdr;
    return (
      verticalFromSubdomain(req?.headers?.get?.("host")) ||
      fromReferer(req) ||
      fromCookie(req) ||
      DEFAULT_VERTICAL
    );
  } catch {
    return DEFAULT_VERTICAL;
  }
}
