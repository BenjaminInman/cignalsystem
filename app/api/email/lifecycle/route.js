// Daily lifecycle email run (called by .github/workflows/lifecycle-emails.yml).
//   - Nurture: free members get NURTURE[step] once they are `day` days past
//     sign-up. Stops at upgrade, opt-out, or the end of the sequence.
//   - Market report: every member whose cadence is due gets a report on their
//     saved ZIP codes (free = phase + 3 headline numbers; Pro = everything).
//
// POST body: { dryRun?: true, only?: "nurture" | "reports", previewTo?: "email" }
//   previewTo sends one copy of every template to that address (no state
//   changes) so copy can be reviewed before anything goes to members.
// Auth: Authorization: Bearer $CRON_SECRET
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { NURTURE, renderNurture, renderReport } from "@/lib/email/lifecycle";
import { getHubMacro } from "@/lib/hub-macro";
import { VERTICAL_PATH, SITE_URL } from "@/lib/vertical-slug";
import { hasTier } from "@/lib/tiers";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const FROM = process.env.RESEND_FROM || "Cignal System <noreply@cignalsystem.com>";
const REPLY_TO = "ben@benjamininman.com";
const DAY = 86400000;
const CADENCE_DAYS = { weekly: 7, monthly: 30, quarterly: 91 };
const FIRST_REPORT_AFTER_DAYS = 3; // give new members a few days to save ZIPs
const MAX_ZIPS = 5;
const MIN_NURTURE_GAP_DAYS = 3; // members who joined long ago still get the series spaced out

const sb = (path, init = {}) =>
  fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });

async function readZip(zip) {
  try {
    const r = await fetch(`${SITE_URL}/api/market-read?zip=${encodeURIComponent(zip)}`, { cache: "no-store" });
    const j = await r.json();
    return j?.found ? j : null;
  } catch {
    return null;
  }
}

export async function POST(req) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch { /* empty body */ }
  const dryRun = Boolean(b.dryRun);
  const only = b.only === "nurture" || b.only === "reports" ? b.only : null;
  if (!dryRun && !isEmailConfigured()) return Response.json({ error: "RESEND_API_KEY is not set" }, { status: 500 });

  const macro = await getHubMacro().catch(() => ({ items: [] }));

  // ---- Preview mode: every template to one inbox, no state changes ----------
  if (b.previewTo) {
    const to = String(b.previewTo);
    const ctx = { first: "Benjamin", market: "multifamily", token: "preview", macro };
    const sent = [];
    for (let i = 0; i < NURTURE.length; i++) {
      const { subject, html } = renderNurture(i, ctx);
      const r = dryRun ? { ok: true } : await sendEmail({ to, subject: `[Preview ${i + 1}/${NURTURE.length}] ${subject}`, html, from: FROM, replyTo: REPLY_TO });
      sent.push({ template: `nurture ${i + 1}`, ok: r.ok, error: r.error });
    }
    const reads = (await Promise.all(["37203", "78701"].map(readZip))).filter(Boolean);
    for (const isPro of [false, true]) {
      const { subject, html } = renderReport({ reads, isPro, cadence: "monthly", market: "multifamily", token: "preview", macro });
      const r = dryRun ? { ok: true } : await sendEmail({ to, subject: `[Preview report · ${isPro ? "Pro" : "Free"}] ${subject}`, html, from: FROM, replyTo: REPLY_TO });
      sent.push({ template: `report ${isPro ? "pro" : "free"}`, ok: r.ok, error: r.error });
    }
    return Response.json({ ok: true, preview: true, to, sent });
  }

  // ---- Members ---------------------------------------------------------------
  const pr = await sb("profiles?status=eq.active&email=not.is.null&select=id,email,full_name,tier,is_admin,origin_vertical,created_at");
  const profiles = pr.ok ? await pr.json() : [];
  const sr = await sb("member_email_state?select=*");
  const states = new Map((sr.ok ? await sr.json() : []).map((s) => [s.user_id, s]));

  // Create a state row for anyone who doesn't have one yet.
  const missing = profiles.filter((p) => !states.has(p.id)).map((p) => ({ user_id: p.id }));
  if (missing.length && !dryRun) {
    const ins = await sb("member_email_state?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(missing),
    });
    if (ins.ok) for (const s of await ins.json()) states.set(s.user_id, s);
  }

  const now = Date.now();
  const log = [];
  const zipCache = new Map();
  const patch = (userId, fields) =>
    dryRun ? null : sb(`member_email_state?user_id=eq.${userId}`, { method: "PATCH", body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }) });

  for (const prof of profiles) {
    const st = states.get(prof.id) || { report_cadence: "monthly", nurture_step: 0, nurture_opt_out: false, token: "dry-run" };
    const isPro = prof.is_admin || hasTier(prof.tier, "pro");
    const market = VERTICAL_PATH[prof.origin_vertical] || "multifamily";
    const first = (prof.full_name || "").trim().split(/\s+/)[0] || "";
    const age = (now - new Date(prof.created_at).getTime()) / DAY;

    // Nurture (free members only; at most one step per run)
    const sinceLast = st.nurture_last_at ? (now - new Date(st.nurture_last_at).getTime()) / DAY : Infinity;
    if (only !== "reports" && !isPro && !st.nurture_opt_out && st.nurture_step < NURTURE.length && age >= NURTURE[st.nurture_step].day && sinceLast >= MIN_NURTURE_GAP_DAYS) {
      const { subject, html } = renderNurture(st.nurture_step, { first, market, token: st.token, macro });
      const r = dryRun ? { ok: true } : await sendEmail({ to: prof.email, subject, html, from: FROM, replyTo: REPLY_TO });
      log.push({ email: prof.email, type: `nurture ${st.nurture_step + 1}`, ok: r.ok, error: r.error });
      if (r.ok) await patch(prof.id, { nurture_step: st.nurture_step + 1, nurture_last_at: new Date().toISOString() });
    }

    // Market report
    const every = CADENCE_DAYS[st.report_cadence];
    const last = st.last_report_at ? new Date(st.last_report_at).getTime() : null;
    const due = every && (last ? (now - last) / DAY >= every - 0.5 : age >= FIRST_REPORT_AFTER_DAYS);
    if (only !== "nurture" && due) {
      const zr = await sb(`user_zip_codes?user_id=eq.${prof.id}&select=zip&order=position.asc&limit=${MAX_ZIPS}`);
      const zips = zr.ok ? (await zr.json()).map((z) => z.zip) : [];
      const reads = [];
      for (const z of zips) {
        if (!zipCache.has(z)) zipCache.set(z, await readZip(z));
        if (zipCache.get(z)) reads.push(zipCache.get(z));
      }
      const { subject, html } = renderReport({ reads, isPro, cadence: st.report_cadence, market, token: st.token, macro });
      const r = dryRun ? { ok: true } : await sendEmail({ to: prof.email, subject, html, from: FROM, replyTo: REPLY_TO });
      log.push({ email: prof.email, type: `report (${st.report_cadence}, ${reads.length} zips, ${isPro ? "pro" : "free"})`, ok: r.ok, error: r.error });
      if (r.ok) await patch(prof.id, { last_report_at: new Date().toISOString() });
    }
  }

  return Response.json({ ok: true, dryRun, members: profiles.length, sent: log.length, log });
}
