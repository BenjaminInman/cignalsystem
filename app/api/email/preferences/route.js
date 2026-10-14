// One-click email preference links from lifecycle emails.
//   GET /api/email/preferences?token=<uuid>&reports=weekly|monthly|quarterly|off
//   GET /api/email/preferences?token=<uuid>&nurture=off
// The token is the member's private member_email_state.token, so no login is
// needed (the standard pattern for unsubscribe links).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { SITE_URL } from "@/lib/vertical-slug";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title, body) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Cignal System</title></head>
<body style="margin:0;background:#0A0B0D;color:#ECEDEF;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:12vh auto;padding:32px 24px;border:1px solid #20242A;border-radius:10px;background:#111317">
<p style="margin:0 0 18px;font-family:'Courier New',monospace;font-size:13px;letter-spacing:3px">CIGNAL<span style="color:#F5B544">&middot;</span>SYSTEM</p>
<h1 style="margin:0 0 12px;font-size:24px">${title}</h1><p style="margin:0 0 22px;color:#8A9099;line-height:1.6">${body}</p>
<a href="${SITE_URL}" style="color:#F5B544;font-family:'Courier New',monospace;font-size:12px;letter-spacing:1px;text-decoration:none">CIGNALSYSTEM.COM &rarr;</a></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const token = q.get("token") || "";
  const reports = q.get("reports");
  const nurture = q.get("nurture");
  if (!UUID.test(token)) return page("Link not recognized", "This preferences link is incomplete or has expired. Reply to any Cignal email and we'll update your settings by hand.");

  const fields = {};
  if (["weekly", "monthly", "quarterly", "off"].includes(reports)) fields.report_cadence = reports;
  if (nurture === "off") fields.nurture_opt_out = true;
  if (!Object.keys(fields).length) return page("Nothing to change", "That link didn't include a setting to update.");

  const r = await fetch(`${SUPA}/rest/v1/member_email_state?token=eq.${token}`, {
    method: "PATCH",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  const rows = r.ok ? await r.json() : [];
  if (!rows.length) return page("Link not recognized", "We couldn't find the subscription for this link. Reply to any Cignal email and we'll update your settings by hand.");

  if (fields.nurture_opt_out) return page("You're unsubscribed", "You won't get any more emails in this series. Your account and any market reports you've chosen are unaffected.");
  if (fields.report_cadence === "off") return page("Market reports turned off", "You won't get market reports anymore. You can turn them back on from any past report's footer.");
  return page("Frequency updated", `You'll now get your market report ${fields.report_cadence}.`);
}
