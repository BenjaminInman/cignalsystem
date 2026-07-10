import { getQuotesDetailed } from "@/lib/quotes";

export const runtime = "nodejs";
export const revalidate = 600;

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
