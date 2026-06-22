export const revalidate = 3600;

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 3600 },
  });
  return r.ok ? r.json() : null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let year = Number(searchParams.get("year")) || null;

    if (!year) {
      const latest = await sb("emerging_markets?select=report_year&order=report_year.desc&limit=1");
      year = latest?.[0]?.report_year ?? null;
    }
    if (!year) return Response.json({ year: null, benchmark: null, markets: [] });

    const [markets, bench] = await Promise.all([
      sb(`emerging_markets?select=*&report_year=eq.${year}&order=rank.asc`),
      sb(`emerging_market_benchmarks?select=*&report_year=eq.${year}&limit=1`),
    ]);

    return Response.json({
      year,
      benchmark: bench?.[0] ?? null,
      markets: markets || [],
    });
  } catch {
    return Response.json({ year: null, benchmark: null, markets: [] });
  }
}
