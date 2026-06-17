// Session refresh + access guard, called from middleware.js.
// - Refreshes the Supabase auth cookie on every matched request.
// - Redirects unauthenticated visitors away from the gated Terminal suite
//   to /login, preserving where they were headed via ?next=.
//
// This is the UX gate. It is NOT the security boundary — row-level security
// on Supabase is. Even an authenticated request only sees gated data (news,
// facts, signals) because RLS allows it; the middleware just controls routing.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Routes behind the paywall — the Terminal "Subscriber Suite".
const GATED = [
  "/dashboard",
  "/indicators",
  "/market-maps",
  "/forecasts",
  "/indices",
  "/research",
  "/portfolio",
  "/community",
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

  if (isGated(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // If a signed-in user lands on the auth pages, send them into the terminal.
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
