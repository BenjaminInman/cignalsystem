"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Plus, X, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sparkline, toneColor } from "@/components/ui";

const GRAIN_LABEL = { zip: "ZIP", city: "CITY", county: "COUNTY", metro: "METRO" };

// Local formatters — kept correct for values past 1M (avoids the site-wide "K past 1M" bug).
const usd = (v) =>
  v == null || isNaN(v) ? "—" : `$${Math.round(v).toLocaleString("en-US")}`;
const pct = (v) => (v == null || isNaN(v) ? "—" : `${v > 0 ? "+" : ""}${v}%`);
const pctPlain = (v) => (v == null || isNaN(v) ? "—" : `${v}%`);

export default function MyZipCodes() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState(null);
  const [zips, setZips] = useState(null); // null = loading; else [{ zip, position }]
  const [places, setPlaces] = useState({}); // zip -> "City, ST"
  const [open, setOpen] = useState(() => new Set()); // expanded zips
  const [details, setDetails] = useState({}); // zip -> { loading, rent, demo, error }
  const [input, setInput] = useState("");
  const [addError, setAddError] = useState("");
  const [busy, setBusy] = useState(false);

  // Load the user's saved ZIPs
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setZips([]); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("user_zip_codes")
        .select("zip, position")
        .eq("user_id", user.id)
        .order("position", { ascending: true });
      if (!active) return;
      setZips(data || []);
      const list = (data || []).map((r) => r.zip);
      if (list.length) {
        const { data: xw } = await supabase.from("zip_crosswalk").select("zip, city_label").in("zip", list);
        if (active && xw) setPlaces(Object.fromEntries(xw.map((r) => [r.zip, r.city_label])));
      }
    })();
    return () => { active = false; };
  }, [supabase]);

  // Fetch detail for a ZIP the first time it's expanded
  const loadDetail = async (zip) => {
    if (details[zip] && !details[zip].error) return;
    setDetails((d) => ({ ...d, [zip]: { loading: true } }));
    try {
      const [rRes, dRes] = await Promise.all([
        fetch(`/api/zip?zip=${zip}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/zip-demographics?zip=${zip}`).then((r) => r.json()).catch(() => null),
      ]);
      setDetails((d) => ({
        ...d,
        [zip]: {
          loading: false,
          rent: rRes && rRes.found ? rRes : null,
          demo: dRes && dRes.found ? dRes : null,
        },
      }));
    } catch {
      setDetails((d) => ({ ...d, [zip]: { loading: false, error: true } }));
    }
  };

  const toggle = (zip) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(zip)) next.delete(zip);
      else { next.add(zip); loadDetail(zip); }
      return next;
    });
  };

  const add = async () => {
    const zip = input.trim();
    setAddError("");
    if (!/^\d{5}$/.test(zip)) { setAddError("Enter a valid 5-digit ZIP code."); return; }
    if (zips?.some((z) => z.zip === zip)) { setAddError(`${zip} is already on your list.`); return; }
    setBusy(true);
    // Confirm the ZIP resolves to a tracked market before saving.
    let ok = false, place = null;
    try {
      const probe = await fetch(`/api/zip?zip=${zip}`).then((r) => r.json());
      ok = !!(probe && probe.found);
      place = probe?.place || null;
    } catch { ok = false; }
    if (!ok) {
      setBusy(false);
      setAddError(`No rental data is tracked for ${zip} yet.`);
      return;
    }
    const position = zips?.length || 0;
    const next = [...(zips || []), { zip, position }];
    setZips(next);
    if (place) setPlaces((p) => ({ ...p, [zip]: place }));
    setInput("");
    setBusy(false);
    if (userId) await supabase.from("user_zip_codes").upsert({ user_id: userId, zip, position });
    setOpen((prev) => new Set(prev).add(zip));
    loadDetail(zip);
  };

  const remove = async (zip) => {
    setZips((prev) => (prev || []).filter((z) => z.zip !== zip));
    setOpen((prev) => { const n = new Set(prev); n.delete(zip); return n; });
    if (userId) await supabase.from("user_zip_codes").delete().eq("user_id", userId).eq("zip", zip);
  };

  const onKey = (e) => { if (e.key === "Enter") add(); };

  return (
    <section className="relative mt-6 overflow-hidden rounded-2xl border border-signal/30 bg-gradient-to-br from-signal/[0.07] via-bg2/40 to-bg/20 p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker mb-2 flex items-center gap-2"><MapPin size={12} className="text-signal" /> My Zip Codes</p>
          <h2 className="headline text-2xl text-ink">Markets you&apos;re watching</h2>
          <p className="mt-1 text-sm text-muted">Track the exact ZIPs you care about. Add as many as you like — select any one to reveal its full read.</p>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value.replace(/[^\d]/g, "").slice(0, 5)); setAddError(""); }}
              onKeyDown={onKey}
              inputMode="numeric"
              placeholder="Add a ZIP…"
              className="mono w-32 rounded-md border border-[var(--line-strong)] bg-bg2 px-3 py-2.5 text-[13px] tracking-[0.06em] text-ink placeholder:text-muted focus:border-signal/60 focus:outline-none"
            />
            <button
              onClick={add}
              disabled={busy}
              className="mono flex items-center gap-2 rounded-md border border-signal/40 bg-signal/10 px-4 py-2.5 text-[12px] tracking-[0.04em] text-signal hover:bg-signal/20 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </button>
          </div>
          {addError && <p className="mono mt-1.5 text-[11px] text-down">{addError}</p>}
        </div>
      </div>

      <div className="mt-6">
        {zips === null ? (
          <p className="mono text-[12px] text-muted">Loading your ZIP codes…</p>
        ) : zips.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--line-strong)] p-8 text-center">
            <p className="text-sm text-muted">No ZIP codes yet. Type a 5-digit ZIP above and hit <span className="text-signal">Add</span> — your list loads here automatically every time you sign in.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--line)]">
            {zips.map(({ zip }) => {
              const isOpen = open.has(zip);
              const d = details[zip];
              return (
                <div key={zip} className="border-b border-[var(--line)] last:border-b-0 bg-bg2">
                  {/* Row header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => toggle(zip)} className="flex flex-1 items-center gap-3 text-left">
                      <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      <span className="mono text-[15px] tracking-[0.06em] text-ink">{zip}</span>
                      {places[zip] && <span className="text-[13px] text-muted">{places[zip]}</span>}
                      {d?.rent?.grain && (
                        <span className="mono rounded-sm border border-signal/30 bg-signal/10 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-signal">
                          {GRAIN_LABEL[d.rent.grain] || d.rent.grain.toUpperCase()}
                        </span>
                      )}
                      {d?.rent && (
                        <span className="ml-auto hidden items-baseline gap-2 sm:flex">
                          <span className="mono text-[13px] text-ink">{usd(d.rent.rent)}</span>
                          {d.rent.yoyPct != null && (
                            <span className="mono text-[11px]" style={{ color: toneColor(d.rent.yoyPct >= 0 ? "bull" : "bear") }}>{pct(d.rent.yoyPct)}</span>
                          )}
                        </span>
                      )}
                    </button>
                    <button onClick={() => remove(zip)} className="shrink-0 text-muted transition-colors hover:text-down" aria-label={`Remove ${zip}`}>
                      <X size={15} />
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-[var(--line)] bg-bg/40 px-4 py-5">
                      {!d || d.loading ? (
                        <p className="mono flex items-center gap-2 text-[12px] text-muted"><Loader2 size={13} className="animate-spin" /> Pulling the read for {zip}…</p>
                      ) : d.error ? (
                        <p className="mono text-[12px] text-down">Couldn&apos;t load data for {zip}. Try again shortly.</p>
                      ) : (
                        <ZipDetail zip={zip} rent={d.rent} demo={d.demo} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {zips && zips.length > 0 && (
          <p className="mt-3 text-[12px] text-muted">Want the full series? Open the <Link href="/indicators" className="text-signal hover:underline">Indicators</Link> or <Link href="/market-maps" className="text-signal hover:underline">Market Maps</Link> tab.</p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-bg2 p-3">
      <p className="mono text-[9px] tracking-[0.12em] text-muted">{label}</p>
      <p className="mono mt-1 text-[15px] text-ink">{value}</p>
      {sub && <p className="mono mt-0.5 text-[9px] text-muted">{sub}</p>}
    </div>
  );
}

function ZipDetail({ zip, rent, demo }) {
  const up = rent && rent.yoyPct != null && rent.yoyPct >= 0;
  return (
    <div className="space-y-5">
      {/* Rent / ZORI block */}
      {rent ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono text-[9px] tracking-[0.12em] text-muted">
              ZILLOW OBSERVED RENT · {rent.place || rent.label}
              {rent.rolledUp ? ` · via ${rent.label}` : ""}
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="mono text-3xl text-ink">{usd(rent.rent)}</span>
              {rent.yoyPct != null && (
                <span className="mono text-sm" style={{ color: toneColor(up ? "bull" : "bear") }}>{pct(rent.yoyPct)} YoY</span>
              )}
            </div>
            {rent.asOf && <p className="mono mt-1 text-[9px] text-muted">as of {rent.asOf}</p>}
          </div>
          {Array.isArray(rent.trend) && rent.trend.length > 1 && (
            <Sparkline series={rent.trend} color={toneColor(up ? "bull" : "bear")} w={150} h={44} />
          )}
        </div>
      ) : (
        <p className="mono text-[12px] text-muted">No Zillow rent series tracked for {zip} yet.</p>
      )}

      {/* Demographics block */}
      {demo ? (
        <div>
          <p className="mono mb-2 text-[9px] tracking-[0.12em] text-muted">{demo.source} · occupied stock · as of {demo.asOf}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="MEDIAN CONTRACT RENT" value={usd(demo.medianContractRent)} sub="excl. utilities" />
            <Stat label="TENANT-PAID UTILITIES" value={demo.utilityLoad == null ? "—" : usd(Math.round(demo.utilityLoad))} sub="gross − contract" />
            <Stat label="MEDIAN HH INCOME" value={usd(demo.medianIncome)} sub="ACS B19013" />
            <Stat label="RENT BURDEN" value={pctPlain(demo.rentBurden)} sub="gross rent ÷ income" />
            <Stat label="RENTER SHARE" value={pctPlain(demo.renterShare)} />
            <Stat label="MF STOCK (5+ UNITS)" value={pctPlain(demo.mfStockShare)} />
            <Stat label="MEDIAN HOME VALUE" value={usd(demo.medianHomeValue)} />
            <Stat label="OCCUPIED UNITS" value={demo.occupiedUnits == null ? "—" : demo.occupiedUnits.toLocaleString("en-US")} />
          </div>
        </div>
      ) : (
        <p className="mono text-[11px] text-muted">No Census demographic snapshot loaded for this ZIP.</p>
      )}
    </div>
  );
}
