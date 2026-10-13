import { getQuotesDetailed } from "@/lib/quotes";

export const runtime = "nodejs";
// Timed ISR on route handlers stopped regenerating in production (served build-time data for weeks).
// Render per request; the inner fetch() calls keep their own revalidate windows to cap upstream load.
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 40);

  const { quotes, errors } = await getQuotesDetailed(symbols);
  const failed = Object.keys(errors).length;

  // Surface the failure instead of returning a bare {} that looks like success.
  return Response.json(
    {
      quotes,
      requested: symbols.length,
      resolved: Object.keys(quotes).length,
      ...(failed ? { degraded: true, errors } : {}),
    },
    { status: symbols.length && !Object.keys(quotes).length ? 502 : 200 }
  );
}
