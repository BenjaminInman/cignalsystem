"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import IndicatorRow from "@/components/IndicatorRow";
import { buildRows, GRAIN } from "@/lib/submarket-rows";

export default function SubmarketLookup({ onCount }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [msg, setMsg] = useState("");
  const [place, setPlace] = useState(null);
  const [rows, setRows] = useState(null);

  const search = async () => {
    const v = q.trim();
    if (!v) { setStatus("error"); setMsg("Enter a ZIP code or City, State."); return; }
    setStatus("loading"); setMsg(""); setPlace(null); setRows(null);
    const isZip = /^\d{5}$/.test(v);
    try {
      const [zr, sr] = await Promise.all([
        fetch(`/api/zip?q=${encodeURIComponent(v)}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
        isZip ? fetch(`/api/metro-signals?zip=${v}`).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
      ]);
      if (!zr.ok) { setStatus("error"); setMsg(zr.d?.error || "Lookup failed. Please try again."); return; }

      let signalRes = sr;
      if (!isZip && zr.d?.found && zr.d.code) {
        signalRes = await fetch(`/api/metro-signals?metro=${encodeURIComponent(zr.d.code)}`).then((r) => r.json()).catch(() => null);
      }

      const built = buildRows(v, signalRes?.found ? signalRes : null, zr.d?.found ? zr.d : null);
      if (!built.length) {
        setStatus("idle");
        setPlace(zr.d?.found ? zr.d : null);
        setRows([]);
        if (!zr.d?.found) setMsg("");
        return;
      }
      setPlace(zr.d?.found ? zr.d : null);
      setRows(built);
      onCount?.(built.length);
      setStatus("idle");
    } catch {
      setStatus("error"); setMsg("Lookup failed. Please try again.");
    }
  };

  return (
    <div className="mt-10">
      <div className="card p-6">
        <p className="kicker mb-2 flex items-center gap-2"><Search size={13} className="text-signal" /> Layer 1 · Submarket</p>
        <h2 className="headline text-2xl text-ink">Bring the read down to your market</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Enter a 5-digit ZIP or a City, State. The national indicators above, localized to the tightest
          geography we cover — each signal labeled with its grain.
        </p>
        <div className="mt-5 flex max-w-md gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="ZIP code or City, State"
            className="flex-1 rounded-md border border-[var(--line)] bg-bg2 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-signal/40"
          />
          <button
            onClick={search}
            disabled={status === "loading"}
            className="mono rounded-md bg-signal px-5 py-2.5 text-[12px] tracking-[0.08em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "loading" ? "…" : "SEARCH"}
          </button>
        </div>
        {status === "error" && <p className="mt-2 text-[12px] text-down">{msg}</p>}
        {rows && rows.length === 0 && (
          <p className="mt-4 text-sm text-muted">
            No local coverage for <span className="text-ink">{q.trim()}</span> yet — try a nearby ZIP or a larger city.
          </p>
        )}
      </div>

      {place && (
        <p className="mono mt-6 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.12em] text-muted">
          <span className="rounded bg-signal/15 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-signal">{GRAIN[place.grain] || "LOCAL"}</span>
          {place.label} · SUBMARKET SIGNALS
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-4 space-y-4">
          {rows.map((r) => <IndicatorRow key={r.name} row={r} />)}
        </div>
      )}
    </div>
  );
}
