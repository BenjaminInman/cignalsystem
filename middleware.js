import { NextResponse } from "next/server";
import { verticalSlugFromHost } from "./lib/vertical-slug";

export function middleware(req) {
  const slug = verticalSlugFromHost(req.headers.get("host"));
  const headers = new Headers(req.headers);
  headers.set("x-vertical", slug);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
