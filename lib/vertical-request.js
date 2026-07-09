// Vertical detection for API route handlers.
//
// Middleware sets `x-vertical`, but its matcher deliberately excludes /api/*,
// so route handlers derive the vertical from the request Host instead. Falls
// back to the x-vertical header when present (e.g. server components).
import { verticalSlugFromHost, DEFAULT_VERTICAL } from "@/lib/vertical-slug";

export function verticalFromRequest(req) {
  try {
    const hdr = req?.headers?.get?.("x-vertical");
    if (hdr) return hdr;
    const host = req?.headers?.get?.("host");
    return verticalSlugFromHost(host);
  } catch {
    return DEFAULT_VERTICAL;
  }
}
