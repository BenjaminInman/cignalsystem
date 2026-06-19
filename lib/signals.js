import { createClient } from "@/lib/supabase/client";

// Reads from signal_feed. RLS does the split automatically:
// logged-out -> teaser signals only; logged-in members -> the full feed.
export async function fetchSignals(limit) {
  const supabase = createClient();
  let q = supabase
    .from("signal_feed")
    .select("tone,title,body,tags,confidence,published_at")
    .eq("is_active", true)
    .order("severity", { ascending: false })
    .order("published_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) return [];
  return (data || []).map((r) => ({
    tone: r.tone,
    title: r.title,
    body: r.body,
    tags: r.tags || [],
    conf: r.confidence,
    time: relTime(r.published_at),
  }));
}

export function relTime(ts) {  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return `${Math.floor(diff / 86400)}d ago`;
}

// Teaser-only feed for the public home sample (works for anon and members alike).
export async function fetchTeaserSignals(limit = 4) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("signal_feed")
    .select("tone,title,body,tags,confidence,published_at")
    .eq("is_active", true)
    .eq("is_teaser", true)
    .order("severity", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map((r) => ({
    tone: r.tone,
    title: r.title,
    body: r.body,
    tags: r.tags || [],
    conf: r.confidence,
    time: relTime(r.published_at),
  }));
}
