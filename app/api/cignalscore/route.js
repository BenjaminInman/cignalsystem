export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { computeResult, isValidAnswers } from "@/lib/cignalscore";
import { verticalFromRequest } from "@/lib/vertical-request";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const email = (body.email || "").toString().trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email))
    return Response.json({ error: "Enter a valid email to unlock your results." }, { status: 400 });

  const answers = body.answers;
  if (!isValidAnswers(answers))
    return Response.json({ error: "Your answers didn't come through. Please retake the assessment." }, { status: 400 });

  const source = ((body.source || "website").toString().trim().slice(0, 120)) || "website";

  // Authoritative scoring happens here, server-side.
  const result = computeResult(answers);

  // If the visitor happens to be signed in, link the lead to their profile.
  let profile_id = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) profile_id = user.id;
  } catch {
    /* anonymous visitor — expected */
  }

  // Persist the lead (service role bypasses RLS). Best-effort: a write hiccup
  // should never stop someone from seeing the results they just unlocked.
  if (SUPA && SERVICE) {
    try {
      await fetch(`${SUPA}/rest/v1/assessment_leads`, {
        method: "POST",
        headers: {
          apikey: SERVICE,
          Authorization: `Bearer ${SERVICE}`,
          "content-type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          email,
          cignal_score: result.score,
          score_band: result.band.label,
          dominant_bias: result.dominant_bias,
          answers,
          dimension_scores: result.dimension_scores,
          source,
          profile_id,
          // Derived from the request host, never client-supplied.
          origin_vertical: verticalFromRequest(req),
        }),
      });
    } catch {
      /* lead capture is best-effort */
    }
  }

  return Response.json({
    score: result.score,
    band: result.band,
    dominant_bias: result.dominant_bias,
    dimension_scores: result.dimension_scores,
  });
}
