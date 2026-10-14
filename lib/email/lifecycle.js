// Lifecycle emails: the free-to-Pro nurture sequence and the personalized
// "My Markets" report. Rendering only; /api/email/lifecycle decides who is due.
//
// Every email carries a one-click unsubscribe for its own stream (nurture or
// report) via /api/email/preferences?token=..., keyed to member_email_state.

import { SITE_URL } from "@/lib/vertical-slug";

const BG = "#0A0B0D", CARD = "#111317", INK = "#ECEDEF", MUT = "#8A9099", LINE = "#20242A", GOLD = "#F5B544";
const GREEN = "#5FB97C", RED = "#E5634D", AMBER = "#E8B04B";
const MONO = "'Courier New',Courier,monospace";
const SANS = "Helvetica,Arial,sans-serif";
// CAN-SPAM requires a valid physical postal address in every commercial email.
export const POSTAL = "Cignal System LLC · 6688 Nolensville Rd, Suite 108-108 · Brentwood, TN 37027";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pref = (token, qs) => `${SITE_URL}/api/email/preferences?token=${encodeURIComponent(token)}&${qs}`;
const app = (market, path) => `${SITE_URL}/${market || "multifamily"}${path}`;

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px"><tr><td style="background:${GOLD};border-radius:4px">
    <a href="${href}" style="display:inline-block;padding:13px 24px;font-family:${MONO};font-size:12px;letter-spacing:1.5px;font-weight:700;color:${BG};text-decoration:none">${esc(label)} &rarr;</a></td></tr></table>`;
}

function shell({ preheader, kicker, body, footerLinks }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:${BG}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td style="padding:0 4px 18px"><a href="${SITE_URL}" style="text-decoration:none;font-family:${MONO};font-size:13px;letter-spacing:3px;color:${INK}">CIGNAL<span style="color:${GOLD}">&middot;</span>SYSTEM</a></td></tr>
<tr><td style="background:${CARD};border:1px solid ${LINE};border-radius:10px;padding:30px 28px">
<p style="margin:0 0 14px;font-family:${MONO};font-size:11px;letter-spacing:3px;color:${MUT}">${esc(kicker)}</p>
${body}
</td></tr>
<tr><td style="padding:20px 6px;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUT}">
${footerLinks}<br>${esc(POSTAL)}<br>
Cignal System is provided for informational and educational purposes only and is not investment, financial, legal or tax advice.
</td></tr></table></td></tr></table></body></html>`;
}

const h1 = (t) => `<h1 style="margin:0 0 16px;font-family:${SANS};font-size:26px;line-height:1.2;color:${INK}">${t}</h1>`;
const p = (t) => `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK}">${t}</p>`;
const sourceLine = (macro) =>
  macro?.attribution ? `<p style="margin:-10px 0 18px;font-family:${SANS};font-size:11px;line-height:1.5;color:${MUT}">${esc(macro.attribution)}</p>` : "";
const muted = (t) => `<p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.6;color:${MUT}">${t}</p>`;

// ---------------------------------------------------------------------------
// Free-to-Pro nurture sequence. `day` = days after sign-up the step is due.
// ---------------------------------------------------------------------------
export const NURTURE = [
  {
    day: 2,
    subject: "Which phase is your market in?",
    preheader: "Sixty seconds, one ZIP code.",
    render: ({ first, market }) => [
      h1("Which phase is your market in?"),
      p(`${first ? esc(first) + ", every" : "Every"} market moves through four phases: Recovery, Expansion, Hypersupply and Contraction. The money is made by knowing which one you're in before everyone else agrees on it.`),
      p("The fastest way to see it: open the Cycle Clock, type a ZIP code you own in or are looking at, and you'll get that market's phase along with the signals pushing it there."),
      p("While you're there, save that ZIP to your dashboard. You'll get a short report on it each month, and it's the first thing you'll see every time you log in."),
      button(app(market, "/where-are-we"), "Open the Cycle Clock"),
    ].join(""),
  },
  {
    day: 5,
    subject: "Why most investors read the cycle late",
    preheader: "Leading vs. trailing, and why mixing them hides the turn.",
    render: ({ market }) => [
      h1("Why most investors read the cycle late"),
      p("Most of the numbers people watch are trailing: last quarter's vacancy, last year's rent growth, the cap rate on deals that closed months ago. By the time they move, the turn has already happened."),
      p("Cignal keeps leading indicators (permits, starts, absorption, credit, sentiment) separate from trailing ones and never blends them. When the leaders start pulling away from the trend, that's your early warning."),
      p("Your free account shows that divergence on the Signals page. Cignal Pro opens the full indicator library behind it, so you can see exactly which leaders are moving and by how much."),
      button(app(market, "/signals"), "See what's turning"),
    ].join(""),
  },
  {
    day: 9,
    subject: "Underwrite to the cycle, not to hope",
    preheader: "Your rent growth assumption is a bet on the cycle.",
    render: ({ market }) => [
      h1("Underwrite to the cycle, not to hope"),
      p("Every pro forma makes a bet on the cycle, usually without saying so. Rent growth, vacancy and exit cap are all phase-dependent, yet most models plug in the last few years and hope they continue."),
      p("Cignal Pro's Underwriter starts from the live read instead. Type a market or ZIP and its forward assumptions fill in from where that market actually sits in the cycle. You can then stress-test the deal against the next phase."),
      p("Pro also includes the full Underwriting Model, the Exit Strategy Analyzer and Portfolio tracking, which benchmarks your properties against live rents, concessions and occupancy in their submarket."),
      button(app(market, "/upgrade?start=pro"), "Unlock Cignal Pro"),
      muted("Cignal Pro is $179 a month. Cancel any time."),
    ].join(""),
  },
  {
    day: 14,
    subject: "What the data says this month",
    preheader: "The macro layer every market is swimming in.",
    render: ({ market, macro }) => {
      const rows = (macro?.items || [])
        .map((m) => `<tr><td style="padding:9px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${MUT}">${esc(m.label)}</td>
          <td align="right" style="padding:9px 0;border-bottom:1px solid ${LINE};font-family:${MONO};font-size:15px;color:${INK}">${esc(m.value)}</td></tr>`)
        .join("");
      return [
        h1("What the data says this month"),
        p("Here's the macro layer that sits under every market right now:"),
        rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px">${rows}</table>` + sourceLine(macro) : "",
        p("Those numbers are the tide. What matters for your deals is how your market and your asset class are responding to it, which is what Pro members see in the indicator library, Market Maps and Forecasts."),
        button(app(market, "/upgrade?start=pro"), "Get the full read"),
      ].join("");
    },
  },
  {
    day: 21,
    subject: "A quick note from Benjamin",
    preheader: "Last one in this series.",
    render: ({ first, market }) => [
      h1(first ? `${esc(first)}, a quick note` : "A quick note"),
      p("I built Cignal System because after more than $500 million in multifamily acquisitions, the lesson I kept relearning was that <em>when</em> you buy matters more than <em>what</em> you buy."),
      p("If you've been using the free account, you've seen the phase calls and the signals. Pro is where the rest of the system lives: every indicator, the forecasts, the Underwriter and your portfolio benchmarked against its local market."),
      p("This is the last email in this series. If Cignal isn't the right fit yet, no hard feelings. Just reply and tell me what you'd want it to do; I read every reply."),
      button(app(market, "/upgrade?start=pro"), "Start Cignal Pro"),
      muted("Benjamin Inman<br>Founder, Cignal System"),
    ].join(""),
  },
];

export function renderNurture(step, ctx) {
  const n = NURTURE[step];
  const body = n.render(ctx);
  const html = shell({
    preheader: n.preheader,
    kicker: "CIGNAL SYSTEM",
    body,
    footerLinks: `You're receiving this because you created a free Cignal System account. <a href="${pref(ctx.token, "nurture=off")}" style="color:${MUT}">Stop these emails</a>.`,
  });
  return { subject: n.subject, html };
}

// ---------------------------------------------------------------------------
// "My Markets" report
// ---------------------------------------------------------------------------
const PHASE = { recovery: "Recovery", expansion: "Expansion", hypersupply: "Hypersupply", contraction: "Contraction" };
const DOT = { g: GREEN, a: AMBER, r: RED };
const FREE_LABELS = ["Rent Growth", "Vacancy", "Job Growth"];

function fmt(row) {
  if (row?.metric == null || !Number.isFinite(Number(row.metric))) return "—";
  const v = Number(row.metric);
  return row.unit === "%" ? `${v.toFixed(1)}%` : `${v}`;
}

function marketBlock(read, isPro) {
  const name = read?.resolved?.metroName || read?.zip || "Your market";
  const phase = PHASE[read?.lead] || "—";
  const rows = (read?.local || []).filter((r) => isPro || FREE_LABELS.includes(r.label));
  const lockedCount = isPro ? 0 : Math.max(0, (read?.local || []).length - rows.length) + (read?.national || []).length;
  const list = rows
    .map((r) => `<tr><td style="padding:7px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:13px;color:${MUT}">
        <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${DOT[r.sentiment] || MUT};margin-right:8px"></span>${esc(r.label)}</td>
        <td align="right" style="padding:7px 0;border-bottom:1px solid ${LINE};font-family:${MONO};font-size:14px;color:${INK}">${esc(fmt(r))}</td></tr>`)
    .join("");
  return `<div style="margin:0 0 22px;padding:18px;border:1px solid ${LINE};border-radius:8px">
    <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:2px;color:${MUT}">ZIP ${esc(read?.zip || "")}</p>
    <p style="margin:4px 0 2px;font-family:${SANS};font-size:16px;color:${INK}">${esc(name)}</p>
    <p style="margin:0 0 12px;font-family:${SANS};font-size:22px;font-weight:bold;color:${GOLD}">${esc(phase)}</p>
    ${list ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${list}</table>` : ""}
    ${lockedCount ? `<p style="margin:12px 0 0;font-family:${MONO};font-size:11px;letter-spacing:1px;color:${MUT}">&#128274; ${lockedCount} MORE SIGNALS IN CIGNAL PRO</p>` : ""}
  </div>`;
}

export function renderReport({ reads, isPro, cadence, market, token, macro }) {
  const label = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly" }[cadence] || "Monthly";
  const hasMarkets = reads.length > 0;
  const blocks = hasMarkets ? reads.map((r) => marketBlock(r, isPro)).join("") : "";
  const macroRows = (macro?.items || [])
    .map((m) => `<td style="padding:8px 6px;font-family:${SANS};font-size:12px;color:${MUT};text-align:center">${esc(m.label)}<br><span style="font-family:${MONO};font-size:15px;color:${INK}">${esc(m.value)}</span></td>`)
    .join("");
  const body = [
    h1(hasMarkets ? "Your markets this period" : "The macro read this period"),
    macroRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;border:1px solid ${LINE};border-radius:8px"><tr>${macroRows}</tr></table>` + sourceLine(macro) : "",
    hasMarkets
      ? blocks
      : p("Save the ZIP codes you care about on your dashboard and this report will show each one's cycle phase and the signals behind it."),
    isPro
      ? button(app(market, "/dashboard"), "Open your dashboard")
      : button(app(market, "/upgrade?start=pro"), "See every signal with Pro"),
    hasMarkets ? "" : button(app(market, "/dashboard#my-zips"), "Add your ZIP codes"),
  ].join("");
  const html = shell({
    preheader: hasMarkets ? `Cycle phase for ${reads.length} saved market${reads.length > 1 ? "s" : ""}.` : "The four-phase read, every period.",
    kicker: `${label.toUpperCase()} MARKET REPORT`,
    body,
    footerLinks: `Report frequency: <a href="${pref(token, "reports=weekly")}" style="color:${MUT}">weekly</a> · <a href="${pref(token, "reports=monthly")}" style="color:${MUT}">monthly</a> · <a href="${pref(token, "reports=quarterly")}" style="color:${MUT}">quarterly</a> · <a href="${pref(token, "reports=off")}" style="color:${MUT}">turn off</a>`,
  });
  const subject = hasMarkets
    ? reads.length === 1
      ? `${PHASE[reads[0]?.lead] || "Cycle"} read: ${reads[0]?.resolved?.metroName?.split(",")[0] || "ZIP " + reads[0]?.zip}`
      : `Your ${reads.length} markets: this period's cycle read`
    : "This period's cycle read";
  return { subject, html };
}
