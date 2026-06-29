// POST /api/email/welcome  { email }
// Fires the one-time welcome email for a freshly-signed-up user. Idempotent and
// self-protecting: it only sends to a real profile that hasn't been welcomed yet,
// so it can't be used to spam arbitrary addresses.

import { NextResponse } from "next/server";
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
  const email = (body.email || "").toString().trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
  }

  const result = await maybeSendWelcome({ email });
  return NextResponse.json({ ok: true, ...result });
}
