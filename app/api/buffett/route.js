export const runtime = "nodejs";
export const revalidate = 3600; // recompute hourly; inputs move daily (Wilshire) / quarterly (Fed, GDP)

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate: 3600 },
  });
  return r.ok ? r.json() : null;
}

// Latest revision-0 reading for a national series from the analytics view.
async function latest(slug) {
  const rows = await sb(
    `v_indicator_analytics?slug=eq.${slug}&region_type=eq.national&select=obs_date,value&order=obs_date.desc&limit=1`
  );
  return rows && rows.length ? { date: rows[0].obs_date, value: Number(rows[0].value) } : null;
}

// FT Wilshire 5000 daily closes from Yahoo. Returns [{t: 'YYYY-MM-DD', c: close}], oldest→newest.
async function wilshireDaily() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EFTW5000?range=2y&interval=1d",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: ctrl.signal,
        next: { revalidate: 3600 },
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const res = j?.chart?.result?.[0];
    const ts = res?.timestamp || [];
    const close = res?.indicators?.quote?.[0]?.close || [];
    const out = [];
    for (let i = 0; i < ts.length; i++) {
      const c = close[i];
      if (c == null) continue;
      out.push({ t: new Date(ts[i] * 1000).toISOString().slice(0, 10), c });
    }
    return out.length ? out : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function zoneFor(v) {
  if (v < 90) return "Undervalued";
  if (v < 120) return "Fair";
  if (v < 150) return "Elevated";
  if (v < 200) return "Overvalued";
  return "Significantly Overvalued";
}

export async function GET() {
  try {
    const [eq, gdp] = await Promise.all([latest("equities_mktval"), latest("gdp_nominal")]);
    if (!eq || !gdp || !gdp.value) {
      return Response.json({ ok: false }, { status: 200 });
    }

    const gdpB = gdp.value; // nominal GDP already in billions (SAAR)

    // Primary (daily): FT Wilshire 5000 level ≈ total US market cap in $B (index built ~1pt = $1B).
    // Fallback (quarterly): Fed Z.1 corporate-equities level if the market feed is unreachable.
    let capB, asOf, basis;
    const wil = await wilshireDaily();
    if (wil && wil.length) {
      capB = wil[wil.length - 1].c;
      asOf = wil[wil.length - 1].t;
      basis = "daily";
    } else if (eq && eq.value) {
      capB = eq.value / 1000; // millions → billions
      asOf = eq.date;
      basis = "quarterly";
    } else {
      return Response.json({ ok: false }, { status: 200 });
    }

    const value = Math.round((capB / gdpB) * 1000) / 10; // one decimal, %
    return Response.json({
      ok: true,
      value,
      asOf,
      basis,
      zone: zoneFor(value),
      marketCapT: Math.round((capB / 1000) * 10) / 10,
      gdpT: Math.round((gdpB / 1000) * 10) / 10,
      anchorDate: eq.date,
    });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
