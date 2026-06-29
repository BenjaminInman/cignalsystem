// Sends the welcome email exactly once per user. Safe to call from anywhere and
// as many times as you like — it no-ops if the user was already welcomed, has no
// profile, or can't be sent (e.g. RESEND_API_KEY missing), and only marks the
// user as welcomed AFTER a successful send.

import { sendEmail } from "@/lib/email/resend";
import { welcomeEmailHtml, WELCOME_SUBJECT } from "@/lib/email/templates";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FROM = "Cignal System <noreply@cignalsystem.com>";
const REPLY_TO = "ben@benjamininman.com";

export async function maybeSendWelcome({ email }) {
  if (!email || !SUPA || !SERVICE) return { skipped: "missing config" };

  const headers = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

  // Look up the profile for this email.
  let prof;
  try {
    const r = await fetch(
      `${SUPA}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,full_name,welcomed_at`,
      { headers, cache: "no-store" }
    );
    const rows = await r.json();
    prof = Array.isArray(rows) ? rows[0] : null;
  } catch {
    return { skipped: "lookup failed" };
  }

  if (!prof) return { skipped: "no profile" };
  if (prof.welcomed_at) return { skipped: "already welcomed" };

  // Send the welcome.
  const res = await sendEmail({
    to: email,
    subject: WELCOME_SUBJECT,
    html: welcomeEmailHtml(prof.full_name),
    from: FROM,
    replyTo: REPLY_TO,
  });

  if (!res.ok) return { sent: false, error: res.error };

  // Mark welcomed only after a successful send.
  try {
    await fetch(`${SUPA}/rest/v1/profiles?id=eq.${prof.id}`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ welcomed_at: new Date().toISOString() }),
    });
  } catch {
    /* email already sent; flag write failure is non-fatal */
  }

  return { sent: true, id: res.id };
}
