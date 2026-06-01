import { getQuotes } from "@/lib/quotes";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 40);
  const quotes = await getQuotes(symbols);
  return Response.json({ quotes });
}
