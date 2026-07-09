export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { fetchArticles, renderDigest } from "@/lib/email/digest";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const FROM = process.env.RESEND_FROM || "Cignal System <noreply@cignalsystem.com>";

const sb = async (path, init = {}) =>
  fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });

// POST /api/newsletter/send  { frequency: "daily" | "weekly", dryRun?: true }
// Auth: Authorization: Bearer $CRON_SECRET
export async function POST(req) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isEmailConfigured()) return Response.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

  let b = {};
  try { b = await req.json(); } catch { /* ignore */ }
  const frequency = b.frequency === "daily" ? "daily" : "weekly";
  const dryRun = Boolean(b.dryRun);

  const articles = await fetchArticles(frequency === "daily" ? 1 : 7, frequency === "daily" ? 6 : 12);

  const r = await sb(`newsletter_signups?status=eq.active&frequency=eq.${frequency}&select=email,unsubscribe_token`);
  const subs = r.ok ? await r.json() : [];
  if (!subs.length) return Response.json({ ok: true, frequency, recipients: 0, articles: articles.length, note: "no active subscribers" });
  if (dryRun) return Response.json({ ok: true, dryRun: true, frequency, recipients: subs.length, articles: articles.length });

  const subject = frequency === "daily"
    ? `Daily Brief — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : `Weekly Summary — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  let ok = 0, failed = 0;
  for (const s of subs) {
    const res = await sendEmail({
      to: s.email,
      from: FROM,
      subject,
      html: renderDigest({ frequency, articles, token: s.unsubscribe_token }),
    });
    if (res.ok) {
      ok++;
      await sb(`newsletter_signups?email=eq.${encodeURIComponent(s.email)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_sent_at: new Date().toISOString() }),
      });
    } else failed++;
  }

  await sb("newsletter_sends", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ frequency, recipients: subs.length, articles: articles.length, ok, failed }),
  });

  return Response.json({ ok: true, frequency, recipients: subs.length, articles: articles.length, sent: ok, failed });
}
