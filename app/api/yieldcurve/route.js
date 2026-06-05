import { getYieldCurve } from "@/lib/yieldcurve";

export const runtime = "nodejs";
export const revalidate = 43200;

export async function GET() {
  const data = await getYieldCurve();
  return Response.json({ data });
}
