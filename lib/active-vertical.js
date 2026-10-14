import { headers } from "next/headers";
import { getVerticalConfig, DEFAULT_VERTICAL } from "@/lib/verticals";
import { getContent } from "@/lib/content";
import { HUB } from "@/lib/vertical-slug";

function activeSlug() {
  try {
    return headers().get("x-vertical") || DEFAULT_VERTICAL;
  } catch {
    return DEFAULT_VERTICAL;
  }
}

export function getActiveVertical() {
  return getVerticalConfig(activeSlug());
}

export function getActiveContent() {
  return getContent(activeSlug());
}

// True when serving the cross-vertical hub at "/".
export function isHubRequest() {
  return activeSlug() === HUB;
}

// Public path of the current request (set by middleware), for canonical URLs.
export function activePublicPath() {
  try {
    return headers().get("x-public-path") || null;
  } catch {
    return null;
  }
}
