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

Record your answer by calling the record_extraction tool. Use null for anything the document does not contain; never invent values. Fill the sections the document supports. Field semantics:
{
  "income_statement": {
    "total_rental_income": number|null,
    "loss_to_lease": number|null,          // SIGNED: negative = loss to lease
    "vacancy_loss": number|null,           // POSITIVE magnitude
    "bad_debt": number|null,               // POSITIVE magnitude
    "concessions": number|null,            // POSITIVE magnitude
    "other_income": number|null,           // SUM of ALL non-rental income (e.g. "Other Income" + "Utility Reimbursement" + fees)
    "total_income": number|null,
    "total_expenses": number|null,         // total operating expenses (exclude debt service / capex if separable)
    "reported_noi": number|null,
    "period_detected": string,
    "income_line_items": [ { "label": string, "amount": number } ]
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
- other_income MUST be the SUM of EVERY non-rental income line: utility reimbursements / RUBS, plus application, pet, late, parking, laundry, storage, and miscellaneous fee income. Many statements separate these (e.g. "Other Income" and "Utility Reimbursement" as distinct lines) — add them ALL together into other_income, and itemize each in income_line_items. Never drop utility reimbursements.
- rent_roll: ALWAYS populate avg_rent_1bed/2bed/3bed/4bed when the rent roll has units of that bedroom count — this is the most important output. For each avg_rent_Nbed, take the UNIT-WEIGHTED mean of in-place rent across ALL units of that bedroom count, combining every floor plan that shares it (sum of unit rents ÷ total units), not a simple average of plan averages. Produce ONE unit_mix entry per distinct FLOOR PLAN, aggregated across its units — NEVER one row per individual unit; keep unit_mix short even for 100+ unit properties. If only market rent is available, use it and note that. Occupancy = occupied units / total units.
- property_meta.name: the property name is almost always printed at the TOP/header of the income statement and the rent roll — always capture it, along with city/state if shown.
- unit_count = the total number of physical units on the rent roll, equal to the SUM of units across all unit_mix entries; include occupied, vacant, model, and down units; exclude amenity/non-dwelling rows. Verify unit_count equals the sum of unit_mix units before answering.
- If the document is unrelated/unreadable, set fields to null and explain in notes.`;

const NUM = { type: ["number", "null"] };
const STR = { type: ["string", "null"] };
const TOOL_SCHEMA = {
  type: "object",
  properties: {
    income_statement: {
      type: "object",
      properties: {
        total_rental_income: NUM, loss_to_lease: NUM, vacancy_loss: NUM, bad_debt: NUM,
        concessions: NUM, other_income: NUM, total_income: NUM, total_expenses: NUM,
        reported_noi: NUM, period_detected: STR,
        income_line_items: { type: "array", items: { type: "object", properties: { label: { type: "string" }, amount: { type: "number" } } } },
      },
    },
    expenses: {
      type: "object",
      properties: {
        payroll: NUM, marketing: NUM, administrative: NUM, utilities: NUM,
        repairs_maintenance: NUM, contract_services: NUM, turnover: NUM, management_fee: NUM,
        insurance: NUM, property_taxes: NUM, other_expenses: NUM,
        line_items: { type: "array", items: { type: "object", properties: { label: { type: "string" }, amount: { type: "number" } } } },
      },
    },
    rent_roll: {
      type: "object",
      properties: {
        unit_count: NUM, physical_occupancy: NUM,
        avg_rent_1bed: NUM, avg_rent_2bed: NUM, avg_rent_3bed: NUM, avg_rent_4bed: NUM,
        unit_mix: {
          type: "array",
          items: { type: "object", properties: { plan: STR, bedrooms: NUM, baths: NUM, units: NUM, occupied: NUM, avg_rent: NUM } },
        },
      },
    },
    property_meta: { type: "object", properties: { name: STR, city: STR, state: STR } },
    notes: STR,
  },
  required: ["income_statement", "rent_roll", "property_meta"],
};

// One model call for ONE document, via forced tool use. Returns { parsed, usage } or { error, status }.
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
        tools: [{ name: "record_extraction", description: "Record the extracted property financials and rent-roll data.", input_schema: TOOL_SCHEMA }],
        tool_choice: { type: "tool", name: "record_extraction" },
        messages: [{ role: "user", content }],
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
  const tool = d.content.find((b) => b.type === "tool_use");
  console.log(`[extract:${tag}] stop=${stop} tool=${!!tool} in=${usage.input_tokens} out=${usage.output_tokens}`);
  if (!tool || typeof tool.input !== "object") {
    console.error(`[extract:${tag}] no tool_use block; stop=${stop} blocks=${d.content.map((b) => b.type).join(",")}`);
    const hint = stop === "max_tokens" ? "the document was very large — try uploading it on its own" : "try a clearer PDF, image, or CSV export";
    return { error: `Couldn't read the ${tag} into fields — ${hint}.`, status: 502 };
  }
  return { parsed: tool.input, usage };
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
    property_meta: parsed.property_meta || null,
    notes: parsed.notes ?? null,
  });
}
