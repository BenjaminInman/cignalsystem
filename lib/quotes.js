// Pulls delayed quotes from Yahoo's public chart endpoint (no API key).
// Swappable for a keyed real-time provider (Finnhub, Twelve Data, etc.) later.
const BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

async function fetchOne(sym) {
  try {
    const res = await fetch(`${BASE}${encodeURIComponent(sym)}?range=1d&interval=1d`, {
      next: { revalidate: 600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "application/json",
      },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const meta = j?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose ?? meta?.previousClose;
    if (typeof price !== "number" || typeof prev !== "number" || !prev) return null;
    return { ticker: sym, price, chg: ((price - prev) / prev) * 100 };
  } catch {
    return null;
  }
}

export async function getQuotes(symbols) {
  const results = await Promise.all(symbols.map(fetchOne));
  const map = {};
  for (const r of results) if (r) map[r.ticker] = { price: r.price, chg: r.chg };
  return map;
}
