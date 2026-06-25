export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AKEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

const FREE_TRIAL = 3;     // lifetime extractions for a free account (conversion teaser)
const PRO_DAILY_CAP = 40; // per-day ceiling for Pro (abuse / runaway guard)
const MAX_BYTES = 15 * 1024 * 1024;

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

async function fileToContent(file, label) {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  if (file.size > MAX_BYTES) throw new Error(`${label} is too large (max 15 MB).`);
  const buf = Buffer.from(await file.arrayBuffer());
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf"))
    return { blocks: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } }] };
  if (IMG[type] || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    const media = IMG[type] ? type.replace("image/jpg", "image/jpeg") : "image/png";
    return { blocks: [{ type: "image", source: { type: "base64", media_type: media, data: buf.toString("base64") } }] };
  }
  if (type === "text/csv" || type === "text/plain" || name.endsWith(".csv") || name.endsWith(".txt"))
    return { text: buf.toString("utf-8").slice(0, 60000) };
  if (/\.(xlsx|xls|xlsm)$/.test(name) || type.includes("spreadsheet") || type.includes("excel")) {
    try {
      const wb = XLSX.read(buf, { type: "buffer" });
      const out = wb.SheetNames.map((s) => `# Sheet: ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`).join("\n\n");
      return { text: out.slice(0, 80000) };
    } catch {
      throw new Error(`Couldn't read ${label} as a spreadsheet — try exporting it as PDF or CSV.`);
    }
  }
  throw new Error(`Unsupported ${label} format. Upload a PDF, image, CSV, or Excel file.`);
}

const SYSTEM = `You are a multifamily real-estate financial-data extractor for the Cignal System portfolio tracker. You read an operator's monthly operating statement (income statement / T-12) and optionally a rent roll for ONE property, and return the data as strict JSON.

Output ONLY a JSON object — no prose, no markdown, no code fences. Capture EVERYTHING you can identify; this feeds both the operator's dashboard and an anonymized nationwide research corpus, so detailed expense line items matter. Schema:
{
  "income_statement": {
    "total_rental_income": number|null,
    "loss_to_lease": number|null,          // SIGNED: negative = loss to lease
    "vacancy_loss": number|null,           // POSITIVE magnitude
    "bad_debt": number|null,               // POSITIVE magnitude
    "concessions": number|null,            // POSITIVE magnitude
    "other_income": number|null,
    "total_income": number|null,           // effective gross income, if stated
    "total_expenses": number|null,         // total operating expenses (exclude debt service / capex if separable)
    "reported_noi": number|null,
    "period_detected": string
  },
  "expenses": {                            // operating-expense detail; null where not present
    "payroll": number|null,
    "marketing": number|null,
    "administrative": number|null,
    "utilities": number|null,
    "repairs_maintenance": number|null,
    "contract_services": number|null,
    "turnover": number|null,
    "management_fee": number|null,
    "insurance": number|null,
    "property_taxes": number|null,
    "other_expenses": number|null,         // sum anything not fitting a category above
    "line_items": [ { "label": string, "amount": number } ]  // every expense line verbatim as labeled
  },
  "rent_roll": {
    "unit_count": number|null,
    "physical_occupancy": number|null,     // percent, e.g. 94.5
    "avg_rent_1bed": number|null,          // average IN-PLACE (actual) rent
    "avg_rent_2bed": number|null,
    "avg_rent_3bed": number|null,
    "avg_rent_4bed": number|null,
    "unit_mix": [ { "bedrooms": number, "baths": number|null, "units": number, "occupied": number|null, "avg_rent": number|null } ]
  },
  "property_meta": { "name": string|null, "city": string|null, "state": string|null },
  "notes": string
}

Rules:
- Extract ONLY what is present. Use null for anything missing. NEVER fabricate or estimate a number not supported by the documents.
- The user gives a TARGET MONTH. If the statement covers multiple periods (a T-12 with monthly columns), extract that month's column and say so in period_detected; if single-period, use it and say so.
- Numbers must be plain (no $, commas, parentheses). Convert accounting parentheses to negative EXCEPT vacancy_loss/bad_debt/concessions, returned as positive magnitudes.
- expenses.line_items must list EVERY operating-expense line you can read, with its original label and amount — do not drop any. Also map them into the named categories where they fit.
- rent_roll: group units by bedroom count, average the in-place rent; if only market rent is available, use it and note that. Occupancy = occupied units / total units.
- property_meta: read the property name and location from the documents if present.
- If a document is unrelated/unreadable, set its fields to null and explain in notes.`;

export async function POST(req) {
  if (!AKEY)
    return Response.json({ error: "Document extraction isn't connected yet. Please try again shortly." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to use document auto-fill." }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).single();
  const isAdmin = !!prof?.is_admin;
  const isPro = prof?.tier === "pro";

  // --- Tier-aware cap ---
  if (!isAdmin) {
    if (isPro) {
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      const used = await sbGet(
        `portfolio_extractions?user_id=eq.${user.id}&created_at=gte.${since.toISOString()}&select=id`,
        SERVICE
      );
      if (Array.isArray(used) && used.length >= PRO_DAILY_CAP)
        return Response.json({ error: `You've reached today's auto-fill limit (${PRO_DAILY_CAP}). It resets at midnight UTC.` }, { status: 429 });
    } else {
      const used = await sbGet(`portfolio_extractions?user_id=eq.${user.id}&select=id`, SERVICE);
      if (Array.isArray(used) && used.length >= FREE_TRIAL)
        return Response.json(
          { error: `You've used your ${FREE_TRIAL} free document auto-fills. Upgrade to Cignal Pro for the full workflow.`, upgrade: true },
          { status: 403 }
        );
    }
  }

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
  const formName = (form.get("propertyName") || "").toString().slice(0, 200) || null;
  const formCity = (form.get("city") || "").toString().slice(0, 120) || null;
  const formState = (form.get("state") || "").toString().slice(0, 60) || null;
  if (!income) return Response.json({ error: "Attach at least an income statement." }, { status: 400 });

  const content = [];
  const textParts = [];
  const names = [];
  try {
    const inc = await fileToContent(income, "income statement");
    names.push(income.name || "income");
    if (inc.blocks) content.push({ type: "text", text: "INCOME STATEMENT (document below):" }, ...inc.blocks);
    else textParts.push(`INCOME STATEMENT (text):\n${inc.text}`);

    if (rentRoll && typeof rentRoll.arrayBuffer === "function") {
      const rr = await fileToContent(rentRoll, "rent roll");
      names.push(rentRoll.name || "rentroll");
      if (rr.blocks) content.push({ type: "text", text: "RENT ROLL (document below):" }, ...rr.blocks);
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
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, system: SYSTEM, messages: [{ role: "user", content }] }),
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

  const meta = parsed.property_meta || {};
  const city = formCity || meta.city || null;
  const state = formState || meta.state || null;

  // Store the COMPLETE extraction for research (service role; survives even if the
  // operator edits values or never saves the snapshot).
  try {
    await fetch(`${SUPA}/rest/v1/portfolio_extractions`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: user.id,
        property_id: propertyId,
        property_name: formName || meta.name || null,
        city,
        state,
        snapshot_month: month ? `${month}-01` : null,
        filenames: names.join(", ").slice(0, 300),
        extracted: parsed,
        tokens_in: usage.input_tokens ?? null,
        tokens_out: usage.output_tokens ?? null,
      }),
    });
  } catch { /* research logging is non-critical to the user flow */ }

  // Return only the dashboard-mapping fields (the rest is captured server-side).
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
