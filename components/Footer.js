import Link from "next/link";

const COLS = [
  { title: "PLATFORM", links: [["Dashboard", "/"], ["Indicators", "/indicators"], ["Market Maps", "/market-maps"], ["Signals", "/signals"]] },
  { title: "ANALYSIS", links: [["Forecasts", "/forecasts"], ["Research", "/research"], ["Portfolio Tracker", "/portfolio"], ["Benchmarks", "/market-maps"]] },
  { title: "COMPANY", links: [["About", "#"], ["Methodology", "#"], ["Data Sources", "#"], ["Contact", "#"]] },
];

export default function Footer() {
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
              Economic intelligence for multifamily real estate owners, operators, and investors.
            </p>
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
