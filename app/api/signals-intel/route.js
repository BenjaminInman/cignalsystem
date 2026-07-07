export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { nationalIntel } from "@/lib/signals-engine";

export async function GET() {
  try {
    const data = await nationalIntel();
    if (!data) return Response.json({ error: "unavailable" }, { status: 502 });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "signals intel unavailable" }, { status: 502 });
  }
}
