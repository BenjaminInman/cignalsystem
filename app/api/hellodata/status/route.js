// HelloData backfill status — admin only, read-only.
//
// Exists so a stall is visible in one click instead of requiring a trip through
// GitHub Actions logs. Every failure mode this pipeline has hit (silent no-op
// fire mode, psycopg2 crash, normalisation mismatch) showed up here as
// `stalled: true` long before it was obvious anywhere else.
//
// Touches nothing in the ingest path — it is a single read of a stable function.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

    const { data: prof } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!prof?.is_admin) return Response.json({ error: "forbidden" }, { status: 403 });

    const { data, error } = await supabase.rpc("hd_pipeline_status");
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const pctZips = data.zips_publishable
      ? Math.round((100 * data.zips_done) / data.zips_publishable) : 0;
    const pctMetros = data.metros_total
      ? Math.round((100 * data.metros_done) / data.metros_total) : 0;

    return Response.json({
      ...data,
      pct_zips: pctZips,
      pct_metros: pctMetros,
      health: data.stalled ? "STALLED" : "running",
      summary:
        `${data.zips_done.toLocaleString()}/${data.zips_publishable.toLocaleString()} ZIPs (${pctZips}%) · ` +
        `${data.metros_done}/${data.metros_total} metros (${pctMetros}%) · ` +
        `${data.observations.toLocaleString()} observations · ` +
        `${data.queue_pending} in flight · ` +
        `last delivery ${data.mins_since_delivery}m ago`,
    });
  } catch (e) {
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
