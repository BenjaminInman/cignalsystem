import crypto from "node:crypto";

// Receiver for HelloData Dataset Export webhooks.
//
// HelloData signs each POST with an HMAC-SHA256 of the raw body using our API
// key (SHA256-HMAC-Signature header). We verify that, then RECORD the delivery
// in hd_deliveries so the drain job can pull the file on its own schedule.
//
// Why record rather than ingest here: the app carries only the anon key, and the
// signed GCS URLs live for 30 days. A national pull is ~400 exports arriving
// asynchronously over hours, so the receiver must be a queue, not a worker.
//
// The write goes through hd_record_delivery(), a SECURITY DEFINER RPC. That RPC
// is callable by anon (the receiver has no other credential), so the token —
// sha256 of the HelloData API key, which only ever exists server-side — is what
// actually authorises the insert. The RPC also rejects any URL that is not a
// HelloData signed GCS URL, so a leaked token cannot queue an arbitrary fetch.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req) {
  const raw = await req.text();
  const sig = req.headers.get("sha256-hmac-signature") || "";
  const key = process.env.HELLODATA_API_KEY || "";

  let verified = false;
  try {
    const expected = crypto.createHmac("sha256", key).update(raw).digest("hex");
    verified =
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    verified = false;
  }

  let b = {};
  try { b = JSON.parse(raw); } catch {}
  const info = {
    queryUUID: b.queryUUID,
    name: b.name,
    rows: b?.gcsBlob?.numberRows,
    url: b?.gcsBlob?.url,
    expires: b?.gcsBlob?.expires,
  };

  // Unverified deliveries are logged and dropped — never queued.
  let recorded = false;
  if (verified && info.url && SUPA && ANON) {
    try {
      const token = crypto.createHash("sha256").update(key).digest("hex");
      const r = await fetch(`${SUPA}/rest/v1/rpc/hd_record_delivery`, {
        method: "POST",
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_token: token,
          p_uuid: info.queryUUID,
          p_name: info.name,
          p_rows: info.rows ?? null,
          p_url: info.url,
          p_expires: info.expires ?? null,
        }),
      });
      recorded = r.ok && (await r.json()) === true;
    } catch (e) {
      console.error("hd_record_delivery failed", e?.message);
    }
  }

  console.log("HELLODATA_WEBHOOK " + JSON.stringify({ verified, recorded, ...info }));
  // Always 200: HelloData retries on non-2xx, and a retry cannot fix a bad
  // signature. The log carries the reason.
  return new Response("OK", { status: 200 });
}

export async function GET() {
  return Response.json({ ok: true, endpoint: "hellodata-webhook", mode: "queue" });
}
