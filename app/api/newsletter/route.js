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

  const name = (b.name || "").toString().trim().slice(0, 120);
  const email = (b.email || "").toString().trim().toLowerCase().slice(0, 200);
  let frequency = (b.frequency || "weekly").toString().toLowerCase();
  if (!["daily", "weekly"].includes(frequency)) frequency = "weekly";

  if (!email || !EMAIL_RE.test(email))
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  try {
    // Upsert on email so re-subscribing just updates the preference.
    const r = await fetch(`${SUPA}/rest/v1/newsletter_signups?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        name: name || null,
        email,
        frequency,
        source: "news",
        updated_at: new Date().toISOString(),
      }),
    });
    if (!r.ok) return Response.json({ error: "Couldn't save your signup. Please try again." }, { status: 502 });
    return Response.json({ ok: true, frequency });
  } catch {
    return Response.json({ error: "Couldn't save your signup. Please try again." }, { status: 502 });
  }
}
