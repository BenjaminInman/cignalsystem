// POST /api/email/test — admin-only Resend smoke test.
// Sends a single test email to the signed-in admin's own address so you can
// confirm Resend is wired up, without exposing a public send endpoint.
//
// Trigger it from the browser console while signed in as an admin:
//   await fetch("/api/email/test", { method: "POST" }).then(r => r.json())

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!prof?.is_admin) {
    return NextResponse.json({ ok: false, error: "Admin only." }, { status: 403 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY is not set in the environment." },
      { status: 500 }
    );
  }

  // Pre-domain-verification constraints: from = onboarding@resend.dev,
  // to = your Resend account email (the admin's own address).
  const result = await sendEmail({
    from: "onboarding@resend.dev",
    to: prof.email || user.email,
    subject: "Cignal System — Resend test",
    html: "<p>Resend is wired into the app. <strong>Sending works.</strong></p>",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
