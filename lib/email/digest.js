// Builds the industry news digest (daily brief / weekly summary) from the
// news_articles table populated by the ingest-news job. Server-only.

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://multifamily.cignalsystem.com";

const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Newest published articles within the lookback window. */
export async function fetchArticles(days, limit = 12) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const url =
    `${SUPA}/rest/v1/news_articles?published_at=gte.${since}&status=eq.ok` +
    `&select=title,url,neutral_summary,published_at&order=published_at.desc&limit=${limit}`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    cache: "no-store",
  });
  if (!r.ok) return [];
  return (await r.json()) || [];
}

const GOLD = "#F5B544", BG = "#0A0B0D", CARD = "#111317", INK = "#ECEDEF", MUT = "#797E85", LINE = "#20242A";

/** Brand-styled HTML email. `token` powers the required unsubscribe link. */
export function renderDigest({ frequency, articles, token }) {
  const daily = frequency === "daily";
  const title = daily ? "Daily Industry Brief" : "Weekly Industry Summary";
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const items = articles
    .map(
      (a) => `
      <tr><td style="padding:0 0 22px 0;">
        <a href="${esc(a.url)}" style="color:${INK};font-size:16px;font-weight:600;line-height:1.4;text-decoration:none;">${esc(a.title)}</a>
        ${a.neutral_summary ? `<p style="margin:8px 0 0;color:${MUT};font-size:14px;line-height:1.6;">${esc(a.neutral_summary)}</p>` : ""}
        <p style="margin:8px 0 0;"><a href="${esc(a.url)}" style="color:${GOLD};font-size:12px;letter-spacing:.08em;text-decoration:none;font-family:monospace;">READ &rarr;</a></p>
      </td></tr>`
    )
    .join("");

  const unsub = `${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

  return `<!doctype html><html><body style="margin:0;padding:0;background:${BG};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:${CARD};border:1px solid ${LINE};border-radius:14px;padding:32px;" cellpadding="0" cellspacing="0">
        <tr><td>
          <p style="margin:0 0 4px;color:${GOLD};font-family:monospace;font-size:11px;letter-spacing:.18em;">CIGNAL SYSTEM</p>
          <h1 style="margin:0;color:${INK};font-size:24px;">${title}</h1>
          <p style="margin:6px 0 26px;color:${MUT};font-size:13px;">${dateStr}</p>
        </td></tr>
        ${
          items ||
          `<tr><td style="color:${MUT};font-size:14px;padding-bottom:20px;">No new stories in this window. The market was quiet — that's a signal too.</td></tr>`
        }
        <tr><td style="border-top:1px solid ${LINE};padding-top:22px;">
          <a href="${SITE}/dashboard" style="display:inline-block;background:${GOLD};color:${BG};font-family:monospace;font-size:12px;letter-spacing:.1em;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:600;">OPEN THE TERMINAL</a>
        </td></tr>
        <tr><td style="padding-top:26px;color:${MUT};font-size:11px;line-height:1.7;">
          You're receiving the ${daily ? "daily brief" : "weekly summary"} because you subscribed at Cignal System.<br/>
          <a href="${unsub}" style="color:${MUT};text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; Cignal System, Nashville, TN
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
