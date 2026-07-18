"use client";

import { useEffect, useState } from "react";
import { useContent } from "@/components/VerticalProvider";

function Item({ label, value, delta, dir, live }) {
  const color = dir === "up" ? "#5FB97C" : "#E5634D";
  return (
    <span className="mono inline-flex items-center gap-2 px-6 text-[12px] tracking-wide whitespace-nowrap">
      {live && <span className="h-1 w-1 rounded-full bg-signal" />}
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
      <span style={{ color }}>{delta}</span>
      <span className="text-[var(--line-strong)]">/</span>
    </span>
  );
}

export default function Ticker() {
  const { TICKER = [] } = useContent();
  // The content pack supplies the ROWS (which labels exist, in what order) but
  // never the numbers. Values start blank and are only ever filled by the feed.
  //
  // This used to seed state with the pack's sample values, so any row the feed
  // didn't cover — or every row, if the fetch failed — kept rendering a
  // hard-coded number under the LIVE FEED banner. That is how ABSORPTION RATE
  // sat at a fabricated 92.4% while the real series read 46.8%. A dash is the
  // honest answer when there is no number; a confident wrong one is not.
  const blank = (it) => ({ ...it, value: "—", delta: "", dir: "up", live: false });
  const [items, setItems] = useState(() => TICKER.map(blank));
  const [time, setTime] = useState("");

  useEffect(() => {
    setItems(TICKER.map(blank));
  }, [TICKER]);

  // pull live values; anything the feed doesn't cover stays blank
  useEffect(() => {
    fetch("/api/ticker")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.items) {
          setItems(
            TICKER.map((it) =>
              d.items[it.label] ? { ...it, ...d.items[it.label] } : blank(it)
            )
          );
        }
      })
      .catch(() => {
        /* leave the dashes — a dead feed must never resurrect the samples */
      });
  }, [TICKER]);

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " EST";
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 30000);
    return () => clearInterval(id);
  }, []);

  const loop = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden border-b border-[var(--line)] bg-[#0a0b0d]/90 backdrop-blur">
      <div className="absolute left-0 top-0 z-20 flex h-full items-center gap-1.5 bg-[#0a0b0d] pl-4 pr-5">
        <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" />
        <span className="mono text-[10px] tracking-[0.2em] text-signal">LIVE FEED</span>
      </div>
      <div className="pointer-events-none absolute right-0 top-0 z-20 hidden h-full items-center bg-[#0a0b0d] pl-5 pr-4 sm:flex">
        <span className="mono text-[10px] tracking-[0.16em] text-muted">{time}</span>
      </div>
      <div className="flex w-max animate-ticker py-2 pl-32 will-change-transform">
        {loop.map((it, i) => (
          <Item key={i} {...it} />
        ))}
      </div>
    </div>
  );
}
