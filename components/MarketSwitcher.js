"use client";

// The market tag beside the logo doubles as a switcher: back to the
// cignalsystem.com hub, or over to another market. Plain <a> links on
// purpose: the hub and each market render different page chrome, so a full
// page load is needed to swap it cleanly.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, LayoutGrid } from "lucide-react";
import { VERTICAL_PATH } from "@/lib/vertical-slug";

const MARKETS = [
  { slug: "multifamily", label: "Multifamily" },
  { slug: "investor", label: "Passive Investors" },
  { slug: "general-real-estate", label: "Real Estate Investors" },
  { slug: "small-business", label: "Business Owners", soon: true },
];

export default function MarketSwitcher({ vertical }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!vertical?.label) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch market"
        className="mono flex items-center gap-1 rounded border border-[var(--line-strong)] px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-muted transition-colors hover:border-signal/50 hover:text-ink"
      >
        {vertical.label.toUpperCase()}
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute -left-24 top-full z-50 mt-2 w-60 sm:left-0 overflow-hidden rounded-lg border border-[var(--line-strong)] bg-bg2 p-1.5 shadow-2xl shadow-black/50">
          <a
            href="/"
            role="menuitem"
            className="mono flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[12px] tracking-[0.04em] text-signal hover:bg-white/[0.04]"
          >
            <LayoutGrid size={14} strokeWidth={1.8} /> All markets (home)
          </a>
          <div className="mx-2 my-1.5 h-px bg-[var(--line)]" />
          <p className="kicker px-3 py-1.5">Switch market</p>
          {MARKETS.map((m) => {
            const current = m.slug === vertical.slug;
            return (
              <a
                key={m.slug}
                href={`/${VERTICAL_PATH[m.slug]}`}
                role="menuitem"
                aria-current={current ? "page" : undefined}
                className={`mono flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[12px] tracking-[0.04em] transition-colors ${
                  current ? "bg-signal/10 text-signal" : "text-muted hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                <span className="flex-1">{m.label}</span>
                {current && <Check size={13} />}
                {m.soon && !current && <span className="text-[9px] tracking-[0.12em] text-muted/70">SOON</span>}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
