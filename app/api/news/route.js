import { getNews } from "@/lib/news";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const items = await getNews(18);
  return Response.json({ items });
}
