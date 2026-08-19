export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { BUDGET_CATEGORIES, CATEGORY_KEYS, CAT_BY_KEY } from "@/lib/budget/taxonomy";

const AKEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const MAX_BYTES = 15 * 1024 * 1024;
const IMG = { "image/png": 1, "image/jpeg": 1, "image/jpg": 1, "image/webp": 1, "image/gif": 1 };

async function fileToContent(file) {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 15 MB).");
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
    return { text: buf.toString("utf-8").slice(0, 90000) };
  if (/\.(xlsx|xls|xlsm|xlsb)$/.test(name) || type.includes("spreadsheet") || type.includes("ms-excel") || type.includes("excel")) {
    try {
      const wb = XLSX.read(buf, { type: "buffer" });
      const out = wb.SheetNames.map((s) => `# Sheet: ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`).join("\n\n");
      return { text: out.slice(0, 110000) };
    } catch {
      throw new Error("Couldn't read that spreadsheet — try exporting as PDF or CSV.");
    }
  }
  throw new Error("Unsupported format. Upload an Excel, PDF, image, or CSV T-12.");
}

const CAT_GUIDE = BUDGET_CATEGORIES
  .filter((c) => c.key !== "review")
  .map((c) => `  "${c.key}" — ${c.label}${c.section === "excluded" ? " (capex, debt service, depreciation/amortization, partnership/non-operating — NOT part of the operating budget)" : ""}`)
  .join("\n");

const SYSTEM = `You are a multifamily operating-statement parser for the Cignal System Budget Builder. You are given ONE trailing-12 / operating income statement for a single property, exported from any property-management system (RealPage, Yardi, AppFolio, Buildium, Entrata, Fortress, etc.). Every system labels and codes accounts differently — map by MEANING, not by code or exact wording.

Return the data by calling record_budget_base. Extract EVERY leaf line item (an actual account line with a dollar figure — not section subtotals or "Total ..." rows). For each line, capture its printed label and its ANNUAL amount, and assign it to exactly one canonical category by what the line represents.

Canonical categories (use the key on the left):
${CAT_GUIDE}
  "review" — use ONLY when you genuinely cannot tell what a line is.

Rules:
- ANNUAL amount: if the statement has an annual / trailing-12 / "Total" column, use THAT column for every line (never a single month). If it is single-period with no annual column, use the figure present and say so in period_detected. Always state which column you used in period_detected.
- Transcribe each figure EXACTLY as printed (keep cents). Convert accounting parentheses to negative numbers. Do NOT recompute or invent — omit a line rather than guess its amount.
- Map by meaning: "Salaries & Wages", "Payroll - Office", "500020 - Management Salaries" all → payroll. "RUBS", "Utility Reimbursement", "Water Reimbursement" → utility_reimb (this is INCOME, keep it separate from the utilities EXPENSE). "Rent - Apartments", "Market Rent", "Gross Potential Rent" → market_rent. Property insurance → insurance; real estate / property taxes → property_taxes; management fee → management_fee.
- below_noi: capital expenditures, debt service / mortgage interest, depreciation, amortization, partnership/entity expenses, renovation capital — assign these to "below_noi" so they are excluded from the operating budget.
- Do NOT emit "Total ...", "NOI", "Net Operating Income", or section-header rows as line items.
- property_meta: the property name/city/state is almost always in the statement header — capture it.`;

const NUM = { type: ["number", "null"] };
const STR = { type: ["string", "null"] };
const TOOL_SCHEMA = {
  type: "object",
  properties: {
    property_meta: { type: "object", properties: { name: STR, city: STR, state: STR } },
    period_detected: STR,
    line_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          category: { type: "string", enum: CATEGORY_KEYS },
          annual_amount: { type: "number" },
        },
        required: ["label", "category", "annual_amount"],
      },
    },
  },
  required: ["property_meta", "line_items"],
};

async function callModel(content) {
  let d;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 16000, system: SYSTEM,
        tools: [{ name: "record_budget_base", description: "Record the parsed, categorized operating-statement line items.", input_schema: TOOL_SCHEMA }],
        tool_choice: { type: "tool", name: "record_budget_base" },
        messages: [{ role: "user", content }],
      }),
    });
    d = await r.json();
    if (!r.ok) { console.error("[budget:extract] non-200", r.status, JSON.stringify(d).slice(0, 500)); return { error: "The extractor returned an error. Please try again.", status: 502 }; }
  } catch (e) { console.error("[budget:extract] fetch threw", e?.message); return { error: "Couldn't reach the extractor. Please try again.", status: 502 }; }
  if (!Array.isArray(d?.content)) return { error: "Unexpected extractor response.", status: 502 };
  const tool = d.content.find((b) => b.type === "tool_use");
  console.log(`[budget:extract] stop=${d.stop_reason} tool=${!!tool} in=${d.usage?.input_tokens} out=${d.usage?.output_tokens} lines=${tool?.input?.line_items?.length}`);
  if (!tool || typeof tool.input !== "object") {
    const hint = d.stop_reason === "max_tokens" ? "the statement was very large — upload just the T-12 tab" : "try a clearer Excel, PDF, or CSV export";
    return { error: `Couldn't parse the statement — ${hint}.`, status: 502 };
  }
  return { parsed: tool.input, usage: d.usage || {} };
}

export async function POST(req) {
  if (!AKEY) return Response.json({ error: "Extraction isn't connected yet. Please try again shortly." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to use the Budget Builder." }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).single();
  if (!prof?.is_admin && prof?.tier !== "pro")
    return Response.json({ error: "The Budget Builder is a Cignal Pro feature.", upgrade: true }, { status: 403 });

  let form;
  try { form = await req.formData(); } catch { return Response.json({ error: "Could not read the upload." }, { status: 400 }); }
  const t12 = form.get("t12");
  if (!t12) return Response.json({ error: "Attach a T-12 / operating statement." }, { status: 400 });

  let content;
  try {
    const f = await fileToContent(t12);
    content = f.blocks
      ? [{ type: "text", text: "This is a trailing-12 / operating income statement for one property." }, ...f.blocks, { type: "text", text: "Extract and categorize every leaf line item per your instructions." }]
      : [{ type: "text", text: `This is a trailing-12 / operating income statement for one property.\n\n${f.text}\n\nExtract and categorize every leaf line item per your instructions.` }];
  } catch (e) { return Response.json({ error: e.message || "Could not read the file." }, { status: 400 }); }

  const res = await callModel(content);
  if (!res?.parsed) return Response.json({ error: res?.error || "Couldn't parse the statement." }, { status: res?.status || 502 });

  // Roll up by category, server-side (single source of truth for totals).
  const lines = Array.isArray(res.parsed.line_items) ? res.parsed.line_items : [];
  const cats = {};
  for (const li of lines) {
    const key = CAT_BY_KEY[li.category] ? li.category : "review";
    const amt = Number(li.annual_amount);
    if (!Number.isFinite(amt)) continue;
    (cats[key] ||= { total: 0, lines: [] });
    cats[key].total += amt;
    cats[key].lines.push({ label: String(li.label || "").slice(0, 120), amount: amt });
  }
  const sum = (keys) => keys.reduce((s, k) => s + (cats[k]?.total || 0), 0);
  const income = sum(["market_rent", "loss_to_lease", "vacancy_loss", "concessions", "bad_debt", "other_income", "utility_reimb", "other_reimb"]);
  const controllable = sum(["payroll", "utilities", "contract_services", "turnover", "repairs", "marketing", "administrative"]);
  const noncontrollable = sum(["management_fee", "insurance", "property_taxes"]);

  return Response.json({
    property_meta: res.parsed.property_meta || null,
    period_detected: res.parsed.period_detected || null,
    categories: cats,
    totals: { income, controllable, noncontrollable, noi: income - controllable - noncontrollable },
    line_count: lines.length,
  });
}
