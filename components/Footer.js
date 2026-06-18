import Link from "next/link";
import { Facebook, Youtube, Instagram } from "lucide-react";
import { getActiveContent } from "@/lib/active-vertical";

const COLS = [
  { title: "PLATFORM", links: [["Dashboard", "/"], ["Indicators", "/indicators"], ["Market Maps", "/market-maps"], ["Signals", "/signals"]] },
  { title: "ANALYSIS", links: [["Forecasts", "/forecasts"], ["Research", "/research"], ["Portfolio Tracker", "/portfolio"], ["Benchmarks", "/market-maps"]] },
  { title: "COMPANY", links: [["About", "/about"], ["Methodology", "/about"], ["Data Sources", "#"], ["Contact", "#"]] },
];

export default function Footer() {
  const { COPY = {} } = getActiveContent();
  return (
    <footer className="relative z-10 border-t border-[var(--line)] bg-bg/60">
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
                <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
                <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
              </svg>
              <span className="mono text-sm tracking-[0.16em] text-ink">CIGNAL<span className="text-signal">·</span>SYSTEM</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {COPY.footerTagline || "Military Grade Economic Intelligence for Multifamily Real Estate Owners, Operators, Investors and Property Management Teams."}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a href="#" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-muted transition-colors hover:border-signal/40 hover:text-signal">
                <Facebook size={16} strokeWidth={1.8} />
              </a>
              <a href="#" aria-label="X" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-muted transition-colors hover:border-signal/40 hover:text-signal">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="#" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-muted transition-colors hover:border-signal/40 hover:text-signal">
                <Youtube size={17} strokeWidth={1.8} />
              </a>
              <a href="#" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-muted transition-colors hover:border-signal/40 hover:text-signal">
                <Instagram size={16} strokeWidth={1.8} />
              </a>
              <a href="#" aria-label="TikTok" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-muted transition-colors hover:border-signal/40 hover:text-signal">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.27 0 .53.04.78.12V9.66a5.7 5.7 0 0 0-.78-.05 5.7 5.7 0 1 0 5.69 5.7V8.99a7.34 7.34 0 0 0 4.3 1.38V7.27a4.3 4.3 0 0 1-3.25-1.45z" /></svg>
              </a>
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="kicker mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-muted transition-colors hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--line)] pt-6 text-[11px] text-muted/70 md:flex-row md:items-center md:justify-between">
          <span className="mono">© {new Date().getFullYear()} Cignal System. All rights reserved.</span>
          <span className="mono">Data is indicative. Not investment advice. Always verify with primary sources.</span>
        </div>
      </div>
    </footer>
  );
}
