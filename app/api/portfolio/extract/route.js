export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AKEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const DAILY_CAP = 40;
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB per file

const IMG = { "image/png": 1, "image/jpeg": 1, "image/jpg": 1, "image/webp": 1, "image/gif": 1 };

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

// Turn an uploaded File into either a Claude content block or extracted text.
async function fileToContent(file, label) {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  if (file.size > MAX_BYTES) throw new Error(`${label} is too large (max 15 MB).`);
  const buf = Buffer.from(await file.arrayBuffer());
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return {
      blocks: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } }],
    };
  }
  if (IMG[type] || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    const media = IMG[type] ? type.replace("image/jpg", "image/jpeg") : "image/png";
    return { blocks: [{ type: "image", source: { type: "base64", media_type: media, data: buf.toString("base64") } }] };
  }
  if (type === "text/csv" || type === "text/plain" || name.endsWith(".csv") || name.endsWith(".txt")) {
    return { text: buf.toString("utf-8").slice(0, 60000) };
  }
  if (/\.(xlsx|xls|xlsm)$/.test(name) || type.includes("spreadsheet") || type.includes("excel")) {
    try {
      const wb = XLSX.read(buf, { type: "buffer" });
      const out = wb.SheetNames.map(
        (s) => `# Sheet: ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`
      ).join("\n\n");
      return { text: out.slice(0, 80000) };
    } catch {
      throw new Error(`Couldn't read ${label} as a spreadsheet — try exporting it as PDF or CSV.`);
    }
  }
  throw new Error(`Unsupported ${label} format. Upload a PDF, image, CSV, or Excel file.`);
}

const SYSTEM = `You are a multifamily real-estate financial-data extractor for the Cignal System portfolio tracker. You read an operator's monthly operating statement (income statement / T-12) and optionally a rent roll for ONE property, and return the figures as strict JSON.

Output ONLY a JSON object — no prose, no markdown, no code fences. Schema:
{
  "income_statement": {
    "total_rental_income": number|null,   // gross potential / total scheduled rental income for the period
    "loss_to_lease": number|null,          // SIGNED: negative = loss to lease, positive = gain to lease
    "vacancy_loss": number|null,           // POSITIVE magnitude of vacancy loss
    "bad_debt": number|null,               // POSITIVE magnitude
    "concessions": number|null,            // POSITIVE magnitude
    "other_income": number|null,
    "total_expenses": number|null,         // total operating expenses (exclude debt service / capex if separable)
    "reported_noi": number|null,           // NOI as stated on the document, if present
    "period_detected": string              // e.g. "single month: Mar 2026" or "T-12 column for Mar 2026" or "annual 2025"
  },
  "rent_roll": {
    "unit_count": number|null,
    "physical_occupancy": number|null,     // percent, e.g. 94.5 (occupied units / total units * 100)
    "avg_rent_1bed": number|null,          // average IN-PLACE (actual) rent for 1-bed units
    "avg_rent_2bed": number|null,
    "avg_rent_3bed": number|null,
    "avg_rent_4bed": number|null
  },
  "notes": string                          // brief: assumptions, ambiguities, market-vs-actual rent, anything to reconcile
}

Rules:
- Extract ONLY what is present. Use null for anything missing. NEVER fabricate or estimate a number that isn't supported by the documents.
- The user gives a TARGET MONTH. If the statement covers multiple periods (a T-12 with monthly columns), extract the column for that month and say so in period_detected. If it is a single-period statement, use it and say so.
- Numbers must be plain (no $, commas, or parentheses). Convert accounting parentheses to negative where appropriate, EXCEPT vacancy_loss/bad_debt/concessions which are returned as positive magnitudes.
- For rent roll: group units by bedroom count and average the in-place rent. If only market rent is available, use it and note that in "notes". Occupancy = occupied units / total units.
- If a document is unrelated or unreadable, set its fields to null and explain in "notes".`;

export async function POST(req) {
  if (!AKEY)
    return Response.json({ error: "Document extraction isn't connected yet. Please try again shortly." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to use document auto-fill." }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).single();
  const isPro = prof?.is_admin || prof?.tier === "pro";
  if (!isPro)
    return Response.json({ error: "Document auto-fill is a Cignal Pro feature.", upgrade: true }, { status: 403 });

  // Daily cap (service role bypasses RLS for the count)
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const used = await sbGet(
    `portfolio_extract_log?user_id=eq.${user.id}&created_at=gte.${since.toISOString()}&select=id`,
    SERVICE
  );
  if (Array.isArray(used) && used.length >= DAILY_CAP)
    return Response.json({ error: `You've reached today's auto-fill limit (${DAILY_CAP}). It resets at midnight UTC.` }, { status: 429 });

  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Could not read the upload." }, { status: 400 });
  }
  const income = form.get("income");
  const rentRoll = form.get("rentRoll");
  const month = (form.get("month") || "").toString().slice(0, 7);
  const propertyId = (form.get("propertyId") || "").toString() || null;
  if (!income) return Response.json({ error: "Attach at least an income statement." }, { status: 400 });

  const content = [];
  const textParts = [];
  const names = [];
  try {
    const inc = await fileToContent(income, "income statement");
    names.push(income.name || "income");
    if (inc.blocks) { content.push({ type: "text", text: "INCOME STATEMENT (document below):" }, ...inc.blocks); }
    else textParts.push(`INCOME STATEMENT (text):\n${inc.text}`);

    if (rentRoll && typeof rentRoll.arrayBuffer === "function") {
      const rr = await fileToContent(rentRoll, "rent roll");
      names.push(rentRoll.name || "rentroll");
      if (rr.blocks) { content.push({ type: "text", text: "RENT ROLL (document below):" }, ...rr.blocks); }
      else textParts.push(`RENT ROLL (text):\n${rr.text}`);
    }
  } catch (e) {
    return Response.json({ error: e.message || "Could not read the files." }, { status: 400 });
  }

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "the most recent period available";
  content.push({
    type: "text",
    text: `TARGET MONTH: ${monthLabel}.\nExtract the figures for that period and return the JSON object per the schema.${
      textParts.length ? "\n\n" + textParts.join("\n\n") : ""
    }`,
  });

  let parsed, usage = {};
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: "user", content }],
      }),
    });
    const d = await r.json();
    if (!r.ok || !Array.isArray(d.content))
      return Response.json({ error: "The extractor hit an error. Please try again." }, { status: 502 });
    usage = d.usage || {};
    const raw = d.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const clean = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    parsed = JSON.parse(start >= 0 ? clean.slice(start, end + 1) : clean);
  } catch {
    return Response.json({ error: "Couldn't parse the documents into fields. Try a clearer PDF or CSV export." }, { status: 502 });
  }

  // best-effort log
  try {
    await fetch(`${SUPA}/rest/v1/portfolio_extract_log`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: user.id,
        property_id: propertyId,
        snapshot_month: month ? `${month}-01` : null,
        filenames: names.join(", ").slice(0, 300),
        tokens_in: usage.input_tokens ?? null,
        tokens_out: usage.output_tokens ?? null,
      }),
    });
  } catch { /* non-critical */ }

  const inc = parsed.income_statement || {};
  const rr = parsed.rent_roll || {};
  return Response.json({
    income_statement: {
      total_rental_income: inc.total_rental_income ?? null,
      loss_to_lease: inc.loss_to_lease ?? null,
      vacancy_loss: inc.vacancy_loss ?? null,
      bad_debt: inc.bad_debt ?? null,
      concessions: inc.concessions ?? null,
      other_income: inc.other_income ?? null,
      total_expenses: inc.total_expenses ?? null,
      reported_noi: inc.reported_noi ?? null,
      period_detected: inc.period_detected ?? null,
    },
    rent_roll: {
      unit_count: rr.unit_count ?? null,
      physical_occupancy: rr.physical_occupancy ?? null,
      avg_rent_1bed: rr.avg_rent_1bed ?? null,
      avg_rent_2bed: rr.avg_rent_2bed ?? null,
      avg_rent_3bed: rr.avg_rent_3bed ?? null,
      avg_rent_4bed: rr.avg_rent_4bed ?? null,
    },
    notes: parsed.notes ?? null,
  });
}
