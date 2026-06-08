import { headers } from "next/headers";
import { getVerticalConfig, DEFAULT_VERTICAL } from "@/lib/verticals";

export function getActiveVertical() {
  try {
    const slug = headers().get("x-vertical") || DEFAULT_VERTICAL;
    return getVerticalConfig(slug);
  } catch {
    return getVerticalConfig(DEFAULT_VERTICAL);
  }
}
