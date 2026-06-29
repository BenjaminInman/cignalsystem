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

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:16px;">
            <tr>
              <td style="padding:36px 40px 28px 40px;">

                <!-- wordmark -->
                <div style="font-family:'Courier New',Courier,monospace;font-size:14px;letter-spacing:3px;color:${INK};font-weight:600;">
                  CIGNAL<span style="color:${GOLD};">&middot;</span>SYSTEM
                </div>

                <!-- kicker -->
                <div style="margin-top:28px;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:2px;color:${GOLD};text-transform:uppercase;">
                  Clearance granted
                </div>

                <!-- heading -->
                <h1 style="margin:10px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:1.25;color:${INK};font-weight:700;">
                  ${greeting}
                </h1>

                <!-- body -->
                <p style="margin:18px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${MUTED};">
                  Your account is live. You now have access to the market-intelligence terminal &mdash; the indicators, signals, and maps that tell you <span style="color:${INK};">when</span> the multifamily cycle is turning, not just how to pick a deal.
                </p>
                <p style="margin:14px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${MUTED};">
                  Start with your dashboard. Add the indicators you care about, pull up a market, and watch the leading signals move ahead of the lagging ones.
                </p>

                <!-- button -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0 0;">
                  <tr>
                    <td style="border-radius:8px;background:${GOLD};">
                      <a href="${DASHBOARD_URL}" style="display:inline-block;padding:13px 26px;font-family:'Courier New',Courier,monospace;font-size:13px;letter-spacing:1px;color:${BG};text-decoration:none;font-weight:700;">
                        ENTER THE TERMINAL &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- divider -->
                <div style="margin:32px 0 0 0;border-top:1px solid ${BORDER};"></div>

                <!-- footer -->
                <p style="margin:20px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
                  Cignal System &mdash; market intelligence for multifamily real estate.<br/>
                  Questions? Just reply to this email.
                </p>

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
