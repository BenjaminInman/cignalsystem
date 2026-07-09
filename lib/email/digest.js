// Cignal System — industry news digest (daily brief / weekly summary).
//
// Email HTML is deliberately old-fashioned: table layout, inline styles, no
// flexbox/grid/SVG. That's what survives Outlook, Gmail, and Apple Mail. The
// palette mirrors the terminal UI (near-black canvas, signal gold, mono kickers).

import { activeSocials } from "@/lib/brand";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://multifamily.cignalsystem.com";

const BG = "#0A0B0D", CARD = "#111317", INK = "#ECEDEF", MUT = "#797E85";
const LINE = "#20242A", GOLD = "#F5B544", SUBTLE = "#8A9099";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const clip = (s, n) => {
  const t = String(s || "").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/[\s,;:.-]+$/, "")}…`;
};

/**
 * Stories for the digest window. Articles carry status 'extracted' once the
 * fact engine has processed them; those with a neutral summary lead, and
 * headline-only pieces backfill. A thin daily window widens rather than ship
 * an empty brief.
 */
export async function fetchArticles(days, limit = 12) {
  const pull = async (d) => {
    const since = new Date(Date.now() - d * 864e5).toISOString();
    const url =
      `${SUPA}/rest/v1/news_articles?published_at=gte.${since}&status=eq.extracted` +
      `&select=title,url,neutral_summary,published_at,news_sources(name)` +
      `&order=published_at.desc&limit=${limit * 3}`;
    const r = await fetch(url, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      cache: "no-store",
    });
    return r.ok ? (await r.json()) || [] : [];
  };

  let rows = await pull(days);
  const summarized = (rs) => rs.filter((a) => (a.neutral_summary || "").trim());
  // A daily run right after ingest can be thin — widen before shipping a stub.
  if (summarized(rows).length < 3 && days <= 2) rows = await pull(days + 2);

  const withSummary = summarized(rows);
  const rest = rows.filter((a) => !(a.neutral_summary || "").trim());
  return [...withSummary, ...rest].slice(0, limit).map((a) => ({
    title: a.title,
    url: a.url,
    summary: (a.neutral_summary || "").trim(),
    source: a.news_sources?.name || "",
    published_at: a.published_at,
  }));
}

const dayLabel = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const SOCIAL_LABEL = { x: "X", linkedin: "LinkedIn", youtube: "YouTube", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

function socialRow() {
  const list = activeSocials();
  if (!list.length) return "";
  const links = list
    .map(([k, url]) => `<a href="${esc(url)}" style="font-family:${MONO};font-size:10px;letter-spacing:.12em;color:${MUT};text-decoration:none;padding:0 9px;">${SOCIAL_LABEL[k] || k.toUpperCase()}</a>`)
    .join(`<span style="color:${LINE};">|</span>`);
  return `
    <tr><td align="center" style="padding:22px 0 0;">
      <p style="margin:0 0 8px;font-family:${MONO};font-size:9px;letter-spacing:.18em;color:${MUT};">FOLLOW THE SIGNAL</p>
      <div>${links}</div>
    </td></tr>`;
}

function storyRow(a, i, last) {
  const num = String(i + 1).padStart(2, "0");
  const meta = [a.source, dayLabel(a.published_at)].filter(Boolean).join(" &nbsp;·&nbsp; ");
  return `
  <tr><td style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr>
        <td width="34" valign="top" style="padding:0 12px 0 0;font-family:${MONO};font-size:12px;color:${GOLD};line-height:22px;">${num}</td>
        <td valign="top" style="padding:0;">
          <a href="${esc(a.url)}" style="font-family:${SANS};font-size:16px;font-weight:600;line-height:1.4;color:${INK};text-decoration:none;">${esc(a.title)}</a>
          ${a.summary ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:14px;line-height:1.65;color:${SUBTLE};">${esc(clip(a.summary, 210))}</p>` : ""}
          <p style="margin:10px 0 0;font-family:${MONO};font-size:10px;letter-spacing:.12em;color:${MUT};text-transform:uppercase;">
            ${meta ? `${meta} &nbsp;·&nbsp; ` : ""}<a href="${esc(a.url)}" style="color:${GOLD};text-decoration:none;">READ &rarr;</a>
          </p>
        </td>
      </tr>
    </table>
    ${last ? "" : `<div style="border-top:1px solid ${LINE};margin:22px 0;line-height:1px;font-size:0;">&nbsp;</div>`}
  </td></tr>`;
}

/** Plain-text alternative — improves deliverability and serves text-only clients. */
export function renderDigestText({ frequency, articles, token }) {
  const head = frequency === "daily" ? "CIGNAL SYSTEM — DAILY INDUSTRY BRIEF" : "CIGNAL SYSTEM — WEEKLY INDUSTRY SUMMARY";
  const body = articles.length
    ? articles.map((a, i) => `${String(i + 1).padStart(2, "0")}. ${a.title}${a.source ? ` (${a.source})` : ""}\n${a.summary ? `${clip(a.summary, 210)}\n` : ""}${a.url}`).join("\n\n")
    : "No new stories in this window. The market was quiet — that's a signal too.";
  return `${head}\n${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\n${body}\n\nOpen the terminal: ${SITE}/dashboard\n\nUnsubscribe: ${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}\nCignal System · Nashville, TN`;
}

export function renderDigest({ frequency, articles, token }) {
  const daily = frequency === "daily";
  const title = daily ? "Daily Industry Brief" : "Weekly Industry Summary";
  const chip = daily ? "DAILY BRIEF" : "WEEKLY SUMMARY";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const unsub = `${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

  const lead = articles[0]?.title ? clip(articles[0].title, 90) : "The market was quiet this cycle.";
  const preheader = `${articles.length} ${articles.length === 1 ? "story" : "stories"} — ${lead}`;

  const stories = articles.length
    ? articles.map((a, i) => storyRow(a, i, i === articles.length - 1)).join("")
    : `<tr><td style="font-family:${SANS};font-size:15px;line-height:1.7;color:${SUBTLE};">
         No new stories cleared the wire in this window. Quiet is itself a reading — when the flow of
         transactions and announcements thins, it usually shows up in the leading indicators first.
       </td></tr>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
<title>${esc(title)}</title>
<!--[if mso]><style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${esc(preheader)}</div>
<div style="display:none;max-height:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#8199;&shy;${"&#847;&zwnj;&nbsp;&#8199;&shy;".repeat(40)}</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="${BG}" style="background-color:${BG};">
  <tr><td align="center" style="padding:32px 14px 48px;">

    <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;max-width:600px;">

      <!-- masthead: ring mark + CIGNAL·SYSTEM wordmark, matching the site -->
      <tr><td style="padding:0 4px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            <td align="left" style="padding:0;">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
                <td valign="middle" style="padding:0 9px 0 0;line-height:0;">
                  <a href="${SITE}" style="text-decoration:none;"><img src="${SITE}/email-logo.png" width="22" height="22" alt="Cignal System" style="display:block;border:0;outline:none;width:22px;height:22px;"/></a>
                </td>
                <td valign="middle" style="padding:0;">
                  <a href="${SITE}" style="font-family:${MONO};font-size:13px;letter-spacing:.16em;color:${INK};text-decoration:none;font-weight:500;">CIGNAL<span style="color:${GOLD};">&middot;</span>SYSTEM</a>
                </td>
              </tr></table>
            </td>
            <td align="right" valign="middle" style="font-family:${MONO};font-size:9px;letter-spacing:.16em;color:${MUT};">${chip}</td>
          </tr>
        </table>
      </td></tr>

      <!-- card -->
      <tr><td bgcolor="${CARD}" style="background-color:${CARD};border:1px solid ${LINE};border-radius:14px;padding:34px 30px;">

        <h1 style="margin:0;font-family:${SANS};font-size:26px;line-height:1.25;font-weight:700;color:${INK};letter-spacing:-.01em;">${esc(title)}</h1>
        <p style="margin:8px 0 0;font-family:${SANS};font-size:13px;color:${MUT};">${esc(dateStr)}</p>
        <p style="margin:16px 0 0;font-family:${SANS};font-size:14px;line-height:1.7;color:${SUBTLE};">
          ${daily
            ? "The stories moving multifamily and the broader real-estate market today — headlines first, context second."
            : "Everything that moved the multifamily and real-estate market this week, condensed into one read."}
        </p>

        <div style="border-top:1px solid ${GOLD};opacity:.5;margin:24px 0 26px;line-height:1px;font-size:0;">&nbsp;</div>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${stories}</table>

        <div style="border-top:1px solid ${LINE};margin:30px 0 26px;line-height:1px;font-size:0;">&nbsp;</div>

        <!-- CTA (bulletproof) -->
        <table cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr><td align="center" bgcolor="${GOLD}" style="border-radius:999px;">
            <a href="${SITE}/dashboard" style="display:inline-block;padding:13px 26px;font-family:${MONO};font-size:11px;letter-spacing:.14em;font-weight:700;color:${BG};text-decoration:none;border-radius:999px;">OPEN THE TERMINAL &rarr;</a>
          </td></tr>
        </table>

        <p style="margin:22px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUT};">
          Headlines tell you what happened. The terminal tells you what it means &mdash; where these stories land
          in the cycle, and whether the leading indicators agree.
        </p>

        <!-- Ask Canary -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:26px;">
          <tr><td style="background-color:#15171C;border:1px solid ${LINE};border-radius:12px;padding:20px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
              <td width="34" valign="top" style="padding:2px 12px 0 0;line-height:0;">
                <img src="${SITE}/email-canary.png" width="20" height="23" alt="" style="display:block;border:0;width:20px;height:23px;"/>
              </td>
              <td valign="top" style="padding:0;">
                <p style="margin:0;font-family:${MONO};font-size:9px;letter-spacing:.18em;color:${GOLD};">ASK CANARY</p>
                <p style="margin:7px 0 0;font-family:${SANS};font-size:14px;line-height:1.65;color:${SUBTLE};">
                  Wondering how ${daily ? "today&rsquo;s" : "this week&rsquo;s"} headlines square with the data? Ask the desk directly &mdash;
                  it reads the live market and answers in seconds.
                </p>
                <p style="margin:12px 0 0;">
                  <a href="${SITE}/research?ask=${encodeURIComponent(daily ? "What do today's headlines mean for where we are in the cycle?" : "What did this week's news change about where we are in the cycle?")}" style="font-family:${MONO};font-size:11px;letter-spacing:.12em;color:${GOLD};text-decoration:none;">ASK CANARY &rarr;</a>
                </p>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>

      ${socialRow()}

      <!-- forward loop -->
      <tr><td align="center" style="padding:22px 10px 0;">
        <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUT};">
          Know an operator who should be reading this?
          <a href="${SITE}/news" style="color:${GOLD};text-decoration:none;">Forward it along &rarr;</a>
        </p>
      </td></tr>

      <!-- footer -->
      <tr><td style="padding:24px 10px 0;">
        <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;line-height:1.75;color:${MUT};">
          You're receiving the ${daily ? "daily brief" : "weekly summary"} because you subscribed at Cignal System.
        </p>
        <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.75;color:${MUT};">
          <a href="${unsub}" style="color:${MUT};text-decoration:underline;">Unsubscribe</a>
          &nbsp;·&nbsp; <a href="${SITE}/news" style="color:${MUT};text-decoration:underline;">Change frequency</a>
          &nbsp;·&nbsp; Cignal System, Nashville, TN
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
