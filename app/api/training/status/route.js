export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STATUSES = ["new", "contacted", "enrolled", "archived"];

// Admin-only: update an application's status.
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return Response.json({ error: "forbidden" }, { status: 403 });

  let b = {};
  try { b = await req.json(); } catch { /* ignore */ }
  if (!b.id || !STATUSES.includes(b.status)) return Response.json({ error: "bad request" }, { status: 400 });

  const r = await fetch(`${SUPA}/rest/v1/training_applications?id=eq.${encodeURIComponent(b.id)}`, {
    method: "PATCH",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status: b.status }),
  });
  if (!r.ok) return Response.json({ error: "update failed" }, { status: 502 });
  return Response.json({ ok: true });
}
