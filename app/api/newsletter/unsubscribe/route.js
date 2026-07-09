export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const page = (title, msg) =>
  new Response(
    `<!doctype html><html><body style="margin:0;background:#0A0B0D;color:#ECEDEF;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
     <div style="text-align:center;max-width:440px;padding:32px;">
       <p style="color:#F5B544;font-family:monospace;font-size:11px;letter-spacing:.18em;margin:0 0 10px;">CIGNAL SYSTEM</p>
       <h1 style="font-size:22px;margin:0 0 10px;">${title}</h1>
       <p style="color:#797E85;font-size:14px;line-height:1.6;margin:0;">${msg}</p>
     </div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );

// One-click unsubscribe from the email footer (CAN-SPAM requirement).
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return page("Invalid link", "That unsubscribe link is missing its token.");

  const r = await fetch(`${SUPA}/rest/v1/newsletter_signups?unsubscribe_token=eq.${encodeURIComponent(token)}`, {
    method: "PATCH",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }),
  });
  const rows = r.ok ? await r.json() : [];
  if (!rows.length) return page("Link not recognized", "This link may have already been used, or the subscription no longer exists.");
  return page("You're unsubscribed", `${rows[0].email} will no longer receive the industry newsletter. You can resubscribe anytime from the News page.`);
}
