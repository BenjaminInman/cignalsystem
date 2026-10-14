// Layer 3 (macro) strip for the cross-vertical hub at "/": the five readings
// every audience shares. Vertical pages add their own industry layer.
import { getYieldCurve } from "@/lib/yieldcurve";
import { yearAgo } from "@/lib/yoy";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function series(slug, limit = 15) {
  if (!SB_URL || !SB_KEY) return [];
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/v_indicator_analytics?slug=eq.${slug}&region_type=eq.national` +
        `&select=obs_date,value&order=obs_date.desc&limit=${limit}`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, next: { revalidate: 3600 } }
    );
    if (!r.ok) return [];
    const rows = await r.json();
    return (rows || [])
      .map((x) => ({ date: String(x.obs_date).slice(0, 10), value: parseFloat(x.value) }))
      .filter((x) => Number.isFinite(x.value));
  } catch {
    return [];
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (iso) => (iso ? `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : null);
const signed = (n, d = 1, suffix = "") => `${n >= 0 ? "+" : ""}${n.toFixed(d)}${suffix}`;

export async function getHubMacro() {
  const [curve, ff, cpi, unemp, sent] = await Promise.all([
    getYieldCurve().catch(() => null),
    series("fed_funds", 2),
    series("cpi_headline", 15),
    series("unemployment", 2),
    series("umich_sentiment_direct", 2),
  ]);

  const items = [];

  const t10 = curve?.points?.find((p) => p.label === "10Y");
  if (t10) items.push({ key: "t10", label: "10Y Treasury", value: `${t10.y.toFixed(2)}%`, period: curve.date, source: "U.S. Treasury" });

  if (ff[0]) {
    const d = ff[1] ? ff[0].value - ff[1].value : null;
    items.push({ key: "ff", label: "Fed Funds (eff.)", value: `${ff[0].value.toFixed(2)}%`, change: d != null ? `${signed(d, 2)} MoM` : null, period: monthLabel(ff[0].date), source: "Federal Reserve via FRED" });
  }

  const base = yearAgo(cpi);
  if (cpi[0] && base) {
    const yoy = (cpi[0].value / base.value - 1) * 100;
    items.push({ key: "cpi", label: "CPI Inflation", value: signed(yoy, 1, "%"), change: "YoY", period: monthLabel(cpi[0].date), source: "BLS via FRED" });
  }

  if (unemp[0]) {
    const d = unemp[1] ? unemp[0].value - unemp[1].value : null;
    items.push({ key: "unemp", label: "Unemployment", value: `${unemp[0].value.toFixed(1)}%`, change: d != null ? `${signed(d, 1, "pp")} MoM` : null, period: monthLabel(unemp[0].date), source: "BLS via FRED" });
  }

  if (sent[0]) {
    const d = sent[1] ? sent[0].value - sent[1].value : null;
    items.push({ key: "sent", label: "Consumer Sentiment", value: sent[0].value.toFixed(1), change: d != null ? `${signed(d, 1)} MoM` : null, period: monthLabel(sent[0].date), source: "UMich" });
  }

  return {
    items,
    attribution:
      "Sources: U.S. Treasury; Federal Reserve and U.S. Bureau of Labor Statistics via FRED; University of Michigan, Survey Research Center, Surveys of Consumers.",
  };
}
