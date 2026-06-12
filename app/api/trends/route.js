import { getTrends } from "@/lib/trends";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const t = await getTrends();
    return Response.json(t || { live: false });
  } catch {
    return Response.json({ live: false });
  }
}
