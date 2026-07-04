"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, ArrowUpRight, Loader2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const UP = "#5FB97C", DOWN = "#E5634D", AMBER = "#E0A33A";
const CAP = 6;

const PHASE = {
  recovery: { label: "Recovery", color: UP },
  expansion: { label: "Expansion", color: UP },
  hypersupply: { label: "Hypersupply", color: AMBER },
  contraction: { label: "Contraction", color: DOWN },
};

// Balance-derived lean — a read, not a hard call. Surfaces the dominant phase
// only when the signals actually cluster; otherwise reports the tilt.
function leanOf(d) {
  if (!d || !d.tally || !d.tally.total) return null;
  const { green = 0, red = 0 } = d.tally;
  if (d.lead && d.concentration >= 0.38 && PHASE[d.lead]) {
    return { label: `${PHASE[d.lead].label}-leaning`, color: PHASE[d.lead].color };
  }
  if (green > red + 1) return { label: "Strengthening", color: UP };
  if (red > green + 1) return { label: "Softening", color: DOWN };
  return { label: "Mixed signals", color: AMBER };
}

function MarketRow({ zip, name, read }) {
  if (!read) {
    return (
      <div className="py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">{name}</span>
          <Loader2 size={13} className="animate-spin text-muted" />
        </div>
      </div>
    );
  }

  const lean = leanOf(read);
  const t = read.tally || { green: 0, neutral: 0, red: 0, total: 0 };
  const total = t.total || 1;

  return (
    <Link
      href={`/market-maps?zip=${zip}`}
      className="group block py-3 transition-colors hover:bg-white/[0.02]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-ink">
          {name}
          <span className="mono ml-1.5 text-[10px] text-muted">{zip}</span>
        </span>
        {lean ? (
          <span className="mono shrink-0 text-[11px] font-medium" style={{ color: lean.color }}>
            {lean.label}
          </span>
        ) : (
          <span className="mono shrink-0 text-[10px] text-muted">Limited coverage</span>
        )}
      </div>

      {t.total > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <span style={{ width: `${(t.green / total) * 100}%`, background: UP }} />
            <span style={{ width: `${(t.neutral / total) * 100}%`, background: AMBER }} />
            <span style={{ width: `${(t.red / total) * 100}%`, background: DOWN }} />
          </div>
          <span className="mono shrink-0 text-[10px] text-muted">
            <span style={{ color: UP }}>{t.green}</span>
            <span className="mx-0.5">·</span>
            <span style={{ color: AMBER }}>{t.neutral}</span>
            <span className="mx-0.5">·</span>
            <span style={{ color: DOWN }}>{t.red}</span>
          </span>
        </div>
      )}
    </Link>
  );
}

export default function MarketSnapshot() {
  const supabase = useMemo(() => createClient(), []);
  const [zips, setZips] = useState(null); // null = loading; [] = none
  const [places, setPlaces] = useState({});
  const [reads, setReads] = useState({}); // zip -> read json

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setZips([]); return; }
      const { data } = await supabase
        .from("user_zip_codes")
        .select("zip, position")
        .eq("user_id", user.id)
        .order("position", { ascending: true });
      if (!active) return;
      const list = (data || []).map((r) => r.zip);
      setZips(list);
      if (list.length) {
        const { data: xw } = await supabase
          .from("zip_crosswalk")
          .select("zip, city_label")
          .in("zip", list);
        if (active && xw) setPlaces(Object.fromEntries(xw.map((r) => [r.zip, r.city_label])));
      }
    })();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!zips || !zips.length) return;
    let active = true;
    zips.slice(0, CAP).forEach((zip) => {
      fetch(`/api/market-read?zip=${zip}`)
        .then((r) => r.json())
        .then((d) => { if (active) setReads((p) => ({ ...p, [zip]: d })); })
        .catch(() => { if (active) setReads((p) => ({ ...p, [zip]: { error: true, tally: null } })); });
    });
    return () => { active = false; };
  }, [zips]);

  const shown = (zips || []).slice(0, CAP);
  const nameFor = (zip) => reads[zip]?.resolved?.metroName || places[zip] || zip;

  return (
    <div className="card flex h-full flex-col p-7">
      <p className="kicker mb-1 flex items-center gap-2">
        <Compass size={13} className="text-signal" /> Market snapshot
      </p>
      <h2 className="headline text-2xl text-ink">Your markets</h2>

      {zips === null ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading your markets…
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col">
          <p className="text-sm leading-relaxed text-muted">
            You&rsquo;re not tracking any markets yet. Add a local market in{" "}
            <span className="text-ink">My Zip Codes</span> above and its four-phase cycle read
            will appear here — where each market sits, at a glance.
          </p>
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--line-strong)] px-4 py-3 text-[13px] text-muted">
              <MapPin size={14} className="text-signal" />
              Track a ZIP to unlock its cycle read
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            The cycle read across the markets you track. Leading and lagging signals, rolled to a lean.
          </p>
          <div className="mt-3 divide-y divide-[var(--line)]">
            {shown.map((zip) => (
              <MarketRow key={zip} zip={zip} name={nameFor(zip)} read={reads[zip]} />
            ))}
          </div>
          {zips.length > CAP && (
            <p className="mono mt-3 text-[10px] text-muted">+{zips.length - CAP} more tracked</p>
          )}
          <div className="mt-auto pt-5">
            <Link
              href="/market-maps"
              className="mono inline-flex items-center gap-1.5 text-[12px] font-medium tracking-[0.04em] text-signal transition-colors hover:text-ink"
            >
              Open Market Maps <ArrowUpRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
