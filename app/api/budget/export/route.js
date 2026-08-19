export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

const DARK = "FF08090A", AMBER = "FFF5B544", TAG = "FFBFA46A";
const INK = "FF1A1A1A", MUTE = "FF6B7280", LINE = "FFD1D5DB", HEADFILL = "FFF3F1EC", SUBFILL = "FFF8F7F4";
const GREEN = "FF2E7D32", RED = "FFC62828";
const CUR = '$#,##0;($#,##0);"-"', PCT = "0.0%";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SECTIONS = [["revenue", "Income"], ["controllable", "Controllable Expenses"], ["noncontrollable", "Non-Controllable Expenses"]];

function band(ws, subtitle, ncols) {
  ws.mergeCells(1, 1, 1, ncols);
  const w = ws.getCell(1, 1);
  w.value = "CIGNAL · SYSTEM"; w.font = { name: "Arial", size: 16, bold: true, color: { argb: AMBER } };
  w.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } }; w.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, ncols);
  const t = ws.getCell(2, 1);
  t.value = "Better Signals. Better Decisions. Better Returns."; t.font = { name: "Arial", size: 9, color: { argb: TAG } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } }; t.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 15;
  ws.mergeCells(3, 1, 3, ncols); ws.getCell(3, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER } }; ws.getRow(3).height = 3;
  ws.mergeCells(4, 1, 4, ncols);
  const s = ws.getCell(4, 1); s.value = subtitle; s.font = { name: "Arial", size: 11, bold: true, color: { argb: INK } }; s.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(4).height = 20;
}
const eff = (cat) => (cat.base ? cat.next / cat.base - 1 : 0); // category effective growth; lines inherit it so they tie out

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("tier, is_admin").eq("id", user.id).single();
  if (!prof?.is_admin && prof?.tier !== "pro") return Response.json({ error: "The Budget Builder is a Cignal Pro feature." }, { status: 403 });

  let p;
  try { p = await req.json(); } catch { return Response.json({ error: "bad payload" }, { status: 400 }); }
  const rows = Array.isArray(p.rows) ? p.rows : [];
  const meta = p.meta || {}, market = p.market || {}, base = p.base || {}, proj = p.proj || {};
  const bySec = (sec) => rows.filter((r) => r.section === sec);

  const wb = new ExcelJS.Workbook(); wb.creator = "Cignal System";

  // ---------------- COVER ----------------
  const cv = wb.addWorksheet("Cover", { views: [{ showGridLines: false }] });
  cv.columns = [{ width: 22 }, { width: 26 }, { width: 26 }, { width: 18 }];
  band(cv, `${meta.name || "Property"} — Annual Operating Budget`, 4);
  let r = 6;
  const kv = (k, v) => { cv.getCell(r, 1).value = k; cv.getCell(r, 1).font = { name: "Arial", size: 10, color: { argb: MUTE } };
    cv.mergeCells(r, 2, r, 4); cv.getCell(r, 2).value = v; cv.getCell(r, 2).font = { name: "Arial", size: 10, bold: true, color: { argb: INK } }; r++; };
  kv("Market", market.name || "—"); kv("Cycle phase", p.phase || "—"); kv("Base period (T-12)", meta.period || "—");
  kv("Generated", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  r++;
  cv.mergeCells(r, 1, r, 4); cv.getCell(r, 1).value = "How these numbers are built"; cv.getCell(r, 1).font = { name: "Arial", size: 10, bold: true, color: { argb: INK } }; r++;
  cv.mergeCells(r, 1, r + 3, 4);
  cv.getCell(r, 1).value = "Every line grows on a signal-blended forward rate, not a flat percentage — recent trend faded toward each series' long-run norm, so a spike or slump does not simply extrapolate. Rent is cycle-adjusted for this market's phase. Insurance and property taxes are editable defaults. Line items grow at their category's rate and sum to the category total. Planning estimate, not advice.";
  cv.getCell(r, 1).font = { name: "Arial", size: 9, color: { argb: MUTE } }; cv.getCell(r, 1).alignment = { wrapText: true, vertical: "top" };
  r += 5;
  const noiVar = (proj.noi ?? 0) - (base.noi ?? 0);
  const sumrow = (k, v, col, bold) => { cv.getCell(r, 1).value = k; cv.getCell(r, 1).font = { name: "Arial", size: 10, color: { argb: MUTE } };
    const c = cv.getCell(r, 2); c.value = v; c.numFmt = CUR; c.font = { name: "Arial", size: bold ? 11 : 10, bold: !!bold, color: { argb: col || INK } }; c.alignment = { horizontal: "right" }; r++; };
  sumrow("T-12 NOI", base.noi ?? 0); sumrow("Budgeted NOI", proj.noi ?? 0, INK, true); sumrow("Change", noiVar, noiVar >= 0 ? GREEN : RED, true);

  // ---------------- BUDGET (12-month, line detail) ----------------
  const bd = wb.addWorksheet("Budget", { views: [{ showGridLines: false, state: "frozen", ySplit: 6 }] });
  bd.columns = [{ width: 34 }, ...MON.map(() => ({ width: 10 })), { width: 13 }];
  band(bd, `${meta.name || "Property"} — 12-Month Forward Budget`, 14);
  ["Category / Line", ...MON, "Annual"].forEach((h, i) => { const c = bd.getCell(6, i + 1);
    c.value = h; c.font = { name: "Arial", size: 9, bold: true, color: { argb: INK } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADFILL } };
    c.alignment = { horizontal: i === 0 ? "left" : "right", indent: i === 0 ? 1 : 0 };
    c.border = { bottom: { style: "thin", color: { argb: LINE } } }; });
  let br = 7;
  const mrow = (name, annual, { bold = false, indent = 1, fill } = {}) => {
    const nm = bd.getCell(br, 1); nm.value = name; nm.font = { name: "Arial", size: bold ? 10 : 9.5, bold, color: { argb: INK } }; nm.alignment = { indent };
    if (fill) nm.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    for (let m = 0; m < 12; m++) { const c = bd.getCell(br, m + 2); c.value = annual / 12; c.numFmt = CUR; c.font = { name: "Arial", size: 9.5, bold, color: { argb: INK } }; c.alignment = { horizontal: "right" }; if (fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }; }
    const a = bd.getCell(br, 14); a.value = annual; a.numFmt = CUR; a.font = { name: "Arial", size: 9.5, bold: true, color: { argb: INK } }; a.alignment = { horizontal: "right" }; if (fill) a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    br++;
  };
  for (const [sec, secName] of SECTIONS) {
    bd.mergeCells(br, 1, br, 14); const sc = bd.getCell(br, 1); sc.value = secName.toUpperCase(); sc.font = { name: "Arial", size: 8, bold: true, color: { argb: MUTE } }; sc.alignment = { indent: 1 }; br++;
    let secTot = 0;
    for (const cat of bySec(sec)) {
      const g = eff(cat), lines = Array.isArray(cat.lines) ? cat.lines : [];
      for (const li of lines) mrow(li.label, (li.amount || 0) * (1 + g), { indent: 3 });
      mrow(`Total ${cat.label}`, cat.next, { bold: true, indent: 2, fill: SUBFILL });
      secTot += cat.next;
    }
    mrow(`TOTAL ${secName.toUpperCase()}`, secTot, { bold: true, indent: 1, fill: HEADFILL }); br++;
  }
  mrow("NET OPERATING INCOME", proj.noi ?? 0, { bold: true, indent: 1, fill: HEADFILL });

  // ---------------- VARIANCE (line detail) ----------------
  const vr = wb.addWorksheet("Variance", { views: [{ showGridLines: false, state: "frozen", ySplit: 6 }] });
  vr.columns = [{ width: 34 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 13 }, { width: 10 }, { width: 38 }];
  band(vr, `${meta.name || "Property"} — Budget vs T-12 Variance`, 7);
  ["Category / Line", "T-12 Actual", "Growth", "Budget", "Variance $", "Var %", "Basis / assumption"].forEach((h, i) => { const c = vr.getCell(6, i + 1);
    c.value = h; c.font = { name: "Arial", size: 9, bold: true, color: { argb: INK } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADFILL } };
    c.alignment = { horizontal: i === 0 || i === 6 ? "left" : "right", indent: i === 0 ? 1 : 0 };
    c.border = { bottom: { style: "thin", color: { argb: LINE } } }; });
  let x = 7;
  const vrow = (name, baseV, growth, nextV, basis, { bold = false, indent = 1, fill } = {}) => {
    const nm = vr.getCell(x, 1); nm.value = name; nm.font = { name: "Arial", size: bold ? 10 : 9.5, bold, color: { argb: INK } }; nm.alignment = { indent };
    const b = vr.getCell(x, 2); b.value = baseV; b.numFmt = CUR; b.font = { name: "Arial", size: 9.5, bold, color: { argb: INK } }; b.alignment = { horizontal: "right" };
    const g = vr.getCell(x, 3); if (growth != null) { g.value = growth; g.numFmt = PCT; g.font = { name: "Arial", size: 9.5, color: { argb: MUTE } }; g.alignment = { horizontal: "right" }; }
    const n = vr.getCell(x, 4); n.value = nextV; n.numFmt = CUR; n.font = { name: "Arial", size: 9.5, bold, color: { argb: INK } }; n.alignment = { horizontal: "right" };
    const vd = (nextV || 0) - (baseV || 0);
    const v = vr.getCell(x, 5); v.value = vd; v.numFmt = CUR; v.font = { name: "Arial", size: 9.5, color: { argb: vd >= 0 ? GREEN : RED } }; v.alignment = { horizontal: "right" };
    const vp = vr.getCell(x, 6); if (baseV) { vp.value = vd / Math.abs(baseV); vp.numFmt = PCT; vp.font = { name: "Arial", size: 9.5, color: { argb: vd >= 0 ? GREEN : RED } }; vp.alignment = { horizontal: "right" }; }
    const bs = vr.getCell(x, 7); bs.value = basis || ""; bs.font = { name: "Arial", size: 8.5, color: { argb: MUTE } }; bs.alignment = { wrapText: true, indent: 1 };
    if (fill) for (let i = 1; i <= 7; i++) vr.getCell(x, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    x++;
  };
  for (const [sec, secName] of SECTIONS) {
    vr.mergeCells(x, 1, x, 7); const sc = vr.getCell(x, 1); sc.value = secName.toUpperCase(); sc.font = { name: "Arial", size: 8, bold: true, color: { argb: MUTE } }; sc.alignment = { indent: 1 }; x++;
    let sb = 0, sn = 0;
    for (const cat of bySec(sec)) {
      const g = eff(cat), lines = Array.isArray(cat.lines) ? cat.lines : [];
      for (const li of lines) { const lb = li.amount || 0; vrow(li.label, lb, g, lb * (1 + g), cat.basis, { indent: 3 }); }
      vrow(`Total ${cat.label}`, cat.base, g, cat.next, cat.basis, { bold: true, indent: 2, fill: SUBFILL });
      sb += cat.base; sn += cat.next;
    }
    vrow(`TOTAL ${secName.toUpperCase()}`, sb, null, sn, "", { bold: true, indent: 1, fill: HEADFILL }); x++;
  }
  vrow("NET OPERATING INCOME", base.noi ?? 0, null, proj.noi ?? 0, "", { bold: true, indent: 1, fill: HEADFILL });

  const buf = await wb.xlsx.writeBuffer();
  const fname = `Cignal_Budget_${(meta.name || "Property").replace(/[^a-z0-9]+/gi, "_")}.xlsx`;
  return new Response(buf, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fname}"` } });
}
