import { verticalSlugFromHost } from "./lib/vertical-slug";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(req) {
  // Preserve the per-vertical header the app relies on...
  const slug = verticalSlugFromHost(req.headers.get("host"));
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-vertical", slug);

  // ...then refresh the Supabase session and apply the Terminal access guard.
  return updateSession(req, requestHeaders);
}

export const config = {
  // Run on everything except static assets and API routes (matches prior scope).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
