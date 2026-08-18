import Link from "next/link";
import { socialLinks } from "@/lib/brand";
import { ICONS } from "@/components/SocialIcons";
import { getActiveContent } from "@/lib/active-vertical";

const COLS = [
  { title: "PLATFORM", links: [["Dashboard", "/"], ["Indicators", "/indicators"], ["Market Maps", "/market-maps"], ["Signals", "/signals"]] },
  { title: "ANALYSIS", links: [["Forecasts", "/forecasts"], ["Research", "/research"], ["Portfolio Tracker", "/portfolio"], ["Benchmarks", "/market-maps"]] },
  { title: "COMPANY", links: [["About", "/about"], ["Methodology", "/about"], ["Training & Certification", "/training"], ["FAQ", "/faq"], ["Disclaimer", "/disclaimer"]] },
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
              {COPY.footerTagline || "Military Grade Economic Intelligence for Multifamily Real Estate Owners, Operators, Investors, Management Firms, Lenders and Equity Groups."}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socialLinks().map(({ key, label, href }) => {
                const Icon = ICONS[key];
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-muted transition-colors hover:border-signal/40 hover:text-signal"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                  </a>
                );
              })}
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
        <div className="mt-12 border-t border-[var(--line)] pt-6">
          <div className="flex flex-col gap-3 text-[11px] text-muted/70 md:flex-row md:items-center md:justify-between">
            <span className="mono">© {new Date().getFullYear()} Cignal System LLC. All rights reserved. · Offices: Nashville, TN / West Palm Beach, FL</span>
            <div className="mono flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href="/faq" className="transition-colors hover:text-ink">FAQ</Link>
              <Link href="/terms" className="transition-colors hover:text-ink">Terms of Service</Link>
              <Link href="/privacy" className="transition-colors hover:text-ink">Privacy Policy</Link>
              <Link href="/disclaimer" className="transition-colors hover:text-ink">Disclaimer</Link>
            </div>
          </div>
          <p className="mono mt-3 text-[11px] leading-relaxed text-muted/70">
            Data is indicative and for informational and educational purposes only. Not investment advice. Always verify with primary sources.
          </p>
        </div>
      </div>
    </footer>
  );
}
