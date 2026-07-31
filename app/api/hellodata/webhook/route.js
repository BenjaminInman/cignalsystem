import crypto from "node:crypto";

// Thin receiver for HelloData Dataset Export webhooks.
// HelloData signs each POST with an HMAC-SHA256 of the body using our API key
// (SHA256-HMAC-Signature header). We verify, then record the delivery so the
// ingestion job can pull the file. Publicly reachable (middleware excludes /api).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  let info = {};
  try {
    const b = JSON.parse(raw);
    info = {
      queryUUID: b.queryUUID,
      name: b.name,
      rows: b?.gcsBlob?.numberRows,
      url: b?.gcsBlob?.url,
      expires: b?.gcsBlob?.expires,
    };
  } catch {}

  console.log("HELLODATA_WEBHOOK " + JSON.stringify({ verified, keyPresent: !!key, ...info }));
  return new Response("OK", { status: 200 });
}

export async function GET() {
  return Response.json({ ok: true, endpoint: "hellodata-webhook" });
}
