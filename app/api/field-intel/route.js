import { getFieldIntel } from "@/lib/field-intel";

export const runtime = "nodejs";
export const revalidate = 1800;

export async function GET() {
  try {
    const items = await getFieldIntel(9);
    return Response.json({ items });
  } catch {
    return Response.json({ items: [] });
  }
}
