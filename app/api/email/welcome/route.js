// POST /api/email/welcome  { email? }
// Fires the one-time welcome email for a freshly-signed-up user. Idempotent and
// self-protecting: it only sends to a real profile that hasn't been welcomed yet,
// so it can't be used to spam arbitrary addresses. If no email is supplied it
// uses the signed-in user's own address, which lets any authed surface call it as
// a backstop (e.g. first dashboard load) without knowing the address.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maybeSendWelcome } from "@/lib/email/welcome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  let email = (body.email || "").toString().trim().toLowerCase();

  // Backstop path: no body email → use the signed-in user's own address.
  if (!email) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      email = (user?.email || "").trim().toLowerCase();
    } catch {
      /* ignore */
    }
  }

  if (!email) {
    return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
  }

  const result = await maybeSendWelcome({ email });
  return NextResponse.json({ ok: true, ...result });
}
