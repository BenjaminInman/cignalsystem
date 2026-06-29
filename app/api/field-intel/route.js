import { getFieldIntel } from "@/lib/field-intel";
import { verticalSlugFromHost } from "@/lib/vertical-slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const vertical = verticalSlugFromHost(request.headers.get("host"));
    const items = await getFieldIntel(9, vertical);
    return Response.json({ items });
  } catch {
    return Response.json({ items: [] });
  }
}
