"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Activity, BarChart3, LineChart, Radio, BookOpen, Briefcase, ArrowUpRight, Plus, X, Check, ChevronDown, Star } from "lucide-react";
import { useVertical, useContent } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import MyZipCodes from "@/components/MyZipCodes";
import MarketSnapshot from "@/components/MarketSnapshot";
import { createClient } from "@/lib/supabase/client";
import { toneColor } from "@/components/ui";

const SUITE = [
  { name: "Indicators", href: "/indicators", icon: Activity, desc: "Leading & trailing metrics across every major metro." },
  { name: "Market Maps", href: "/market-maps", icon: BarChart3, desc: "Fundamentals scored and ranked across 390+ MSAs." },
  { name: "Forecasts", href: "/forecasts", icon: LineChart, desc: "5-year forward projections and scenario models." },
  { name: "Signals", href: "/signals", icon: Radio, desc: "Synthesized alerts when a market shifts cycle phase." },
  { name: "Research", href: "/research", icon: BookOpen, desc: "In-depth briefings that turn data into a thesis." },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase, desc: "Your assets, scored against live market position." },
];

export default function DashboardPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "dashboard")) return <ComingSoonInline vertical={vertical} title="Dashboard" />;
  return <DashboardInner />;
}

function DashboardInner() {
  const { DASH_STATS = [] } = useContent();
  const mt = DASH_STATS.find((s) => s.label === "MULTIFAMILY MARKETS");
  const markets = mt && mt.value !== "—" ? `${mt.value} ${mt.unit}` : "every major metro";
  const suite = SUITE.map((s) =>
    s.name === "Market Maps" ? { ...s, desc: `Fundamentals scored and ranked across ${markets}.` } : s
  );

  const [email, setEmail] = useState("");
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);

  return (
    <div className="pt-12 pb-16">
      <p className="kicker mb-3 flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-up" /> Subscriber Terminal · Live
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Command center</h1>
      <p className="mt-3 max-w-2xl text-muted">
        {email ? <>Signed in as <span className="text-ink">{email}</span>. </> : null}
        Your full intelligence suite is unlocked — jump into any module below.
      </p>

      <Watchlist />

      <MyZipCodes />


      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* LEFT: live market snapshot — cycle read for the user's tracked markets */}
        <MarketSnapshot />

        {/* RIGHT: live suite navigation (unlocked — these are now active links) */}
        <div>
          <p className="kicker mb-4">Your suite</p>
          <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {suite.map((s) => (
              <Link
                key={s.name}
                href={s.href}
                className="group relative bg-bg2 p-6 transition-colors hover:bg-white/[0.03]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/10">
                    <s.icon size={15} className="text-signal" strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight size={15} className="text-muted transition-colors group-hover:text-signal" />
                </div>
                <h3 className="font-semibold text-ink">{s.name}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Watchlist() {
  const { INDICATORS = [] } = useContent();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState(null);
  const [selected, setSelected] = useState(null); // null = loading; otherwise array of names
  const [live, setLive] = useState({});
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);

  const catalog = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const it of INDICATORS) {
      if (it.name && !seen.has(it.name)) {
        seen.add(it.name);
        out.push({ name: it.name, type: it.type || "" });
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [INDICATORS]);

  useEffect(() => {
    fetch("/api/indicators").then((r) => r.json()).then((d) => setLive(d.items || {})).catch(() => setLive({}));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setSelected([]); return; }
      setUserId(user.id);
      const { data } = await supabase.from("watchlist").select("name, position").eq("user_id", user.id).order("position", { ascending: true });
      if (!active) return;
      setSelected((data || []).map((r) => r.name));
    })();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = async (name) => {
    if (selected == null) return;
    if (selected.includes(name)) {
      setSelected(selected.filter((n) => n !== name));
      if (userId) await supabase.from("watchlist").delete().eq("user_id", userId).eq("name", name);
    } else {
      const next = [...selected, name];
      setSelected(next);
      if (userId) await supabase.from("watchlist").upsert({ user_id: userId, name, position: next.length - 1 });
    }
  };

  const metric = (name) => {
    const stat = INDICATORS.find((i) => i.name === name) || {};
    const lv = live[name] || {};
    return { type: stat.type, value: lv.value ?? stat.value, unit: lv.unit ?? stat.unit, change: lv.change ?? stat.change, tone: lv.tone ?? stat.tone };
  };

  return (
    <section className="relative mt-10 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.07] via-bg2/40 to-bg/20 p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker mb-2 flex items-center gap-2"><Star size={12} className="text-signal" /> My Indicators</p>
          <h2 className="headline text-2xl text-ink">Your watchlist</h2>
          <p className="mt-1 text-sm text-muted">The indicators you care about, in one place. Add as many as you like.</p>
        </div>

        <div className="relative" ref={ddRef}>
          <button onClick={() => setOpen((v) => !v)} className="mono flex items-center gap-2 rounded-md border border-signal/40 bg-signal/10 px-4 py-2.5 text-[12px] tracking-[0.04em] text-signal hover:bg-signal/20">
            <Plus size={14} /> Add indicators <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {open && (
            <div className="absolute right-0 z-20 mt-2 max-h-80 w-72 overflow-y-auto rounded-lg border border-[var(--line)] bg-bg2 p-1.5 shadow-xl">
              {catalog.map((c) => {
                const on = selected?.includes(c.name);
                return (
                  <button key={c.name} onClick={() => toggle(c.name)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-white/[0.04]">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-signal bg-signal" : "border-[var(--line-strong)]"}`}>
                      {on && <Check size={11} className="text-bg" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 text-ink">{c.name}</span>
                    {c.type && <span className="mono text-[9px] tracking-[0.08em] text-muted">{c.type === "LEADING" ? "LEAD" : "TRAIL"}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        {selected === null ? (
          <p className="mono text-[12px] text-muted">Loading your indicators…</p>
        ) : selected.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--line-strong)] p-8 text-center">
            <p className="text-sm text-muted">No indicators yet. Use <span className="text-signal">Add indicators</span> to build your watchlist — it&apos;ll load here automatically every time you sign in.</p>
          </div>
        ) : (
          <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
            {selected.map((name) => {
              const m = metric(name);
              const c = m.tone ? toneColor(m.tone) : "#ECEDEF";
              return (
                <div key={name} className="group relative bg-bg2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-medium leading-tight text-ink">{name}</span>
                    <button onClick={() => toggle(name)} className="shrink-0 text-muted opacity-0 transition-opacity hover:text-down group-hover:opacity-100" aria-label="Remove">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="mono text-lg text-ink">{m.value ?? "—"}</span>
                    {m.unit && <span className="mono text-[10px] text-muted">{m.unit}</span>}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="mono text-[11px]" style={{ color: c }}>{m.change ?? ""}</span>
                    {m.type && <span className="mono text-[9px] tracking-[0.08em] text-muted">{m.type}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {selected && selected.length > 0 && (
          <p className="mt-3 text-[12px] text-muted">Want more detail? Open the <Link href="/indicators" className="text-signal hover:underline">Indicators</Link> or <Link href="/signals" className="text-signal hover:underline">Signals</Link> tab.</p>
        )}
      </div>
    </section>
  );
}
