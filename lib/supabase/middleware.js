// Session refresh + access guards, called from middleware.js.
// 1. Refreshes the Supabase auth cookie on every matched request.
// 2. Auth gate: unauthenticated visitors to gated routes -> /login.
// 3. Tier gate: logged-in users on a suite page their tier can't access get
//    the page REWRITTEN to the upgrade screen (URL stays the same, so the nav
//    item still feels live — they land on an upgrade wall).
//
// RLS is still the real data boundary; this controls routing/UX.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { SUITE_PAGES, CIGNAL_PLUS_PAGES, firstSegment } from "@/lib/access";
import { hasTier } from "@/lib/tiers";

// Routes that require a session at all.
const GATED = [
  "/dashboard",
  "/indicators",
  "/market-maps",
  "/forecasts",
  "/indices",
  "/research",
  "/portfolio",
  "/community",
  "/where-are-we",
  "/signals",
  "/tools",
  "/litmus",
  "/one-pager",
  "/exit-analyzer",
  "/screener",
  "/budget",
  "/underwrite",
  "/architect",
  "/admin",
  "/upgrade",
  "/account",
];

// Carry any refreshed Supabase auth cookies (and the vertical cookie) onto a
// redirect so a token refresh is never dropped on the way out.
function withCookies(target, source) {
  source.cookies.getAll().forEach((c) => target.cookies.set(c));
  return target;
}

function isGated(pathname) {
  return GATED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// `opts.path`   — the in-app path being served (vertical prefix already stripped)
// `opts.rewrite` — true when middleware is rewriting a public URL onto `path`
// `opts.vp`     — maps an in-app path to its public URL ("/login" -> "/multifamily/login")
export async function updateSession(request, requestHeaders, opts = {}) {
  const pathname = opts.path || request.nextUrl.pathname;
  const vp = opts.vp || ((p) => p);
  const makeBase = () =>
    opts.rewrite
      ? NextResponse.rewrite(new URL(pathname + request.nextUrl.search, request.url), {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({ request: { headers: requestHeaders } });
  let response = makeBase();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = makeBase();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Auth gate ---
  if (isGated(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = vp("/login");
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return withCookies(NextResponse.redirect(url), response);
  }

  // Signed-in users shouldn't sit on the auth pages.
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    // Already signed in but arrived from a "Start Pro" button: go to checkout.
    const wantsPro = request.nextUrl.searchParams.get("plan") === "pro";
    url.pathname = vp(wantsPro ? "/upgrade" : "/dashboard");
    url.search = wantsPro ? "?start=pro" : "";
    return withCookies(NextResponse.redirect(url), response);
  }

  // --- Tier gate ---
  const slug = firstSegment(pathname);

  // Cignal+-exclusive pages: gated directly by tier (not the tier_access table),
  // so they lock the instant they ship. Admins always pass.
  if (user && CIGNAL_PLUS_PAGES.includes(slug)) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("tier, is_admin")
      .eq("id", user.id)
      .single();
    if (!prof?.is_admin && !hasTier(prof?.tier, "cignal_plus")) {
      return withCookies(NextResponse.rewrite(
        new URL(`/upgrade?page=${slug}`, request.url),
        { request: { headers: requestHeaders } }
      ), response);
    }
    return response; // allowed — skip the generic suite gate
  }

  // --- Generic suite gate (tier_access table) ---
  if (user && SUITE_PAGES.includes(slug)) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("tier, is_admin")
      .eq("id", user.id)
      .single();

    if (!prof?.is_admin) {
      const tier = prof?.tier || "free";
      const { data: access } = await supabase
        .from("tier_access")
        .select("page")
        .eq("tier", tier);
      const allowed = new Set((access || []).map((a) => a.page));

      if (!allowed.has(slug)) {
        // Keep the URL; serve the upgrade screen in its place.
        return withCookies(NextResponse.rewrite(
          new URL(`/upgrade?page=${slug}`, request.url),
          { request: { headers: requestHeaders } }
        ), response);
      }
    }
  }

  return response;
}
