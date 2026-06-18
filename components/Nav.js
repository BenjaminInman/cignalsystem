"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Home, Newspaper, Radio, Info, LayoutDashboard, Activity, BarChart3, LineChart, TrendingUp, BookOpen, Briefcase, Users, Bell, ChevronDown, Terminal, LogOut, ShieldCheck, Lock } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";
import { createClient } from "@/lib/supabase/client";
import { FREE_PAGES } from "@/lib/access";

const PRIMARY = [
  { label: "Home", href: "/", icon: Home },
  { label: "About", href: "/about", icon: Info },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Signals", href: "/signals", icon: Radio },
];

const SUITE = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Indicators", href: "/indicators", icon: Activity },
  { label: "Market Maps", href: "/market-maps", icon: BarChart3 },
  { label: "Forecasts", href: "/forecasts", icon: LineChart },
  { label: "Indices", href: "/indices", icon: TrendingUp },
  { label: "Research", href: "/research", icon: BookOpen },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
  { label: "Community", href: "/community", icon: Users },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const vertical = useVertical();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inSuite = SUITE.some((s) => s.href === path);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tier, setTier] = useState("free");
  useEffect(() => {
    const supabase = createClient();
    const load = (u) => {
      setUser(u ?? null);
      if (u) {
        supabase
          .from("profiles")
          .select("is_admin, tier")
          .eq("id", u.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(!!data?.is_admin);
            setTier(data?.tier || "free");
          });
      } else {
        setIsAdmin(false);
        setTier("free");
      }
    };
    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      load(session?.user)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3">
        <div className="flex shrink-0 items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
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
          {vertical?.label && (
            <span className="mono hidden rounded border border-[var(--line-strong)] px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-muted sm:inline-block">
              {vertical.label.toUpperCase()}
            </span>
          )}
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {PRIMARY.map(({ label, href, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={label} href={href}
                className={`mono flex items-center gap-2 rounded-md px-3 py-2 text-[12px] tracking-[0.06em] transition-colors ${active ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"}`}>
                <Icon size={14} strokeWidth={1.8} />{label}
              </Link>
            );
          })}

          {/* Terminal dropdown */}
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen((o) => !o)}
              className={`mono flex items-center gap-2 rounded-md px-3 py-2 text-[12px] tracking-[0.06em] transition-colors ${inSuite || open ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"}`}>
              <Terminal size={14} strokeWidth={1.8} /> Terminal
              <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-[var(--line-strong)] bg-bg2 p-1.5 shadow-2xl shadow-black/50">
                <p className="kicker px-3 py-2">Subscriber Suite</p>
                {SUITE.map(({ label, href, icon: Icon }) => {
                  const active = path === href;
                  const slug = href.replace(/^\//, "");
                  const locked = !isAdmin && tier !== "pro" && !FREE_PAGES.includes(slug);
                  return (
                    <Link key={label} href={href} onClick={() => setOpen(false)}
                      className={`mono flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[12px] tracking-[0.04em] transition-colors ${active ? "bg-signal/10 text-signal" : "text-muted hover:bg-white/[0.04] hover:text-ink"}`}>
                      <Icon size={14} strokeWidth={1.8} />
                      <span className="flex-1">{label}</span>
                      {locked && <Lock size={12} className="text-muted/70" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <Bell size={18} className="hidden text-muted sm:block" strokeWidth={1.6} />
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="mono flex items-center gap-1.5 rounded-sm border border-signal/30 px-3 py-2 text-[12px] tracking-[0.08em] text-signal transition-colors hover:bg-signal/10"
                >
                  <ShieldCheck size={13} strokeWidth={1.8} /> Admin
                </Link>
              )}
              <span className="mono hidden max-w-[160px] truncate text-[11px] tracking-[0.04em] text-muted lg:inline-block">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="mono flex items-center gap-1.5 rounded-sm border border-[var(--line-strong)] px-3 py-2 text-[12px] tracking-[0.08em] text-muted transition-colors hover:text-ink"
              >
                <LogOut size={13} strokeWidth={1.8} /> Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="mono rounded-sm border border-signal/40 bg-signal/10 px-4 py-2 text-[12px] tracking-[0.08em] text-signal transition-all hover:bg-signal hover:text-bg"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* mobile strip */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-[var(--line)] px-3 py-2 md:hidden">
        {[...PRIMARY, ...SUITE].map(({ label, href }) => {
          const active = path === href;
          return (
            <Link key={label} href={href}
              className={`mono shrink-0 rounded-md px-3 py-1.5 text-[11px] tracking-[0.06em] ${active ? "bg-signal/10 text-signal" : "text-muted"}`}>
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
