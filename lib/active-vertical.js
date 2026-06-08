import { headers } from "next/headers";
import { getVerticalConfig, DEFAULT_VERTICAL } from "@/lib/verticals";
import { getContent } from "@/lib/content";

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
