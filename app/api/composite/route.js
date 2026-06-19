export const runtime = "nodejs";
export const revalidate = 600;

// Live composite signal — computed in the DB from the weighted signal feed.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ composite: null });
  try {
    const res = await fetch(
      `${url}/rest/v1/composite_signal?id=eq.1&select=label,tone,confidence,bull_count,bear_count,neutral_count`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 600 } }
    );
    if (!res.ok) return Response.json({ composite: null });
    const rows = await res.json();
    return Response.json({ composite: rows?.[0] || null });
  } catch {
    return Response.json({ composite: null });
  }
}
