"use client";

// Vertical-aware wrappers around next/navigation.
//   usePathname() -> the in-app path with the vertical prefix removed
//                    ("/multifamily/indicators" -> "/indicators"), so existing
//                    active-state checks like pathname === "/indicators" work.
//   useRouter()   -> push/replace/prefetch prefix in-app paths with the
//                    current vertical's subdirectory.
//   useVerticalHref() -> function mapping an in-app path to its public URL.
import { useMemo } from "react";
import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { useVertical } from "@/components/VerticalProvider";
import { splitVerticalPath, verticalHref } from "@/lib/vertical-slug";

export function usePathname() {
  const p = useNextPathname() || "/";
  const { vertical, rest } = splitVerticalPath(p);
  return vertical ? rest : p;
}

export function useVerticalHref() {
  const slug = useVertical()?.slug;
  return (path) => (slug ? verticalHref(slug, path) : path);
}

export function useRouter() {
  const router = useNextRouter();
  const slug = useVertical()?.slug;
  return useMemo(() => {
    const toPublic = (path) => (slug ? verticalHref(slug, path) : path);
    return {
      ...router,
      push: (href, opts) => router.push(toPublic(href), opts),
      replace: (href, opts) => router.replace(toPublic(href), opts),
      prefetch: (href, opts) => router.prefetch(toPublic(href), opts),
    };
  }, [router, slug]);
}
