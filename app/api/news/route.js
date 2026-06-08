import { getNews } from "@/lib/news";
import { verticalSlugFromHost } from "@/lib/vertical-slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const slug = verticalSlugFromHost(request.headers.get("host"));
  const items = await getNews(18, slug);
  return Response.json({ items });
}
