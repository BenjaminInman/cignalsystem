// Server-only Resend helper. NEVER import this from a client component —
// it reads RESEND_API_KEY, which must never reach the browser.
//
// This sends APP-level emails (welcome notes, Cignal Score results, alerts).
// It is NOT what sends Supabase auth emails (confirmation / magic link /
// password reset) — those are handled by Supabase once its SMTP is pointed
// at Resend, and require no code here.
//
// Sending rules while your domain is still unverified in Resend:
//   - `from` must be onboarding@resend.dev
//   - `to`   must be your Resend account email (ben@benjamininman.com)
// Once cignalsystem.com is verified, set RESEND_FROM (e.g. noreply@cignalsystem.com)
// and you can send to anyone.

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

// Single shared client. null when the key isn't set, so callers can degrade
// gracefully instead of throwing at import time.
export const resend = apiKey ? new Resend(apiKey) : null;

export function isEmailConfigured() {
  return Boolean(apiKey);
}

/**
 * Send a transactional email via Resend.
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, html, from }) {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY is not set in the environment." };
  }
  const sender = from || process.env.RESEND_FROM || "onboarding@resend.dev";
  try {
    const { data, error } = await resend.emails.send({ from: sender, to, subject, html });
    if (error) return { ok: false, error: error.message || String(error) };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
