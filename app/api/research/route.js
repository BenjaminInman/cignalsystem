export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getLiveIndicators } from "@/lib/indicators-live";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AKEY = process.env.ANTHROPIC_API_KEY;

const MODEL = "claude-sonnet-4-6";
const DAILY_CAP = 30;

async function sbGet(path, key) {
  try {
    const r = await fetch(`${SUPA}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function buildContext() {
  const parts = [];

  const comp = await sbGet(
    "composite_signal?id=eq.1&select=label,tone,confidence,bull_count,bear_count,neutral_count",
    ANON
  );
  if (comp?.[0]) {
    const c = comp[0];
    parts.push(
      `COMPOSITE SIGNAL: ${c.label} at ${c.confidence}% confidence (bullish weight ${c.bull_count}, bearish ${c.bear_count}, neutral ${c.neutral_count}).`
    );
  }

  const sig = await sbGet(
    "signal_feed?is_active=eq.true&select=title,tone,body,confidence&order=published_at.desc&limit=8",
    ANON
  );
  if (Array.isArray(sig) && sig.length) {
    parts.push("\nACTIVE SIGNALS:");
    for (const s of sig)
      parts.push(`- [${(s.tone || "").toUpperCase()}] ${s.title}: ${s.body}${s.confidence != null ? ` (confidence ${s.confidence})` : ""}`);
  }

  try {
    const live = await getLiveIndicators();
    const lines = Object.entries(live || {}).map(
      ([name, v]) =>
        `- ${name}: ${v.value}${v.unit ? " " + v.unit : ""}${v.change ? `, ${v.change}` : ""}${v.note ? ` — ${v.note}` : ""}`
    );
    if (lines.length) {
      parts.push("\nCURRENT INDICATORS (national):");
      parts.push(...lines);
    }
  } catch {
    /* indicators optional */
  }

  const mig = await sbGet(
    "migration_rankings?select=source,report_year,list_type,rank,market&rank=lte.5&order=source.asc,list_type.asc,rank.asc",
    ANON
  );
  if (Array.isArray(mig) && mig.length) {
    parts.push("\nTOP MIGRATION MARKETS (top 5 per list):");
    const grp = {};
    for (const m of mig) (grp[`${m.source.toUpperCase()} ${m.list_type} ${m.report_year}`] ||= []).push(`${m.rank}. ${m.market}`);
    for (const [k, arr] of Object.entries(grp)) parts.push(`- ${k}: ${arr.join("; ")}`);
  }

  return parts.join("\n");
}

export async function POST(req) {
  if (!AKEY)
    return Response.json({ error: "The research engine isn't connected yet. Please try again shortly." }, { status: 503 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to use the research desk." }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).single();
  const isPro = prof?.is_admin || prof?.tier === "pro";
  if (!isPro)
    return Response.json({ error: "The Research desk is a Cignal Pro feature.", upgrade: true }, { status: 403 });

  let body = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const question = (body.question || "").toString().trim().slice(0, 500);
  if (!question) return Response.json({ error: "Ask a question to get started." }, { status: 400 });

  // Daily cap (service role bypasses RLS for the count)
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const used = await sbGet(
    `research_log?user_id=eq.${user.id}&created_at=gte.${since.toISOString()}&select=id`,
    SERVICE
  );
  if (Array.isArray(used) && used.length >= DAILY_CAP)
    return Response.json(
      { error: `You've reached today's limit of ${DAILY_CAP} questions. It resets at midnight UTC.` },
      { status: 429 }
    );

  const ctx = await buildContext();

  const system = `You are the Cignal System research desk — an institutional multifamily real-estate market-intelligence analyst. Cignal reads the market through a four-phase cycle (Recovery, Expansion, Hyper-Supply, Recession) and separates LEADING indicators (which move first) from TRAILING ones (which confirm later).

Rules:
- Answer ONLY from the live Cignal data provided below. Never invent numbers, market scores, cap rates, or figures not present in the data. If the data does not cover the question, say so plainly and point to what IS available.
- Be specific: cite the actual values and their direction.
- When relevant, frame the answer in terms of leading vs. trailing indicators and the current cycle phase.
- Audience is sophisticated multifamily investors and operators. Be concise, direct, analytical. No fluff, no hedging about being an AI, no generic disclaimers.
- Maximum 2-4 short paragraphs, plain prose.

LIVE CIGNAL DATA (current):
${ctx}`;

  let answer = "";
  let usage = {};
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system,
        messages: [{ role: "user", content: question }],
      }),
    });
    const d = await r.json();
    if (!r.ok || !Array.isArray(d.content))
      return Response.json({ error: "The research engine hit an error. Please try again." }, { status: 502 });
    answer = d.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    usage = d.usage || {};
  } catch {
    return Response.json({ error: "The research engine is temporarily unavailable." }, { status: 502 });
  }

  // Log (service role) — best-effort, never blocks the answer
  try {
    await fetch(`${SUPA}/rest/v1/research_log`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: user.id,
        question,
        answer,
        tokens_in: usage.input_tokens ?? null,
        tokens_out: usage.output_tokens ?? null,
      }),
    });
  } catch {
    /* logging is non-critical */
  }

  return Response.json({ answer });
}
