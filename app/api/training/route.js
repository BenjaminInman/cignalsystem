export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmail, isEmailConfigured } from "@/lib/email/resend";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTIFY = process.env.TRAINING_NOTIFY_EMAIL || "info@cignalsystem.com";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);

// Public: capture a training/certification application.
export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch { /* ignore */ }

  const name = clip(b.name, 120);
  const email = clip((b.email || "").toLowerCase(), 200);
  const company = clip(b.company, 160);
  const phone = clip(b.phone, 40);
  const role = clip(b.role, 60);
  const portfolio = clip(b.portfolio, 200);
  const goals = clip(b.goals, 2000);
  const vertical = clip(b.vertical, 60) || "multifamily";

  if (!name) return Response.json({ error: "Please enter your name." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  try {
    const r = await fetch(`${SUPA}/rest/v1/training_applications`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ name, email, company, phone, role, portfolio, goals, vertical }),
    });
    if (!r.ok) return Response.json({ error: "Couldn't submit your application. Please try again." }, { status: 502 });
  } catch {
    return Response.json({ error: "Couldn't submit your application. Please try again." }, { status: 502 });
  }

  // Best-effort admin notification — never blocks the applicant's success.
  if (isEmailConfigured()) {
    const rows = [
      ["Name", name], ["Email", email], ["Company", company], ["Phone", phone],
      ["Role", role], ["Portfolio / markets", portfolio], ["Goals", goals], ["Track", vertical],
    ].filter(([, v]) => v);
    const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;">
      <h2 style="margin:0 0 4px;">New training application</h2>
      <p style="color:#666;margin:0 0 16px;font-size:13px;">Submitted ${new Date().toLocaleString("en-US")}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        ${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;border:1px solid #eee;background:#fafafa;font-weight:600;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:8px 12px;border:1px solid #eee;">${String(v).replace(/</g, "&lt;")}</td></tr>`).join("")}
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#666;">Follow up from the admin panel &rarr; Training Applications.</p>
    </div>`;
    try {
      await sendEmail({ to: NOTIFY, subject: `Training application — ${name}${company ? ` (${company})` : ""}`, html, replyTo: email });
    } catch { /* non-blocking */ }
  }

  return Response.json({ ok: true });
}
