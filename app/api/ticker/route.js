import { getTicker } from "@/lib/ticker";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const items = await getTicker();
    return Response.json({ items });
  } catch {
    return Response.json({ items: {} });
  }
}
