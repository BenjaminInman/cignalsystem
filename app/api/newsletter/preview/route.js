export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fetchArticles, renderDigest, AUDIENCES } from "@/lib/email/digest";

// GET /api/newsletter/preview?frequency=weekly&audience=none|free|pro
// Admin-only. Renders the real digest, with live articles, in the browser —
// so a send is never the first time anyone sees the email.
export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return new Response("Forbidden", { status: 403 });

  const qs = new URL(req.url).searchParams;
  const frequency = qs.get("frequency") === "daily" ? "daily" : "weekly";
  const audience = AUDIENCES.includes(qs.get("audience")) ? qs.get("audience") : "pro";
  const articles = await fetchArticles(frequency === "daily" ? 1 : 7, frequency === "daily" ? 6 : 12);
  const html = renderDigest({ frequency, articles, token: "preview-token", audience });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
