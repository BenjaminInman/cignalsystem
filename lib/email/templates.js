// Email-safe HTML templates (inline styles, table layout, web-safe fonts).
// Custom fonts and SVG don't render reliably in email clients, so the brand is
// carried by color (signal gold on dark) and a text wordmark.

const GOLD = "#F5B544";
const BG = "#0A0B0A";
const CARD = "#0E0F11";
const BORDER = "#26272b";
const INK = "#E6E7E9";
const MUTED = "#8A8F98";
const DASHBOARD_URL = "https://multifamily.cignalsystem.com/dashboard";

export const WELCOME_SUBJECT = "Clearance granted — welcome to Cignal System";

export function welcomeEmailHtml(name) {
  const firstName = (name || "").trim().split(/\s+/)[0];
  const greeting = firstName ? `Welcome to the terminal, ${escapeHtml(firstName)}.` : "Welcome to the terminal.";

  const unlock = [
    ["Indicators", "The leading-vs-lagging data behind the cycle"],
    ["Market Maps", "Rank and compare every metro, side by side"],
    ["Forecasts", "The forward drivers, before they show in the lagging data"],
    ["Signals", "Where leading and lagging diverge — the early warning"],
    ["Research", "Deeper analysis and the Canary intelligence desk"],
    ["Portfolio", "Benchmark your own assets against their submarket"],
  ];
  const rows = [];
  for (let i = 0; i < unlock.length; i += 2) {
    const cell = (pair, pad) => pair ? `
                <td width="50%" style="padding:${pad};vertical-align:top;">
                  <div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${INK};font-weight:600;">${pair[0]}</div>
                  <div style="margin-top:2px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};">${pair[1]}</div>
                </td>` : `<td width="50%">&nbsp;</td>`;
    rows.push(`<tr>${cell(unlock[i], "10px 14px 10px 0")}${cell(unlock[i + 1], "10px 0 10px 14px")}</tr>`);
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="color-scheme" content="dark"/>
    <meta name="supported-color-schemes" content="dark"/>
    <title>Welcome to Cignal System</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG};font-size:1px;line-height:1px;">Your clearance is active — the multifamily cycle-intelligence terminal is open. When beats how.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">

            <tr><td style="height:3px;background:${GOLD};line-height:3px;font-size:0;">&nbsp;</td></tr>

            <tr>
              <td style="padding:34px 40px 34px 40px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Courier New',Courier,monospace;font-size:14px;letter-spacing:3px;color:${INK};font-weight:600;">
                      CIGNAL<span style="color:${GOLD};">&middot;</span>SYSTEM
                    </td>
                    <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:2px;color:${MUTED};">
                      <span style="border:1px solid ${BORDER};border-radius:4px;padding:4px 8px;">MULTIFAMILY</span>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:32px;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:3px;color:${GOLD};text-transform:uppercase;">
                  &#9670;&nbsp; Clearance granted
                </div>

                <h1 style="margin:12px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:27px;line-height:1.25;color:${INK};font-weight:700;">
                  ${greeting}
                </h1>

                <p style="margin:18px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${MUTED};">
                  You now have access to the intelligence most of the market never sees &mdash; the leading indicators, cycle signals, and submarket data that tell you <span style="color:${INK};font-weight:600;">when</span> the multifamily cycle is turning, not just <span style="color:${INK};">how</span> to underwrite a deal. That timing is the whole edge.
                </p>

                <div style="margin:30px 0 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:${GOLD};text-transform:uppercase;">
                  What your clearance unlocks
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  ${rows.join("\n                  ")}
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 0 0;">
                  <tr>
                    <td style="border-radius:8px;background:${GOLD};">
                      <a href="${DASHBOARD_URL}" style="display:inline-block;padding:14px 28px;font-family:'Courier New',Courier,monospace;font-size:13px;letter-spacing:1px;color:${BG};text-decoration:none;font-weight:700;">
                        ENTER THE TERMINAL &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:20px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">
                  <span style="color:${INK};">First move:</span> open your dashboard, pull up a market, and watch the leading signals move ahead of the lagging ones.
                </p>

                <div style="margin:32px 0 0 0;border-top:1px solid ${BORDER};"></div>

                <p style="margin:20px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
                  <span style="color:${INK};">Cignal System</span> &mdash; market intelligence for multifamily real estate.<br/>
                  Questions, or want a walkthrough? Just reply to this email &mdash; it reaches a real person.
                </p>

              </td>
            </tr>
          </table>

          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="padding:18px 40px 0 40px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1px;color:${MUTED};">
                WHEN &gt; HOW
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
