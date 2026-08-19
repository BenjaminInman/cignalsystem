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
  "/admin",
  "/upgrade",
  "/account",
];

function isGated(pathname) {
  return GATED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function updateSession(request, requestHeaders) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

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
          response = NextResponse.next({ request: { headers: requestHeaders } });
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

  const pathname = request.nextUrl.pathname;

  // --- Auth gate ---
  if (isGated(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users shouldn't sit on the auth pages.
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
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
      return NextResponse.rewrite(
        new URL(`/upgrade?page=${slug}`, request.url),
        { request: { headers: requestHeaders } }
      );
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
        return NextResponse.rewrite(
          new URL(`/upgrade?page=${slug}`, request.url),
          { request: { headers: requestHeaders } }
        );
      }
    }
  }

  return response;
}
