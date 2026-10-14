import { NextResponse } from "next/server";
import {
  DEFAULT_VERTICAL,
  HUB,
  SITE_URL,
  VERTICAL_COOKIE,
  VERTICAL_PATH,
  splitVerticalPath,
  verticalFromSubdomain,
  verticalHref,
} from "./lib/vertical-slug";
import { updateSession } from "./lib/supabase/middleware";

// URL model
//   /                       -> the hub (internally the /hub page)
//   /<vertical>/<path>      -> app page <path>, served as that vertical
//   /<path> (no prefix)     -> 307 to /<last-visited vertical>/<path>
//   <vertical>.cignalsystem.com/<path> -> 301 to www.cignalsystem.com/<vertical>/<path>
// /api/* never reaches middleware (see matcher), so webhooks that still post
// to the old subdomains (HelloData, Stripe) keep working untouched.

const PASSTHROUGH = new Set(["/robots.txt", "/sitemap.xml", "/icon.png", "/favicon.ico"]);
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function middleware(req) {
  const url = req.nextUrl;
  const host = req.headers.get("host") || "";

  // 1. Retired per-vertical subdomains -> permanent redirect to the subdirectory.
  const subVertical = verticalFromSubdomain(host);
  if (subVertical) {
    const target = new URL(SITE_URL);
    target.pathname = verticalHref(subVertical, url.pathname);
    target.search = url.search;
    return NextResponse.redirect(target, 301);
  }

  // 2. Static files and metadata routes pass straight through.
  if (PASSTHROUGH.has(url.pathname) || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
    return NextResponse.next();
  }

  // The hub only lives at "/".
  if (url.pathname === "/hub" || url.pathname.startsWith("/hub/")) {
    const home = url.clone();
    home.pathname = "/";
    return NextResponse.redirect(home, 308);
  }

  const requestHeaders = new Headers(req.headers);

  // 3. Hub at the root.
  if (url.pathname === "/") {
    requestHeaders.set("x-vertical", HUB);
    requestHeaders.set("x-public-path", "/");
    return updateSession(req, requestHeaders, { path: "/hub", rewrite: true });
  }

  // 4. Vertical subdirectory -> serve the in-app page as that vertical.
  const { vertical, rest } = splitVerticalPath(url.pathname);
  if (vertical) {
    requestHeaders.set("x-vertical", vertical);
    requestHeaders.set("x-public-path", url.pathname);
    const res = await updateSession(req, requestHeaders, {
      path: rest,
      rewrite: true,
      vp: (p) => verticalHref(vertical, p),
    });
    if (req.cookies.get(VERTICAL_COOKIE)?.value !== vertical) {
      res.cookies.set(VERTICAL_COOKIE, vertical, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
    }
    return res;
  }

  // 5. Un-prefixed app path (old bookmark, auth "next" target, a plain
  //    <a href="/upgrade">) -> the same page in the visitor's vertical.
  const remembered = req.cookies.get(VERTICAL_COOKIE)?.value;
  const target = url.clone();
  target.pathname = verticalHref(VERTICAL_PATH[remembered] ? remembered : DEFAULT_VERTICAL, url.pathname);
  return NextResponse.redirect(target, 307);
}

export const config = {
  // Everything except Next internals and API routes.
  matcher: ["/((?!_next/static|_next/image|api/).*)"],
};
