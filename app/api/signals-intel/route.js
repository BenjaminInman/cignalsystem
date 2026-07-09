export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { nationalIntel } from "@/lib/signals-engine";
import { verticalFromRequest } from "@/lib/vertical-request";

export async function GET(req) {
  try {
    const data = await nationalIntel(verticalFromRequest(req));
    if (!data) return Response.json({ error: "unavailable" }, { status: 502 });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "signals intel unavailable" }, { status: 502 });
  }
}
