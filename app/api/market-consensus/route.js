export const revalidate = 3600;

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Consensus city|state -> CBSA, for joining each market to its live Cignal score.
const CBSA = {
  "Miami|FL": "33100",
  "Chicago|IL": "16980",
  "San Jose|CA": "41940",
  "Houston|TX": "26420",
  "Raleigh|NC": "39580",
  "San Francisco|CA": "41860",
  "Orange County|CA": "31080",
  "Dallas-Fort Worth|TX": "19100",
  "Seattle|WA": "42660",
  "Phoenix|AZ": "38060",
  "Nashville|TN": "34980",
  "Charlotte|NC": "16740",
  "Indianapolis|IN": "26900",
  "Richmond|VA": "40060",
  "Tampa|FL": "45300",
  "Jersey City|NJ": "35620",
  "Salt Lake City|UT": "41620",
  "Boston|MA": "14460",
  "Atlanta|GA": "12060",
  "Jacksonville|FL": "27260",
  "Austin|TX": "12420",
  "Savannah|GA": "42340",
  "Boise|ID": "14260",
  "Colorado Springs|CO": "17820"
};

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 3600 },
  });
  return r.ok ? r.json() : null;
}

export async function GET() {
  try {
    const rows = await sb(
      "v_market_consensus_weighted?select=*&board_eligible=eq.true&order=weighted_score.desc"
    );
    const markets = (rows || []).map((r, i) => ({
      rank: i + 1,
      city: r.city,
      state: r.state,
      cbsa: CBSA[`${r.city}|${r.state}`] || null,
      appearances: r.appearances,
      weightedScore: Number(r.weighted_score),
      bestRank: r.best_rank,
      sources: r.sources || [],
    }));
    const top = markets.length ? markets[0].weightedScore : 1;
    return Response.json({ markets, topScore: top });
  } catch {
    return Response.json({ markets: [], topScore: 1 });
  }
}
