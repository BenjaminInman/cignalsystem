"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crosshair, ArrowUpRight } from "lucide-react";

// Timing-role tones, consistent with the Cycle Wheel / tone palette.
const ROLE_TONE = {
  leading: "#5FB97C",
  coincident: "#E8B04B",
  lagging: "#E5634D",
};

function RoleChip({ role }) {
  if (!role) return null;
  const c = ROLE_TONE[role] || "#797e85";
  return (
    <span
      className="mono inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9.5px] tracking-[0.12em]"
      style={{ color: c, backgroundColor: `${c}1a`, border: `1px solid ${c}33` }}
    >
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: c }} />
      {role.toUpperCase()}
    </span>
  );
}

export default function FieldIntel() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("/api/field-intel")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.items)) setItems(d.items);
      })
      .catch(() => {});
  }, []);

  if (!items.length) return null;

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="kicker mb-3 flex items-center gap-2">
            <Crosshair size={12} className="text-signal" /> Field Intel &middot; Soft Signals
          </p>
          <h2 className="headline text-3xl text-ink md:text-4xl">Scrubbed from the wire</h2>
          <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Forward-looking facts pulled from public reporting, stripped of spin and reduced to what&apos;s
            checkable &mdash; the open-source read that often moves before the measured data prints.
          </p>
        </div>
        <Link
          href="/signals"
          className="hover-line mono hidden text-[12px] tracking-[0.08em] text-muted hover:text-ink md:inline"
        >
          ALL SIGNALS &rarr;
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it, i) => {
          const external = it.url && it.url.startsWith("http");
          const Wrap = external ? "a" : "div";
          const wp = external ? { href: it.url, target: "_blank", rel: "noopener noreferrer" } : {};
          return (
            <Wrap
              key={i}
              {...wp}
              className="card group relative flex flex-col p-5 transition-colors hover:border-[var(--line-strong)]"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mono rounded-sm bg-[var(--signal-dim)] px-1.5 py-0.5 text-[9.5px] tracking-[0.12em] text-signal">
                  {it.category}
                </span>
                <RoleChip role={it.role} />
                <span className="mono ml-auto text-[10px] tracking-[0.10em] text-[#5f636a]">SOFT</span>
              </div>

              <p className="text-[13.5px] leading-relaxed text-ink">{it.fact}</p>

              <div className="mono mt-4 flex items-center gap-2 text-[10.5px] tracking-[0.06em] text-muted">
                <span>{it.source}</span>
                {it.date && (
                  <>
                    <span className="text-[#3a3d42]">/</span>
                    <span>{it.date}</span>
                  </>
                )}
                {external && (
                  <ArrowUpRight
                    size={12}
                    className="ml-auto text-signal opacity-0 transition-opacity group-hover:opacity-100"
                  />
                )}
              </div>
            </Wrap>
          );
        })}
      </div>
    </section>
  );
}
