// POST /api/email/test — admin-only Resend smoke test.
// Sends a single test email to the signed-in admin's own address so you can
// confirm Resend is wired up, without exposing a public send endpoint.
//
// Trigger it from the browser console while signed in as an admin:
//   await fetch("/api/email/test", { method: "POST" }).then(r => r.json())

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { welcomeEmailHtml, WELCOME_SUBJECT } from "@/lib/email/templates";

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
    .select("is_admin, email, full_name")
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

  // Send the ACTUAL welcome template from the verified domain, so this smoke test
  // doubles as a true preview of what a new member receives. Lands in the admin's
  // own inbox.
  const result = await sendEmail({
    from: "Cignal System <noreply@cignalsystem.com>",
    to: prof.email || user.email,
    subject: `[TEST] ${WELCOME_SUBJECT}`,
    html: welcomeEmailHtml(prof.full_name || null),
    replyTo: "ben@benjamininman.com",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
