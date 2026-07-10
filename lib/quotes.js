// Delayed quotes for /indices.
//
// Yahoo's public chart endpoint is reachable from most networks but rate-limits
// and sometimes outright blocks cloud egress IPs. The previous implementation
// swallowed every failure and returned `{}`, so the page silently fell back to
// its hard-coded sample values with no way to tell that quotes were dead. That
// is exactly the failure the /indices page has been in.
//
// Now: try both Yahoo hosts, and report why a symbol is missing.

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchFromHost(host, sym) {
  const res = await fetch(
    `${host}/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`,
    {
      next: { revalidate: 600 },
      headers: { "User-Agent": UA, Accept: "application/json" },
    }
  );
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const j = await res.json();
  const meta = j?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  if (typeof price !== "number" || typeof prev !== "number" || !prev) {
    return { error: "unexpected payload shape" };
  }
  return { ticker: sym, price, chg: ((price - prev) / prev) * 100 };
}

async function fetchOne(sym) {
  let last = "no attempt";
  for (const host of HOSTS) {
    try {
      const r = await fetchFromHost(host, sym);
      if (!r.error) return r;
      last = r.error;
    } catch (e) {
      last = String(e?.message || e);
    }
  }
  return { ticker: sym, error: last };
}

/**
 * Returns { quotes, errors }.
 *  quotes: { TICKER: { price, chg } }  — only symbols that resolved
 *  errors: { TICKER: "reason" }        — everything that did not
 */
export async function getQuotesDetailed(symbols) {
  const results = await Promise.all(symbols.map(fetchOne));
  const quotes = {};
  const errors = {};
  for (const r of results) {
    if (r.error) errors[r.ticker] = r.error;
    else quotes[r.ticker] = { price: r.price, chg: r.chg };
  }
  return { quotes, errors };
}

/** Back-compat: the plain symbol -> quote map. */
export async function getQuotes(symbols) {
  const { quotes } = await getQuotesDetailed(symbols);
  return quotes;
}
