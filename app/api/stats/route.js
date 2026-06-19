export const runtime = "nodejs";
export const revalidate = 1800;

// Live platform stats (MSA/ZIP/observation counts + signal tallies) from the DB.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ stats: null });
  try {
    const res = await fetch(`${url}/rest/v1/rpc/platform_stats`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      next: { revalidate: 1800 },
    });
    if (!res.ok) return Response.json({ stats: null });
    const data = await res.json();
    return Response.json({ stats: data });
  } catch {
    return Response.json({ stats: null });
  }
}
