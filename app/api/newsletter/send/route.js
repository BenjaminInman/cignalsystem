export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { fetchArticles, renderDigest, renderDigestText } from "@/lib/email/digest";
import { hasTier } from "@/lib/tiers";

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
  let b = {};
  try { b = await req.json(); } catch { /* ignore */ }
  const frequency = b.frequency === "daily" ? "daily" : "weekly";
  const dryRun = Boolean(b.dryRun);

  // A real send needs the key; a dry run should still report what's missing.
  if (!dryRun && !isEmailConfigured())
    return Response.json(
      { error: "RESEND_API_KEY is not set in this environment. Add it in Vercel → Settings → Environment Variables (Production), then redeploy. Run again with dryRun:true to verify." },
      { status: 500 }
    );

  const articles = await fetchArticles(frequency === "daily" ? 1 : 7, frequency === "daily" ? 6 : 12);

  const r = await sb(`newsletter_signups?status=eq.active&frequency=eq.${frequency}&select=email,unsubscribe_token`);
  const subs = r.ok ? await r.json() : [];

  // Cross-check every subscriber against member accounts (by email) so each
  // gets the right closing pitch: free account / upgrade to Pro / none.
  const pr = await sb("profiles?email=not.is.null&select=email,tier,is_admin");
  const members = new Map((pr.ok ? await pr.json() : []).map((p) => [String(p.email).toLowerCase(), p]));
  const audienceOf = (email) => {
    const m = members.get(String(email).toLowerCase());
    if (!m) return "none";
    return m.is_admin || hasTier(m.tier, "pro") ? "pro" : "free";
  };
  const audiences = { none: 0, free: 0, pro: 0 };
  for (const s of subs) audiences[audienceOf(s.email)]++;
  if (!dryRun && !subs.length)
    return Response.json({ ok: true, frequency, recipients: 0, articles: articles.length, note: "no active subscribers" });
  if (dryRun) {
    const from = process.env.RESEND_FROM || "";
    const checks = {
      RESEND_API_KEY: isEmailConfigured() ? "set" : "MISSING",
      RESEND_FROM: from
        ? from
        : "NOT SET — will fall back to onboarding@resend.dev, which can only email your own Resend account address",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "NOT SET — links/unsubscribe will use the default production URL",
      CRON_SECRET: "set (you authenticated)",
    };
    const readyToSend = isEmailConfigured() && Boolean(from);
    if (!subs.length) checks.SUBSCRIBERS = `0 active ${frequency} subscribers — subscribe at /news to test a real send`;
    return Response.json({
      ok: true,
      dryRun: true,
      readyToSend,
      frequency,
      recipients: subs.length,
      audiences,
      articles: articles.length,
      checks,
      note: readyToSend
        ? "Config looks good. Re-run with dryRun=false to send."
        : "Fix the items marked MISSING / NOT SET before sending to real subscribers.",
    });
  }

  const subject = frequency === "daily"
    ? `Daily Brief — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : `Weekly Summary — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  let ok = 0, failed = 0;
  for (const s of subs) {
    const res = await sendEmail({
      to: s.email,
      from: FROM,
      subject,
      html: renderDigest({ frequency, articles, token: s.unsubscribe_token, audience: audienceOf(s.email) }),
      text: renderDigestText({ frequency, articles, token: s.unsubscribe_token, audience: audienceOf(s.email) }),
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

  return Response.json({ ok: true, frequency, recipients: subs.length, audiences, articles: articles.length, sent: ok, failed });
}

// Vercel Cron calls GET (with Authorization: Bearer $CRON_SECRET).
// /api/newsletter/send?frequency=daily|weekly
export async function GET(req) {
  const frequency = new URL(req.url).searchParams.get("frequency") === "weekly" ? "weekly" : "daily";
  return POST(new Request(req.url, {
    method: "POST",
    headers: { authorization: req.headers.get("authorization") || "", "content-type": "application/json" },
    body: JSON.stringify({ frequency }),
  }));
}
