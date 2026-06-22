"use client";

import { useMemo, useState } from "react";
import { Search, Users, Crown, ShieldCheck, Loader2, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STATUSES = ["active", "suspended", "cancelled"];

export default function AdminUsers({ initialUsers }) {
  const supabase = createClient();
  const [users, setUsers] = useState(initialUsers);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [showList, setShowList] = useState(false);

  const stats = useMemo(
    () => ({
      total: users.length,
      pro: users.filter((u) => u.tier === "pro").length,
      free: users.filter((u) => u.tier === "free").length,
      admins: users.filter((u) => u.is_admin).length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) =>
      [u.email, u.full_name, u.company]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(t))
    );
  }, [users, q]);

  async function patch(id, fields) {
    setError("");
    setSavingId(id);
    const prev = users;
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...fields } : u)));
    const { error } = await supabase.from("profiles").update(fields).eq("id", id);
    if (error) {
      setUsers(prev);
      setError(error.message || "Update failed — RLS may have rejected it.");
    }
    setSavingId(null);
  }

  return (
    <div className="pt-12 pb-16">
      <p className="kicker mb-3 flex items-center gap-2">
        <ShieldCheck size={12} className="text-signal" /> Admin · User management
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Subscribers</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Every account, tier, and status. Changes write straight to Supabase — and
        only because your session is flagged admin.
      </p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
        <Stat icon={Users} label="Total users" value={stats.total} />
        <Stat icon={Crown} label="Pro" value={stats.pro} accent />
        <Stat icon={Users} label="Free" value={stats.free} />
        <Stat icon={ShieldCheck} label="Admins" value={stats.admins} />
      </div>

      {/* Collapsible subscriber list */}
      <button
        type="button"
        onClick={() => setShowList((s) => !s)}
        aria-expanded={showList}
        aria-controls="admin-subscriber-list"
        className="mt-8 flex w-full items-center justify-between rounded-lg border border-[var(--line)] bg-bg2 px-5 py-3.5 text-left transition-colors hover:border-signal/40"
      >
        <span className="kicker flex items-center gap-2">
          <Users size={12} className="text-signal" /> All subscribers · {stats.total}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${
            showList ? "rotate-180 text-signal" : "text-muted"
          }`}
        />
      </button>

      {showList && (
        <div id="admin-subscriber-list">
          {/* Search */}
          <div className="relative mt-2 max-w-sm">
        <Search size={15} strokeWidth={1.8} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, company…"
          className="mono w-full rounded-md border border-[var(--line)] bg-bg2 py-2.5 pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-signal/70"
        />
      </div>

      {error && <p className="mono mt-4 text-[12px] text-down">{error}</p>}

      {/* Table */}
      <div className="card mt-6 overflow-hidden p-0">
        <div className="hidden grid-cols-[2fr_1fr_1.2fr_0.8fr_1fr] gap-4 border-b border-[var(--line)] px-5 py-3 md:grid">
          <Th>User</Th>
          <Th>Tier</Th>
          <Th>Status</Th>
          <Th>Role</Th>
          <Th>Joined</Th>
        </div>

        {filtered.length === 0 && (
          <p className="mono px-5 py-8 text-center text-[13px] text-muted">No users match.</p>
        )}

        {filtered.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-1 gap-3 border-b border-[var(--line)] px-5 py-4 last:border-0 md:grid-cols-[2fr_1fr_1.2fr_0.8fr_1fr] md:items-center md:gap-4"
          >
            {/* User */}
            <div className="min-w-0">
              <p className="truncate text-[14px] text-ink">{u.email}</p>
              <p className="mono truncate text-[11px] text-muted">
                {u.full_name || "—"}
                {u.company ? ` · ${u.company}` : ""}
              </p>
            </div>

            {/* Tier toggle */}
            <div>
              <button
                onClick={() => patch(u.id, { tier: u.tier === "pro" ? "free" : "pro" })}
                disabled={savingId === u.id}
                className={`mono inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] tracking-[0.06em] transition-all disabled:opacity-50 ${
                  u.tier === "pro"
                    ? "border-signal/40 bg-signal/15 text-signal hover:bg-signal/25"
                    : "border-[var(--line)] text-muted hover:text-ink"
                }`}
                title="Click to toggle tier"
              >
                {savingId === u.id ? <Loader2 size={11} className="animate-spin" /> : u.tier === "pro" && <Crown size={11} />}
                {u.tier}
              </button>
            </div>

            {/* Status select */}
            <div>
              <select
                value={u.status}
                onChange={(e) => patch(u.id, { status: e.target.value })}
                disabled={savingId === u.id}
                className={`mono rounded-md border bg-bg2 px-2.5 py-1.5 text-[11px] tracking-[0.04em] outline-none transition-colors focus:border-signal/70 disabled:opacity-50 ${
                  u.status === "active"
                    ? "border-up/30 text-up"
                    : u.status === "cancelled"
                    ? "border-down/30 text-down"
                    : "border-[var(--line)] text-muted"
                }`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-bg2 text-ink">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              {u.is_admin ? (
                <span className="mono inline-flex items-center gap-1 text-[11px] tracking-[0.06em] text-signal">
                  <ShieldCheck size={12} /> admin
                </span>
              ) : (
                <span className="mono text-[11px] tracking-[0.06em] text-muted">member</span>
              )}
            </div>

            {/* Joined */}
            <div className="mono text-[12px] text-muted">
              {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
            </div>
          </div>
        ))}
      </div>

      <p className="mono mt-4 text-[11px] tracking-[0.04em] text-muted">
        Tier and status write live to the <span className="text-ink">profiles</span> table.
        When billing is wired, Stripe will own the tier field instead.
      </p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-bg2 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className={accent ? "text-signal" : "text-muted"} strokeWidth={1.8} />
        <span className="kicker">{label}</span>
      </div>
      <p className={`headline text-3xl ${accent ? "text-signal" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Th({ children }) {
  return <span className="kicker">{children}</span>;
}
