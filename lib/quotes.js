// Delayed equity quotes for /indices.
//
// Source: the equity_quotes table, populated daily by ingest_databento.py from
// Databento's EQUS.SUMMARY (consolidated EOD closes across all NMS exchanges).
// That product carries no exchange license fees and permits public display,
// which is why it replaced the prior unlicensed Yahoo scrape (Yahoo also 429'd
// every datacenter IP, so it never worked from Vercel anyway).
//
// The page reads Cignal's own stored daily records here -- no third-party API is
// called at request time, so the page can't be broken by an upstream outage.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const REVALIDATE = 600;

/**
 * Fetch delayed EOD quotes for the given symbols from equity_quotes.
 * Returns { quotes: { SYM: {price, chg, asOf} }, errors: { SYM: reason } }.
 * Symbols with no row (e.g. OTC names not in the NMS feed) land in `errors`.
 */
export async function getQuotesDetailed(symbols) {
  const quotes = {};
  const errors = {};
  if (!symbols?.length) return { quotes, errors };
  if (!SB_URL || !SB_KEY) {
    for (const s of symbols) errors[s] = "supabase env unset";
    return { quotes, errors };
  }

  const wanted = symbols.map((s) => s.toUpperCase());
  const inList = wanted.map(encodeURIComponent).join(",");
  const url =
    `${SB_URL}/rest/v1/v_equity_quotes_latest` +
    `?symbol=in.(${inList})&select=symbol,price,chg_pct,as_of`;

  try {
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) {
      for (const s of wanted) errors[s] = `db ${res.status}`;
      return { quotes, errors };
    }
    const rows = await res.json();
    const bySym = new Map(rows.map((r) => [r.symbol, r]));
    for (const s of wanted) {
      const r = bySym.get(s);
      if (r && typeof r.price === "number" && typeof r.chg_pct === "number") {
        quotes[s] = { price: r.price, chg: r.chg_pct, asOf: r.as_of };
      } else {
        errors[s] = "no quote";
      }
    }
  } catch (e) {
    for (const s of wanted) errors[s] = String(e).slice(0, 60);
  }
  return { quotes, errors };
}

/** Back-compat helper: bare { SYM: {price, chg} } map. */
export async function getQuotes(symbols) {
  const { quotes } = await getQuotesDetailed(symbols);
  return quotes;
}
