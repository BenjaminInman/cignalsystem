// Delayed quotes for /indices.
//
// The previous implementation issued one Yahoo request PER SYMBOL. /indices
// asks for 38 tickers, so every page load fired 38 concurrent requests from a
// single Vercel egress IP and Yahoo answered 429. Each failure was swallowed
// and the route returned `{}`, so the page quietly rendered its hard-coded
// sample prices as if they were live.
//
// Yahoo's spark endpoint accepts a comma-separated symbol list, so the same 38
// tickers now cost two sequential requests instead of 38 parallel ones.
// Per-symbol chart lookups remain as a fallback for anything spark drops.

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const CHUNK = 20;
const REVALIDATE = 600;

const HEADERS = { "User-Agent": UA, Accept: "application/json" };

function toQuote(meta) {
  const price = meta?.regularMarketPrice;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  if (typeof price !== "number" || typeof prev !== "number" || !prev) return null;
  return { price, chg: ((price - prev) / prev) * 100 };
}

const chunks = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** One spark request for up to CHUNK symbols. Returns { quotes, error }. */
async function sparkChunk(symbols) {
  const qs = `symbols=${symbols.map(encodeURIComponent).join(",")}&range=1d&interval=1d`;
  let lastErr = "no attempt";
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/v7/finance/spark?${qs}`, {
        next: { revalidate: REVALIDATE },
        headers: HEADERS,
      });
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      const j = await res.json();
      const results = j?.spark?.result;
      if (!Array.isArray(results)) {
        lastErr = "unexpected payload shape";
        continue;
      }
      const quotes = {};
      for (const entry of results) {
        const q = toQuote(entry?.response?.[0]?.meta);
        if (q) quotes[entry.symbol] = q;
      }
      return { quotes, error: null };
    } catch (e) {
      lastErr = String(e?.message || e);
    }
  }
  return { quotes: {}, error: lastErr };
}

/** Single-symbol fallback for anything spark did not return. */
async function chartOne(sym) {
  for (const host of HOSTS) {
    try {
      const res = await fetch(
        `${host}/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`,
        { next: { revalidate: REVALIDATE }, headers: HEADERS }
      );
      if (!res.ok) continue;
      const j = await res.json();
      const q = toQuote(j?.chart?.result?.[0]?.meta);
      if (q) return q;
    } catch {
      /* try next host */
    }
  }
  return null;
}

/**
 * Returns { quotes, errors }.
 *   quotes: { TICKER: { price, chg } } for everything that resolved
 *   errors: { TICKER: reason }         for everything that did not
 */
export async function getQuotesDetailed(symbols) {
  const wanted = [...new Set(symbols)];
  const quotes = {};
  const errors = {};

  // Sequential, not parallel: bursting is what triggered the 429.
  for (const group of chunks(wanted, CHUNK)) {
    const { quotes: got, error } = await sparkChunk(group);
    Object.assign(quotes, got);
    if (error) for (const s of group) if (!quotes[s]) errors[s] = error;
  }

  const missing = wanted.filter((s) => !quotes[s]);
  for (const sym of missing) {
    const q = await chartOne(sym);
    if (q) {
      quotes[sym] = q;
      delete errors[sym];
    } else if (!errors[sym]) {
      errors[sym] = "unresolved";
    }
  }

  return { quotes, errors };
}

/** Back-compat: the plain symbol -> quote map. */
export async function getQuotes(symbols) {
  const { quotes } = await getQuotesDetailed(symbols);
  return quotes;
}
