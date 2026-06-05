import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });

const MATS = [
  { key: "BC_1MONTH", label: "1M" },
  { key: "BC_3MONTH", label: "3M" },
  { key: "BC_6MONTH", label: "6M" },
  { key: "BC_1YEAR", label: "1Y" },
  { key: "BC_2YEAR", label: "2Y" },
  { key: "BC_3YEAR", label: "3Y" },
  { key: "BC_5YEAR", label: "5Y" },
  { key: "BC_7YEAR", label: "7Y" },
  { key: "BC_10YEAR", label: "10Y" },
  { key: "BC_20YEAR", label: "20Y" },
  { key: "BC_30YEAR", label: "30Y" },
];

const feedUrl = (yyyymm) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${yyyymm}`;

async function fetchMonth(yyyymm) {
  const res = await fetch(feedUrl(yyyymm), {
    next: { revalidate: 43200 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CignalSystem/1.0)" },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const j = parser.parse(xml);
  let entries = j?.feed?.entry || [];
  if (!Array.isArray(entries)) entries = [entries];
  return entries.map((e) => e?.content?.properties).filter(Boolean);
}

export async function getYieldCurve() {
  try {
    const now = new Date();
    const ym = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    let props = await fetchMonth(ym(now));
    if (!props.length) {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      props = await fetchMonth(ym(prev));
    }
    if (!props.length) return null;

    props.sort((a, b) => new Date(a.NEW_DATE) - new Date(b.NEW_DATE));
    const latest = props[props.length - 1];

    const points = MATS.map((m) => {
      const v = parseFloat(latest[m.key]);
      return Number.isFinite(v) ? { label: m.label, y: v } : null;
    }).filter(Boolean);
    if (points.length < 4) return null;

    const get = (lbl) => points.find((p) => p.label === lbl)?.y;
    const y10 = get("10Y"), y2 = get("2Y"), m3 = get("3M");

    return {
      date: latest.NEW_DATE
        ? new Date(latest.NEW_DATE).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "",
      points,
      spread2s10s: y10 != null && y2 != null ? +(y10 - y2).toFixed(2) : null,
      spread3m10y: y10 != null && m3 != null ? +(y10 - m3).toFixed(2) : null,
    };
  } catch {
    return null;
  }
}
