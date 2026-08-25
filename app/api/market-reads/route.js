export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public read endpoint — serves published drafts to external consumers
// (econiqmethod.vercel.app/signals and any future partner). CORS is open
// because the Econiq Method site is a separate static origin.
//
// Query params:
//   limit  — max items to return (default 20, max 50)
//   offset — pagination offset (default 0)
//   cat    — signal category filter: rents|occupancy|supply|capital_markets|
//             rates|policy|demand|distress|macro (optional)
//
// Returns only status='published' rows. The body JSONB is the full compose_news
// output; the caller may use whichever fields it needs.

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get("limit")  || "20", 10), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0",  10), 0);
  const cat    = searchParams.get("cat") || null;

  if (!SUPA || !KEY) {
    return Response.json({ items: [], total: 0, error: "service unavailable" },
      { status: 503, headers: CORS });
  }

  // Build PostgREST query against the drafts table. RLS policy already
  // restricts public reads to status='published', so no extra filter needed —
  // but we add it explicitly for clarity and defence-in-depth.
  let qs = `status=eq.published&order=published_at.desc&limit=${limit}&offset=${offset}`;
  qs += `&select=id,slug,headline,dek,body,published_at,vertical`;

  // Category filter: body->>'signal' contains a cycle_read with category tags.
  // The compose schema stores signal_tags as an array inside body->signal.
  // For the initial version we filter by checking if any fact category matches
  // using a simple text containment on the body JSONB cast to text.
  // A proper GIN index can be added later if volume warrants it.
  if (cat) {
    qs += `&body=ilike.*${encodeURIComponent(cat)}*`;
  }

  try {
    // Parallel: fetch items + total count
    const [itemsRes, countRes] = await Promise.all([
      fetch(`${SUPA}/rest/v1/drafts?${qs}`, {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
      fetch(`${SUPA}/rest/v1/drafts?status=eq.published&select=id`, {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          Prefer: "count=exact",
        },
        cache: "no-store",
      }),
    ]);

    if (!itemsRes.ok) {
      return Response.json({ items: [], total: 0 },
        { status: itemsRes.status, headers: CORS });
    }

    const items = await itemsRes.json();
    // PostgREST returns count in Content-Range: 0-19/142
    const range  = countRes.headers.get("content-range") || "";
    const total  = parseInt((range.split("/")[1] || "0"), 10) || 0;

    // Shape each item for the consumer — expose only what the feed page needs
    const shaped = (Array.isArray(items) ? items : []).map((d) => {
      const body = d.body || {};
      return {
        id:           d.id,
        slug:         d.slug,
        headline:     d.headline,
        dek:          d.dek,
        published_at: d.published_at,
        vertical:     d.vertical,
        // Ticker chips (label/value pairs) for the at-a-glance row
        ticker:       body.ticker       || [],
        // Body paragraphs
        facts_body:   body.facts_body   || [],
        // Signal layer (cycle_read, pattern, leading, coincident, lagging, read_with_care)
        signal:       body.signal       || {},
        // Category tags derived from the top-level body categories array
        categories:   body.categories   || [],
      };
    });

    return Response.json(
      { items: shaped, total, limit, offset },
      { headers: { ...CORS, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch (e) {
    return Response.json({ items: [], total: 0, error: "upstream error" },
      { status: 502, headers: CORS });
  }
}
