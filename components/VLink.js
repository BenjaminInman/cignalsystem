"use client";

// Drop-in replacement for next/link that keeps navigation inside the current
// vertical's subdirectory: <Link href="/indicators"> rendered under
// /multifamily becomes /multifamily/indicators. Absolute URLs, /api routes,
// hash links and already-prefixed paths pass through untouched. Outside a
// vertical (the hub) hrefs are used as written.
import NextLink from "next/link";
import { forwardRef } from "react";
import { useVertical } from "@/components/VerticalProvider";
import { verticalHref } from "@/lib/vertical-slug";

const VLink = forwardRef(function VLink({ href, ...rest }, ref) {
  const vertical = useVertical();
  const slug = vertical?.slug;
  let out = href;
  if (slug) {
    if (typeof href === "string") out = verticalHref(slug, href);
    else if (href && typeof href === "object" && typeof href.pathname === "string")
      out = { ...href, pathname: verticalHref(slug, href.pathname) };
  }
  return <NextLink ref={ref} href={out} {...rest} />;
});

export default VLink;
