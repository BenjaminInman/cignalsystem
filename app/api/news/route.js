import { getNews } from "@/lib/news";
import { verticalFromRequest } from "@/lib/vertical-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const slug = verticalFromRequest(request);
  const items = await getNews(18, slug);
  return Response.json({ items });
}
