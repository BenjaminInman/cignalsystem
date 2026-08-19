export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

const DARK = "FF08090A", AMBER = "FFF5B544", TAG = "FFBFA46A";
const INK = "FF1A1A1A", MUTE = "FF6B7280", LINE = "FFD1D5DB", HEADFILL = "FFF3F1EC";
const GREEN = "FF2E7D32", RED = "FFC62828";
const CUR = '$#,##0;($#,##0);"-"';
const PCT = "0.0%";

function band(ws, subtitle, ncols) {
  ws.mergeCells(1, 1, 1, ncols);
  const w = ws.getCell(1, 1);
  w.value = "CIGNAL · SYSTEM";
  w.font = { name: "Arial", size: 16, bold: true, color: { argb: AMBER } };
  w.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
  w.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, ncols);
  const t = ws.getCell(2, 1);
  t.value = "Better Signals. Better Decisions. Better Returns.";
  t.font = { name: "Arial", size: 9, color: { argb: TAG } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
  t.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 15;
  ws.mergeCells(3, 1, 3, ncols);
  ws.getCell(3, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER } };
  ws.getRow(3).height = 3;
  ws.mergeCells(4, 1, 4, ncols);
  const s = ws.getCell(4, 1);
  s.value = subtitle;
  s.font = { name: "Arial", size: 11, bold: true, color: { argb: INK } };
  s.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(4).height = 20;
}
const money = (c) => { c.numFmt = CUR; c.font = { name: "Arial", size: 10, color: { argb: INK } }; c.alignment = { horizontal: "right" }; };
const label = (c, bold) => { c.font = { name: "Arial", size: 10, bold: !!bold, color: { argb: INK } }; c.alignment = { indent: 1 }; };

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
  const SECTIONS = [["revenue", "INCOME"], ["controllable", "CONTROLLABLE EXPENSES"], ["noncontrollable", "NON-CONTROLLABLE EXPENSES"]];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cignal System";

  // ---------- COVER ----------
  const cv = wb.addWorksheet("Cover", { views: [{ showGridLines: false }] });
  cv.columns = [{ width: 22 }, { width: 26 }, { width: 26 }, { width: 18 }];
  band(cv, `${meta.name || "Property"} — Annual Operating Budget`, 4);
  let r = 6;
  const kv = (k, v) => {
    cv.getCell(r, 1).value = k; cv.getCell(r, 1).font = { name: "Arial", size: 10, color: { argb: MUTE } };
    cv.mergeCells(r, 2, r, 4); cv.getCell(r, 2).value = v; cv.getCell(r, 2).font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
    r++;
  };
  kv("Market", market.name || "—");
  kv("Cycle phase", p.phase || "—");
  kv("Base period (T-12)", meta.period || "—");
  kv("Generated", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  r++;
  cv.mergeCells(r, 1, r, 4);
  cv.getCell(r, 1).value = "How these numbers are built";
  cv.getCell(r, 1).font = { name: "Arial", size: 10, bold: true, color: { argb: INK } }; r++;
  cv.mergeCells(r, 1, r + 3, 4);
  cv.getCell(r, 1).value = "Every line grows on a signal-blended forward rate, not a flat percentage. Recent trend is faded toward each series' long-run norm, so a spike (or slump) does not simply extrapolate. Rent is cycle-adjusted for this market's phase. Insurance and property taxes are editable defaults with no clean per-market series. This is a planning estimate, not advice — verify against your own judgment.";
  cv.getCell(r, 1).font = { name: "Arial", size: 9, color: { argb: MUTE } };
  cv.getCell(r, 1).alignment = { wrapText: true, vertical: "top" };
  r += 5;
  const noiVar = (proj.noi ?? 0) - (base.noi ?? 0);
  cv.getCell(r, 1).value = "T-12 NOI"; cv.getCell(r, 1).font = { name: "Arial", size: 10, color: { argb: MUTE } };
  cv.getCell(r, 2).value = base.noi ?? 0; money(cv.getCell(r, 2)); r++;
  cv.getCell(r, 1).value = "Budgeted NOI"; cv.getCell(r, 1).font = { name: "Arial", size: 10, color: { argb: MUTE } };
  cv.getCell(r, 2).value = proj.noi ?? 0; money(cv.getCell(r, 2)); cv.getCell(r, 2).font = { name: "Arial", size: 11, bold: true, color: { argb: INK } }; r++;
  cv.getCell(r, 1).value = "Change"; cv.getCell(r, 1).font = { name: "Arial", size: 10, color: { argb: MUTE } };
  cv.getCell(r, 2).value = noiVar; money(cv.getCell(r, 2)); cv.getCell(r, 2).font = { name: "Arial", size: 10, bold: true, color: { argb: noiVar >= 0 ? GREEN : RED } };

  // ---------- BUDGET (12-month) ----------
  const bd = wb.addWorksheet("Budget", { views: [{ showGridLines: false, state: "frozen", ySplit: 6 }] });
  bd.columns = [{ width: 28 }, ...MON.map(() => ({ width: 11 })), { width: 13 }];
  band(bd, `${meta.name || "Property"} — 12-Month Forward Budget`, 14);
  // header row (row 6)
  const hdr = ["Category", ...MON, "Annual"];
  hdr.forEach((h, i) => {
    const c = bd.getCell(6, i + 1);
    c.value = h; c.font = { name: "Arial", size: 9, bold: true, color: { argb: INK } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADFILL } };
    c.alignment = { horizontal: i === 0 ? "left" : "right", indent: i === 0 ? 1 : 0 };
    c.border = { bottom: { style: "thin", color: { argb: LINE } } };
  });
  let br = 7;
  const writeMonthly = (name, annual, bold) => {
    label(bd.getCell(br, 1), bold); bd.getCell(br, 1).value = name;
    for (let m = 0; m < 12; m++) { const c = bd.getCell(br, m + 2); c.value = annual / 12; money(c); if (bold) c.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } }; }
    const a = bd.getCell(br, 14); a.value = annual; money(a); a.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
    br++;
  };
  const secColor = (name) => { bd.mergeCells(br, 1, br, 14); const c = bd.getCell(br, 1); c.value = name; c.font = { name: "Arial", size: 8, bold: true, color: { argb: MUTE } }; c.alignment = { indent: 1 }; br++; };
  for (const [sec, secName] of SECTIONS) {
    secColor(secName);
    let subtotal = 0;
    for (const row of bySec(sec)) { writeMonthly(row.label, row.next, false); subtotal += row.next; }
    writeMonthly(`Total ${secName.charAt(0) + secName.slice(1).toLowerCase()}`, subtotal, true);
    br++;
  }
  writeMonthly("NET OPERATING INCOME", proj.noi ?? 0, true);
  bd.getCell(br - 1, 1).font = { name: "Arial", size: 11, bold: true, color: { argb: DARK } };
  bd.getCell(br - 1, 14).font = { name: "Arial", size: 11, bold: true, color: { argb: DARK } };

  // ---------- VARIANCE ----------
  const vr = wb.addWorksheet("Variance", { views: [{ showGridLines: false, state: "frozen", ySplit: 6 }] });
  vr.columns = [{ width: 28 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 14 }, { width: 11 }, { width: 40 }];
  band(vr, `${meta.name || "Property"} — Budget vs T-12 Variance`, 7);
  ["Category", "T-12 Actual", "Growth", "Budget", "Variance $", "Var %", "Basis / assumption"].forEach((h, i) => {
    const c = vr.getCell(6, i + 1);
    c.value = h; c.font = { name: "Arial", size: 9, bold: true, color: { argb: INK } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADFILL } };
    c.alignment = { horizontal: i === 0 || i === 6 ? "left" : "right", indent: i === 0 ? 1 : 0 };
    c.border = { bottom: { style: "thin", color: { argb: LINE } } };
  });
  let vrr = 7;
  const vRow = (name, baseV, growth, nextV, basis, bold, isFee) => {
    label(vr.getCell(vrr, 1), bold); vr.getCell(vrr, 1).value = name;
    const b = vr.getCell(vrr, 2); b.value = baseV; money(b);
    const g = vr.getCell(vrr, 3); if (growth != null) { g.value = growth; g.numFmt = isFee ? PCT : PCT; g.font = { name: "Arial", size: 10, color: { argb: MUTE } }; g.alignment = { horizontal: "right" }; }
    const n = vr.getCell(vrr, 4); n.value = nextV; money(n); if (bold) n.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
    const vd = (nextV || 0) - (baseV || 0);
    const v = vr.getCell(vrr, 5); v.value = vd; money(v); v.font = { name: "Arial", size: 10, color: { argb: vd >= 0 ? GREEN : RED } };
    const vp = vr.getCell(vrr, 6); if (baseV) { vp.value = vd / Math.abs(baseV); vp.numFmt = PCT; vp.font = { name: "Arial", size: 10, color: { argb: vd >= 0 ? GREEN : RED } }; vp.alignment = { horizontal: "right" }; }
    const bs = vr.getCell(vrr, 7); bs.value = basis || ""; bs.font = { name: "Arial", size: 8.5, color: { argb: MUTE } }; bs.alignment = { wrapText: true, indent: 1 };
    vrr++;
  };
  for (const [sec, secName] of SECTIONS) {
    vr.mergeCells(vrr, 1, vrr, 7); const c = vr.getCell(vrr, 1); c.value = secName; c.font = { name: "Arial", size: 8, bold: true, color: { argb: MUTE } }; c.alignment = { indent: 1 }; vrr++;
    let sb = 0, sn = 0;
    for (const row of bySec(sec)) { vRow(row.label, row.base, row.isFee ? row.growth : row.growth, row.next, row.basis, false, row.isFee); sb += row.base; sn += row.next; }
    vRow(`Total ${secName.charAt(0) + secName.slice(1).toLowerCase()}`, sb, null, sn, "", true);
    vrr++;
  }
  vRow("NET OPERATING INCOME", base.noi ?? 0, null, proj.noi ?? 0, "", true);
  vr.getCell(vrr - 1, 1).font = { name: "Arial", size: 11, bold: true, color: { argb: DARK } };

  const buf = await wb.xlsx.writeBuffer();
  const fname = `Cignal_Budget_${(meta.name || "Property").replace(/[^a-z0-9]+/gi, "_")}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
