import { getLiveIndicators } from "@/lib/indicators-live";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const items = await getLiveIndicators();
    return Response.json({ items });
  } catch {
    return Response.json({ items: {} });
  }
}
