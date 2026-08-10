export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runMarketRead } from "@/lib/underwriting/engine";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// All-metros screen: bulk engine-ready inputs from market_screener(), run through the same engine.
export async function GET() {
  const r = await fetch(`${SUPA}/rest/v1/rpc/market_screener`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ metros: [] }, { status: 502 });
  const rows = await r.json();
  const metros = (Array.isArray(rows) ? rows : []).map((m) => {
    const rd = runMarketRead(m.inputs, "base");
    return {
      cbsa: m.cbsa,
      name: m.name,
      phase: rd.phase,
      demand: rd.signals.demand,
      momY1: rd.signals.momY1,
      momY2: rd.signals.momY2,
      rentGrowthY1: rd.forwardAssumptions.rentGrowthY1,
      rentYoY: m.raw?.rentYoY ?? null,
      rentQoQann: m.raw?.rentQoQann ?? null,
      empYoY: m.raw?.empYoY ?? null,
      empSignal: m.inputs.empSignal,
      supplyNearTerm: m.inputs.supplyNearTerm,
      absorptionSignal: m.inputs.absorptionSignal,
      vacancy: m.raw?.vacancyPct ?? null,
      supplyStale: !!m.supplyStale,
    };
  });
  return NextResponse.json({ metros, count: metros.length });
}
