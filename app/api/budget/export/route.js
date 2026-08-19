export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

const DARK="FF08090A",AMBER="FFF5B544",TAG="FFBFA46A";
const INK="FF1A1A1A",MUTE="FF6B7280",LINE="FFD1D5DB",HEADFILL="FFF3F1EC",SUBFILL="FFF8F7F4",BLUE="FF0000CC";
const GREEN="FF2E7D32",RED="FFC62828";
const CUR='$#,##0;($#,##0);"-"',PCT="0.0%";
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SECTIONS=[["revenue","Income"],["controllable","Controllable Expenses"],["noncontrollable","Non-Controllable Expenses"]];
// column map: A cat/line, B T-12, C growth, D..O Jan..Dec, P annual, Q var$, R var%, S basis
const L=(n)=>{let s="";n=n-1;while(n>=0){s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)-1;}return s;};
const MC=[]; for(let i=4;i<=15;i++) MC.push(L(i)); // D..O
const ANN=L(16),VD=L(17),VP=L(18);

function band(ws,subtitle,ncols){
  ws.mergeCells(1,1,1,ncols);const w=ws.getCell(1,1);
  w.value="CIGNAL · SYSTEM";w.font={name:"Arial",size:16,bold:true,color:{argb:AMBER}};
  w.fill={type:"pattern",pattern:"solid",fgColor:{argb:DARK}};w.alignment={vertical:"middle",indent:1};ws.getRow(1).height=30;
  ws.mergeCells(2,1,2,ncols);const t=ws.getCell(2,1);
  t.value="Better Signals. Better Decisions. Better Returns.";t.font={name:"Arial",size:9,color:{argb:TAG}};
  t.fill={type:"pattern",pattern:"solid",fgColor:{argb:DARK}};t.alignment={vertical:"middle",indent:1};ws.getRow(2).height=15;
  ws.mergeCells(3,1,3,ncols);ws.getCell(3,1).fill={type:"pattern",pattern:"solid",fgColor:{argb:AMBER}};ws.getRow(3).height=3;
  ws.mergeCells(4,1,4,ncols);const s=ws.getCell(4,1);s.value=subtitle;s.font={name:"Arial",size:11,bold:true,color:{argb:INK}};s.alignment={vertical:"middle",indent:1};ws.getRow(4).height=20;
}

export async function POST(req){
  const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return Response.json({error:"Please sign in."},{status:401});
  const {data:prof}=await supabase.from("profiles").select("tier, is_admin").eq("id",user.id).single();
  if(!prof?.is_admin && prof?.tier!=="pro") return Response.json({error:"The Budget Builder is a Cignal Pro feature."},{status:403});

  let p; try{p=await req.json();}catch{return Response.json({error:"bad payload"},{status:400});}
  const rows=Array.isArray(p.rows)?p.rows:[];
  const meta=p.meta||{},market=p.market||{};
  const bySec=(sec)=>rows.filter((r)=>r.section===sec);
  const start=p.start||{};
  const sM=Number.isInteger(start.month)?start.month:0;
  const sY=Number.isInteger(start.year)?start.year:(new Date().getFullYear()+1);
  const monthLabels=[]; for(let i=0;i<12;i++){const m=(sM+i)%12;const y=sY+Math.floor((sM+i)/12);monthLabels.push(`${MON[m]} ${y}`);}
  const periodRange=`${monthLabels[0]} – ${monthLabels[11]}`;

  const wb=new ExcelJS.Workbook();wb.creator="Cignal System";
  const cv=wb.addWorksheet("Cover",{views:[{showGridLines:false}]});
  const bd=wb.addWorksheet("Budget",{views:[{showGridLines:false,state:"frozen",xSplit:1,ySplit:6}]});

  // ---------------- BUDGET (live model) ----------------
  bd.columns=[{width:34},{width:13},{width:9},...MON.map(()=>({width:11})),{width:13},{width:13},{width:9},{width:34}];
  band(bd,`${meta.name||"Property"} — 12-Month Budget · ${periodRange}`,19);
  const hdr=["Category / Line","T-12 Actual","Growth",...monthLabels,"Annual","Var $","Var %","Basis / assumption"];
  hdr.forEach((h,i)=>{const c=bd.getCell(6,i+1);c.value=h;c.font={name:"Arial",size:9,bold:true,color:{argb:INK}};
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:HEADFILL}};c.alignment={horizontal:i===0||i===18?"left":"right",indent:i===0?1:0,wrapText:true};
    c.border={bottom:{style:"thin",color:{argb:LINE}}};});
  let R=7;
  const fmtRow=(row,{bold=false,indent=1,fill}={})=>{
    const nm=bd.getCell(row,1);nm.font={name:"Arial",size:bold?10:9.5,bold,color:{argb:INK}};nm.alignment={indent};
    for(let c=2;c<=19;c++){const cell=bd.getCell(row,c);
      if(c===3||c===18) cell.numFmt=PCT; else if(c!==19) cell.numFmt=CUR;
      if(c!==19) cell.alignment={horizontal:"right"};
      if(!cell.font) cell.font={name:"Arial",size:9.5,bold,color:{argb:INK}};}
    if(fill) for(let c=1;c<=19;c++) bd.getCell(row,c).fill={type:"pattern",pattern:"solid",fgColor:{argb:fill}};
  };
  const monthFormulas=(row)=>{ for(const col of MC) bd.getCell(`${col}${row}`).value={formula:`B${row}*(1+C${row})/12`}; };
  const annVarFormulas=(row)=>{
    bd.getCell(`${ANN}${row}`).value={formula:`SUM(D${row}:O${row})`};
    bd.getCell(`${VD}${row}`).value={formula:`${ANN}${row}-B${row}`};
    bd.getCell(`${VP}${row}`).value={formula:`IF(B${row}=0,"",${VD}${row}/ABS(B${row}))`};
    const q=bd.getCell(`${VD}${row}`);q.font={name:"Arial",size:9.5,color:{argb:INK}};
  };
  const sumRange=(row,r1,r2)=>{ // subtotal: sum contiguous line rows r1..r2
    bd.getCell(`B${row}`).value={formula:`SUM(B${r1}:B${r2})`};
    for(const col of MC) bd.getCell(`${col}${row}`).value={formula:`SUM(${col}${r1}:${col}${r2})`};
    annVarFormulas(row);
  };
  const sumRows=(row,list)=>{ // section total: sum non-contiguous subtotal rows
    const plus=(col)=>list.map((rr)=>`${col}${rr}`).join("+");
    bd.getCell(`B${row}`).value={formula:plus("B")};
    for(const col of MC) bd.getCell(`${col}${row}`).value={formula:plus(col)};
    annVarFormulas(row);
  };

  const secTotalRows={};
  for(const [sec,secName] of SECTIONS){
    bd.mergeCells(R,1,R,19);const sc=bd.getCell(R,1);sc.value=secName.toUpperCase();sc.font={name:"Arial",size:8,bold:true,color:{argb:MUTE}};sc.alignment={indent:1};R++;
    const subRows=[];
    for(const cat of bySec(sec)){
      const g=cat.base?cat.next/cat.base-1:0; // effective category growth
      const lines=Array.isArray(cat.lines)&&cat.lines.length?cat.lines:[{label:cat.label,amount:cat.base}];
      const first=R;
      for(const li of lines){
        bd.getCell(`A${R}`).value=li.label;
        const b=bd.getCell(`B${R}`);b.value=li.amount||0; // BLUE input
        const c=bd.getCell(`C${R}`);c.value=g;            // BLUE input
        monthFormulas(R); annVarFormulas(R);
        fmtRow(R,{indent:3});
        b.font={name:"Arial",size:9.5,color:{argb:BLUE}}; c.font={name:"Arial",size:9.5,color:{argb:BLUE}};
        for(const col of MC) bd.getCell(`${col}${R}`).font={name:"Arial",size:9.5,color:{argb:BLUE}}; // months are editable too — overwrite any to hand-shape seasonality
        bd.getCell(`S${R}`).value=cat.basis||""; bd.getCell(`S${R}`).font={name:"Arial",size:8.5,color:{argb:MUTE}};bd.getCell(`S${R}`).alignment={wrapText:true,indent:1};
        R++;
      }
      const last=R-1;
      bd.getCell(`A${R}`).value=`Total ${cat.label}`;
      sumRange(R,first,last); fmtRow(R,{bold:true,indent:2,fill:SUBFILL});
      subRows.push(R); R++;
    }
    bd.getCell(`A${R}`).value=`TOTAL ${secName.toUpperCase()}`;
    sumRows(R,subRows); fmtRow(R,{bold:true,indent:1,fill:HEADFILL});
    secTotalRows[sec]=R; R++;
  }
  // NOI = income - controllable - noncontrollable, per column
  const noiRow=R;
  bd.getCell(`A${R}`).value="NET OPERATING INCOME";
  const ir=secTotalRows.revenue,cr=secTotalRows.controllable,nr=secTotalRows.noncontrollable;
  bd.getCell(`B${R}`).value={formula:`B${ir}-B${cr}-B${nr}`};
  for(const col of MC) bd.getCell(`${col}${R}`).value={formula:`${col}${ir}-${col}${cr}-${col}${nr}`};
  annVarFormulas(R); fmtRow(R,{bold:true,indent:1,fill:HEADFILL});
  bd.getCell(`A${R}`).font={name:"Arial",size:11,bold:true,color:{argb:DARK}};

  // ---------------- COVER (branded, references Budget) ----------------
  cv.columns=[{width:22},{width:26},{width:26},{width:18}];
  band(cv,`${meta.name||"Property"} — Annual Operating Budget`,4);
  let r=6;
  const kv=(k,v)=>{cv.getCell(r,1).value=k;cv.getCell(r,1).font={name:"Arial",size:10,color:{argb:MUTE}};
    cv.mergeCells(r,2,r,4);cv.getCell(r,2).value=v;cv.getCell(r,2).font={name:"Arial",size:10,bold:true,color:{argb:INK}};r++;};
  kv("Market",market.name||"—");kv("Cycle phase",p.phase||"—");kv("Base period (T-12)",meta.period||"—");kv("Budget period",periodRange);
  kv("Generated",new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}));r++;
  cv.mergeCells(r,1,r,4);cv.getCell(r,1).value="How to use this file";cv.getCell(r,1).font={name:"Arial",size:10,bold:true,color:{argb:INK}};r++;
  cv.mergeCells(r,1,r+3,4);
  cv.getCell(r,1).value="Blue cells on the Budget tab are editable. Each line's T-12 actual and growth rate drive the monthly spread automatically — change either and the whole budget recalculates. The 12 monthly cells are also blue and editable: overwrite any individual month (for example, raise Marketing in May–July for leasing season) and the category subtotals, annual, and NOI follow. (Overwriting a month replaces its auto-spread for that one cell.) Growth rates are signal-blended forward rates, rent is cycle-adjusted for this market's phase, and insurance/taxes are editable defaults. Planning estimate, not advice.";
  cv.getCell(r,1).font={name:"Arial",size:9,color:{argb:MUTE}};cv.getCell(r,1).alignment={wrapText:true,vertical:"top"};r+=5;
  const sref=(k,formula,bold,col)=>{cv.getCell(r,1).value=k;cv.getCell(r,1).font={name:"Arial",size:10,color:{argb:MUTE}};
    const c=cv.getCell(r,2);c.value={formula};c.numFmt=CUR;c.font={name:"Arial",size:bold?11:10,bold:!!bold,color:{argb:col||INK}};c.alignment={horizontal:"left"};r++;};
  sref("T-12 NOI",`Budget!B${noiRow}`);
  sref("Budgeted NOI",`Budget!${ANN}${noiRow}`,true);
  sref("Change vs T-12",`Budget!${VD}${noiRow}`,true,GREEN);

  const buf=await wb.xlsx.writeBuffer();
  const fname=`Cignal_Budget_${(meta.name||"Property").replace(/[^a-z0-9]+/gi,"_")}.xlsx`;
  return new Response(buf,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${fname}"`}});
}
