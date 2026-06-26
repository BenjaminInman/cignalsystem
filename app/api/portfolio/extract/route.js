export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AKEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

const FREE_TRIAL = 3;
const PRO_DAILY_CAP = 40;
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
  if (/\.(xlsx|xls|xlsm|xlsb)$/.test(name) || type.includes("spreadsheet") || type.includes("ms-excel") || type.includes("excel")) {
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

const SYSTEM = `You are a multifamily real-estate financial-data extractor for the Cignal System portfolio tracker. You are given ONE document for one property — either an operating statement (income statement / T-12) or a rent roll — and return the data as strict JSON. Fill the sections the document supports; use null for everything it does not contain.

Output ONLY the JSON object — begin with { and end with }. Do NOT write any reasoning, explanation, preamble, or commentary. Never use '...', ellipses, or placeholder values; emit complete values only. Keep "notes" to one short sentence. Schema:
{
  "income_statement": {
    "total_rental_income": number|null,
    "loss_to_lease": number|null,          // SIGNED: negative = loss to lease
    "vacancy_loss": number|null,           // POSITIVE magnitude
    "bad_debt": number|null,               // POSITIVE magnitude
    "concessions": number|null,            // POSITIVE magnitude
    "other_income": number|null,
    "total_income": number|null,
    "total_expenses": number|null,         // total operating expenses (exclude debt service / capex if separable)
    "reported_noi": number|null,
    "period_detected": string
  },
  "expenses": {
    "payroll": number|null, "marketing": number|null, "administrative": number|null,
    "utilities": number|null, "repairs_maintenance": number|null, "contract_services": number|null,
    "turnover": number|null, "management_fee": number|null, "insurance": number|null,
    "property_taxes": number|null, "other_expenses": number|null,
    "line_items": [ { "label": string, "amount": number } ]
  },
  "rent_roll": {
    "unit_count": number|null,
    "physical_occupancy": number|null,
    "avg_rent_1bed": number|null, "avg_rent_2bed": number|null,
    "avg_rent_3bed": number|null, "avg_rent_4bed": number|null,
    "unit_mix": [ { "plan": string|null, "bedrooms": number, "baths": number|null, "units": number, "occupied": number|null, "avg_rent": number|null } ]
  },
  "property_meta": { "name": string|null, "city": string|null, "state": string|null },
  "notes": string
}

Rules:
- Extract ONLY what is present. Use null for anything missing. NEVER fabricate or estimate a number not supported by the document.
- The user gives a TARGET MONTH. If the document covers multiple periods (a T-12 with monthly columns), extract that month's column and say so in period_detected; if single-period, use it and say so.
- Transcribe every figure EXACTLY as printed, including cents; never round, recompute totals, or estimate — use the document's own stated totals and subtotals verbatim.
- Numbers must be plain (no $, commas, parentheses). Convert accounting parentheses to negative EXCEPT vacancy_loss/bad_debt/concessions, returned as positive magnitudes.
- expenses.line_items must list EVERY operating-expense line you can read, with its original label and amount. Also map them into the named categories where they fit.
- rent_roll: ALWAYS populate avg_rent_1bed/2bed/3bed/4bed when the rent roll has units of that bedroom count — this is the most important output. For each avg_rent_Nbed, take the UNIT-WEIGHTED mean of in-place rent across ALL units of that bedroom count, combining every floor plan that shares it (sum of unit rents ÷ total units), not a simple average of plan averages. Produce ONE unit_mix entry per distinct FLOOR PLAN, aggregated across its units — NEVER one row per individual unit; keep unit_mix short even for 100+ unit properties. If only market rent is available, use it and note that. Occupancy = occupied units / total units.
- property_meta: read the property name and location from the document if present.
- If the document is unrelated/unreadable, set fields to null and explain in notes.`;

// One model call for ONE document. Returns { parsed, usage } or { error, status }.
async function callModel(content, tag) {
  let d;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: "user", content }, { role: "assistant", content: "{" }],
      }),
    });
    d = await r.json();
    if (!r.ok) {
      console.error(`[extract:${tag}] anthropic non-200`, r.status, JSON.stringify(d).slice(0, 600));
      return { error: "The extraction model returned an error. Please try again in a moment.", status: 502 };
    }
  } catch (e) {
    console.error(`[extract:${tag}] fetch threw:`, e?.message);
    return { error: "Couldn't reach the extraction model. Please try again.", status: 502 };
  }
  if (!Array.isArray(d?.content)) {
    console.error(`[extract:${tag}] unexpected shape:`, JSON.stringify(d).slice(0, 600));
    return { error: "The extractor returned an unexpected response. Please try again.", status: 502 };
  }
  const usage = d.usage || {};
  const stop = d.stop_reason;
  const raw = ("{" + d.content.filter((b) => b.type === "text").map((b) => b.text).join("\n")).trim();
  console.log(`[extract:${tag}] stop=${stop} len=${raw.length} in=${usage.input_tokens} out=${usage.output_tokens}`);
  try {
    let clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) clean = clean.slice(start, end + 1);
    return { parsed: JSON.parse(clean), usage };
  } catch (e) {
    console.error(`[extract:${tag}] parse failed: ${e?.message} | stop=${stop} | head=${raw.slice(0, 160)} | tail=${raw.slice(-160)}`);
    const hint = stop === "max_tokens" ? "the document was very large" : "try a clearer PDF, image, or CSV export";
    return { error: `Couldn't read the ${tag} into fields — ${hint}.`, status: 502 };
  }
}

const pick = (...vals) => {
  for (const v of vals) if (v !== null && v !== undefined && v !== "") return v;
  return null;
};

export async function POST(req) {
  if (!AKEY)
    return Response.json({ error: "Document extraction isn't connected yet. Please try again shortly." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to use document auto-fill." }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).single();
  const isAdmin = !!prof?.is_admin;
  const isPro = prof?.tier === "pro";

  if (!isAdmin) {
    if (isPro) {
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      const used = await sbGet(`portfolio_extractions?user_id=eq.${user.id}&created_at=gte.${since.toISOString()}&select=id`, SERVICE);
      if (Array.isArray(used) && used.length >= PRO_DAILY_CAP)
        return Response.json({ error: `You've reached today's auto-fill limit (${PRO_DAILY_CAP}). It resets at midnight UTC.` }, { status: 429 });
    } else {
      const used = await sbGet(`portfolio_extractions?user_id=eq.${user.id}&select=id`, SERVICE);
      if (Array.isArray(used) && used.length >= FREE_TRIAL)
        return Response.json({ error: `You've used your ${FREE_TRIAL} free document auto-fills. Upgrade to Cignal Pro for the full workflow.`, upgrade: true }, { status: 403 });
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

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "the most recent period available";
  const instr = `TARGET MONTH: ${monthLabel}. Extract the figures for that period and return the JSON object per the schema.`;

  const names = [];
  const calls = [];
  try {
    const inc = await fileToContent(income, "income statement");
    names.push(income.name || "income");
    const incContent = inc.blocks
      ? [{ type: "text", text: "This is the INCOME STATEMENT for one property." }, ...inc.blocks, { type: "text", text: instr }]
      : [{ type: "text", text: `This is the INCOME STATEMENT for one property.\n\n${inc.text}\n\n${instr}` }];
    calls.push(callModel(incContent, "income"));

    if (rentRoll && typeof rentRoll.arrayBuffer === "function") {
      const rr = await fileToContent(rentRoll, "rent roll");
      names.push(rentRoll.name || "rentroll");
      const rrContent = rr.blocks
        ? [{ type: "text", text: "This is the RENT ROLL for one property." }, ...rr.blocks, { type: "text", text: instr }]
        : [{ type: "text", text: `This is the RENT ROLL for one property.\n\n${rr.text}\n\n${instr}` }];
      calls.push(callModel(rrContent, "rentroll"));
    }
  } catch (e) {
    return Response.json({ error: e.message || "Could not read the files." }, { status: 400 });
  }

  // Process documents in parallel — keeps wall-clock well under the function limit.
  const results = await Promise.all(calls);
  const incomeRes = results[0];
  const rrRes = results[1]; // may be undefined

  // The income statement is required; if it failed outright, surface the reason.
  if (!incomeRes?.parsed)
    return Response.json({ error: incomeRes?.error || "Couldn't read the income statement." }, { status: incomeRes?.status || 502 });

  const ip = incomeRes.parsed || {};
  const rp = rrRes?.parsed || {};
  const usage = {
    input_tokens: (incomeRes?.usage?.input_tokens || 0) + (rrRes?.usage?.input_tokens || 0),
    output_tokens: (incomeRes?.usage?.output_tokens || 0) + (rrRes?.usage?.output_tokens || 0),
  };
  const im = ip.property_meta || {};
  const rm = rp.property_meta || {};
  const parsed = {
    income_statement: ip.income_statement || null,
    expenses: ip.expenses || null,
    rent_roll: pick(rp.rent_roll, ip.rent_roll),
    property_meta: { name: pick(im.name, rm.name), city: pick(im.city, rm.city), state: pick(im.state, rm.state) },
    notes: [ip.notes, rp.notes, rrRes?.error].filter(Boolean).join(" "),
  };

  const meta = parsed.property_meta || {};
  const city = formCity || meta.city || null;
  const state = formState || meta.state || null;

  // Store the COMPLETE extraction for research (service role; survives edits / no-save).
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
  } catch { /* research logging is non-critical */ }

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
