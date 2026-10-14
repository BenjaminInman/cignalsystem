import { getFieldIntel } from "@/lib/field-intel";
import { verticalFromRequest } from "@/lib/vertical-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const vertical = verticalFromRequest(request);
    const items = await getFieldIntel(9, vertical);
    return Response.json({ items });
  } catch {
    return Response.json({ items: [] });
  }
}
