"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Activity, BarChart3, LineChart, Radio, BookOpen, Briefcase, Bell } from "lucide-react";

const TABS = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Indicators", href: "/indicators", icon: Activity },
  { label: "Market Maps", href: "/market-maps", icon: BarChart3 },
  { label: "Forecasts", href: "/forecasts", icon: LineChart },
  { label: "Signals", href: "/signals", icon: Radio },
  { label: "Research", href: "/research", icon: BookOpen },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
              <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
              <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
            </svg>
          </span>
          <span className="mono text-sm font-medium tracking-[0.16em] text-ink">
            CIGNAL<span className="text-signal">·</span>SYSTEM
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {TABS.map(({ label, href, icon: Icon }) => {
            const active = path === href;
            return (
              <Link
                key={label}
                href={href}
                className={`mono flex items-center gap-2 rounded-md px-3 py-2 text-[12px] tracking-[0.06em] transition-colors ${
                  active ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Bell size={18} className="hidden text-muted sm:block" strokeWidth={1.6} />
          <Link
            href="/signals"
            className="mono flex items-center gap-2 rounded-sm border border-signal/40 bg-signal/10 px-3.5 py-2 text-[12px] tracking-[0.08em] text-signal transition-all hover:bg-signal hover:text-bg"
          >
            <Radio size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Live Signals</span>
          </Link>
        </div>
      </div>

      {/* mobile/condensed tab strip */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-[var(--line)] px-3 py-2 lg:hidden">
        {TABS.map(({ label, href }) => {
          const active = path === href;
          return (
            <Link
              key={label}
              href={href}
              className={`mono shrink-0 rounded-md px-3 py-1.5 text-[11px] tracking-[0.06em] ${
                active ? "bg-signal/10 text-signal" : "text-muted"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
