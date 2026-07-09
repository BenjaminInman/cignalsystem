"use client";

import { useMemo, useState } from "react";
import { Mail, Download } from "lucide-react";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function AdminNewsletter({ subscribers = [], sends = [] }) {
  const [filter, setFilter] = useState("all");

  const counts = useMemo(() => {
    const active = subscribers.filter((s) => s.status === "active");
    return {
      total: subscribers.length,
      daily: active.filter((s) => s.frequency === "daily").length,
      weekly: active.filter((s) => s.frequency === "weekly").length,
      unsubscribed: subscribers.filter((s) => s.status === "unsubscribed").length,
    };
  }, [subscribers]);

  const rows = useMemo(() => {
    if (filter === "all") return subscribers;
    if (filter === "unsubscribed") return subscribers.filter((s) => s.status === "unsubscribed");
    return subscribers.filter((s) => s.status === "active" && s.frequency === filter);
  }, [subscribers, filter]);

  const exportCsv = () => {
    const head = "email,name,frequency,status,signed_up,last_sent\n";
    const body = rows
      .map((s) => [s.email, s.name || "", s.frequency, s.status, s.created_at || "", s.last_sent_at || ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cignal-newsletter-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lastSend = sends[0];

  return (
    <section className="card mt-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker mb-1 flex items-center gap-2"><Mail size={12} className="text-signal" /> Newsletter</p>
          <h2 className="headline text-xl text-ink">Industry Brief Subscribers</h2>
          <p className="mt-1 text-sm text-muted">
            {lastSend
              ? `Last send: ${lastSend.frequency} on ${fmtDate(lastSend.sent_at)} — ${lastSend.ok}/${lastSend.recipients} delivered.`
              : "No sends recorded yet."}
          </p>
        </div>
        <button onClick={exportCsv} disabled={!rows.length} className="mono inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-[11px] tracking-[0.12em] text-muted transition-colors hover:border-signal/40 hover:text-ink disabled:opacity-40">
          <Download size={13} /> EXPORT CSV
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total", counts.total, "all"],
          ["Daily", counts.daily, "daily"],
          ["Weekly", counts.weekly, "weekly"],
          ["Unsubscribed", counts.unsubscribed, "unsubscribed"],
        ].map(([label, n, key]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-xl border p-4 text-left transition-colors ${filter === key ? "border-signal/50 bg-signal/[0.06]" : "border-[var(--line)] bg-bg/40 hover:border-signal/30"}`}
          >
            <p className="mono text-[10px] tracking-[0.16em] text-muted">{label.toUpperCase()}</p>
            <p className={`mono mt-1 text-2xl ${filter === key ? "text-signal" : "text-ink"}`}>{n}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No subscribers in this view yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Email", "Name", "Frequency", "Status", "Signed up", "Last sent"].map((h) => (
                  <th key={h} className="mono whitespace-nowrap px-3 py-2 text-[10px] tracking-[0.14em] text-muted">{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.email} className="border-b border-[var(--line)]/60">
                  <td className="px-3 py-2.5 text-ink">{s.email}</td>
                  <td className="px-3 py-2.5 text-muted">{s.name || "—"}</td>
                  <td className="mono px-3 py-2.5 text-[12px] text-muted">{s.frequency}</td>
                  <td className="px-3 py-2.5">
                    <span className={`mono rounded-full px-2 py-0.5 text-[10px] tracking-[0.1em] ${s.status === "active" ? "bg-up/10 text-up" : "bg-muted/10 text-muted"}`}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{fmtDate(s.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{fmtDate(s.last_sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
