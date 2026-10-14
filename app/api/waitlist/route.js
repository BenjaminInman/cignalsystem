// Early-access waitlist for verticals that aren't live yet (hub cards and the
// per-vertical "coming soon" screen). Writes with the service role; the table
// is RLS-locked to admin reads. Demand per vertical decides build order.
import { VERTICALS } from "@/lib/verticals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req) {
  let b = {};
  try {
    b = await req.json();
  } catch {
    /* ignore */
  }
  const email = (b.email || "").toString().trim().toLowerCase().slice(0, 200);
  const vertical = (b.vertical || "").toString().trim();
  const source = (b.source || "hub").toString().slice(0, 40);

  if (!email || !EMAIL_RE.test(email))
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!VERTICALS[vertical])
    return Response.json({ error: "Unknown market." }, { status: 400 });

  try {
    const r = await fetch(`${SUPA}/rest/v1/vertical_waitlist?on_conflict=email,vertical`, {
      method: "POST",
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        "content-type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({ email, vertical, source }),
    });
    if (!r.ok) return Response.json({ error: "Couldn't save that. Please try again." }, { status: 502 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Couldn't save that. Please try again." }, { status: 502 });
  }
}
