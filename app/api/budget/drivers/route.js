export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runMarketRead } from "@/lib/underwriting/engine";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rpc(name, body) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}), cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

// Mean-reversion blend: fade the recent signal toward the long-run norm so an outlier
// (energy +14% trailing but cooling) doesn't become next year's budget assumption.
const REVERSION = 0.5;
function blend(c) {
  if (!c) return null;
  const tr = c.trailing ?? 0;
  const rr = c.runrate ?? tr;
  const nm = c.norm ?? tr;
  const recent = 0.5 * tr + 0.5 * rr;
  return { forward: nm + REVERSION * (recent - nm), trailing: tr, norm: nm, runrate: rr };
}
const SLUG = { wage: "wage_growth", energy: "cpi_energy", services: "ppi_services", construction: "ppi_construction", core: "cpi_core" };

export async function GET(req) {
  const cbsa = new URL(req.url).searchParams.get("cbsa");
  if (!cbsa) return NextResponse.json({ error: "cbsa required" }, { status: 400 });

  const [mr, comp] = await Promise.all([rpc("market_read", { p_cbsa: cbsa }), rpc("budget_driver_components", {})]);
  let phase = null, rent = 0.03;
  if (mr?.inputs) {
    const read = runMarketRead(mr.inputs, "base");
    phase = read.phase;
    rent = read.forwardAssumptions.rentGrowthY1; // already cycle-adjusted (forward), not trailing
  }
  const c = comp || {};
  const b = {};
  for (const [key, slug] of Object.entries(SLUG)) b[key] = blend(c[slug]);

  const rate = (k) => (b[k]?.forward ?? 0.03);
  return NextResponse.json({
    phase,
    rates: {
      rent, wage: rate("wage"), energy: rate("energy"), services: rate("services"),
      construction: rate("construction"), core: rate("core"),
      insurance: 0.08, tax: 0.03,
    },
    // per-driver detail so the panel can show trailing vs forward vs norm
    components: {
      rent: { forward: rent, cycle: true },
      wage: b.wage, energy: b.energy, services: b.services, construction: b.construction, core: b.core,
      insurance: { forward: 0.08, default: true }, tax: { forward: 0.03, default: true },
    },
  });
}
