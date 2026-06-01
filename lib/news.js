import Parser from "rss-parser";

const parser = new Parser({ timeout: 8000 });

// Primary feed URL per source. If a source ever stops returning items,
// swap its URL here — the page falls back gracefully in the meantime.
const FEEDS = [
  { source: "The Real Deal", url: "https://therealdeal.com/feed/" },
  { source: "Multifamily Dive", url: "https://www.multifamilydive.com/feeds/news/" },
  { source: "Multi-Housing News", url: "https://www.multihousingnews.com/feed/" },
  { source: "MultifamilyBiz", url: "https://www.multifamilybiz.com/rss?s=News" },
];

function clean(s = "") {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchFeed({ source, url }) {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CignalSystem/1.0; +https://cignal-system.vercel.app)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    return (feed.items || []).slice(0, 8).map((it) => {
      const raw = it.isoDate || it.pubDate || null;
      const ts = raw ? new Date(raw).getTime() : 0;
      const snippet = clean(it.contentSnippet || it.content || it.summary || "");
      return {
        title: clean(it.title || ""),
        link: it.link || url,
        source,
        cat: it.categories && it.categories[0] ? clean(String(it.categories[0])) : source,
        date: raw ? new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
        excerpt: snippet.length > 150 ? snippet.slice(0, 150).trim() + "…" : snippet,
        ts,
      };
    }).filter((x) => x.title);
  } catch {
    return [];
  }
}

export async function getNews(limit = 18) {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  items.sort((a, b) => b.ts - a.ts);
  return items.slice(0, limit).map(({ ts, ...rest }) => rest);
}
