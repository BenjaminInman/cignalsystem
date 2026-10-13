import { getYieldCurve } from "@/lib/yieldcurve";

export const runtime = "nodejs";
// Timed ISR on route handlers stopped regenerating in production (served build-time data for weeks).
// Render per request; the inner fetch() calls keep their own revalidate windows to cap upstream load.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getYieldCurve();
  return Response.json({ data });
}
