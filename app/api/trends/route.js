import { getTrends } from "@/lib/trends";

export const runtime = "nodejs";
// Timed ISR on route handlers stopped regenerating in production (served build-time data for weeks).
// Render per request; the inner fetch() calls keep their own revalidate windows to cap upstream load.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const t = await getTrends();
    return Response.json(t || { live: false });
  } catch {
    return Response.json({ live: false });
  }
}
