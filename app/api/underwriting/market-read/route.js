export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runMarketRead } from "@/lib/underwriting/engine";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Pulls engine-ready market inputs for a CBSA from the market_read() RPC
// (cross-metro z-signals computed in-DB; unions duplicate region rows by CBSA).
async function marketReadInputs(cbsa) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/market_read`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_cbsa: cbsa }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  let d = await r.json();
  if (Array.isArray(d)) d = d[0];
  return d;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const cbsa = searchParams.get("cbsa");
  const scenario = (searchParams.get("scenario") || "base").toLowerCase();
  if (!cbsa) return NextResponse.json({ error: "cbsa required" }, { status: 400 });

  const data = await marketReadInputs(cbsa);
  if (!data || !data.inputs) return NextResponse.json({ error: "no_data_for_cbsa", cbsa }, { status: 404 });

  const result = runMarketRead(data.inputs, scenario);
  return NextResponse.json({
    cbsa,
    scenario,
    phase: result.phase,
    forwardAssumptions: result.forwardAssumptions,
    signals: result.signals,
    raw: data.raw,
    vintages: data.vintages,
    coverage: data.coverage,
    engineMethodVersion: result.engineMethodVersion,
  });
}
