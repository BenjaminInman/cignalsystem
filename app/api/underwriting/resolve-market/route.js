export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const r = await fetch(`${SUPA}/rest/v1/rpc/resolve_market`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ results: [] }, { status: 200 });
  const d = await r.json(); // resolve_market returns a jsonb array directly
  return NextResponse.json({ results: Array.isArray(d) ? d : (d?.results || []) });
}
