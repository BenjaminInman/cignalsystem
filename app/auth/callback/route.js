// Handles the redirect from magic-link emails and email confirmations.
// Exchanges the one-time code for a session cookie, then forwards the user on.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maybeSendWelcome } from "@/lib/email/welcome";

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // One-time welcome for users who arrive via magic link / confirmation.
      // Idempotent: returning users (already welcomed) are skipped.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) await maybeSendWelcome({ email: user.email });
      } catch {
        /* never block sign-in on a welcome-email hiccup */
      }
      // Respect the real host behind Vercel's proxy so the custom domain sticks.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
