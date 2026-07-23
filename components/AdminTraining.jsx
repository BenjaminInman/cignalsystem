"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Download, ChevronDown, ChevronRight } from "lucide-react";
import { audienceOptions, matchesAudience, audienceLabel } from "@/lib/audience";

const STATUSES = ["new", "contacted", "enrolled", "archived"];
const STATUS_STYLE = {
  new: "bg-signal/10 text-signal",
  contacted: "bg-[#5FA8D9]/10 text-[#5FA8D9]",
  enrolled: "bg-up/10 text-up",
  archived: "bg-muted/10 text-muted",
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function AdminTraining({ initialApps = [] }) {
  const [apps, setApps] = useState(initialApps);
  const [filter, setFilter] = useState("all");
  const [aud, setAud] = useState("all");
  const [open, setOpen] = useState(null);

  const audOpts = useMemo(() => audienceOptions(apps, "vertical"), [apps]);

  // Scope status counts to the selected audience — otherwise the tallies
  // describe a different set of rows than the list underneath them.
  const inAudience = useMemo(
    () => apps.filter((a) => matchesAudience(a, "vertical", aud)),
    [apps, aud]
  );

  const counts = useMemo(() => {
    const c = { all: inAudience.length };
    for (const st of STATUSES) c[st] = inAudience.filter((a) => a.status === st).length;
    return c;
  }, [inAudience]);

  const rows = filter === "all" ? inAudience : inAudience.filter((a) => a.status === filter);

  const setStatus = async (id, status) => {
    setApps((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await fetch("/api/training/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    } catch { /* optimistic; a refresh will reconcile */ }
  };

  const exportCsv = () => {
    const head = "created,name,email,company,phone,role,portfolio,goals,status,audience\n";
    const body = rows
      .map((a) => [a.created_at, a.name, a.email, a.company, a.phone, a.role, a.portfolio, a.goals, a.status, audienceLabel(a.vertical)].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const el = document.createElement("a");
    el.href = url; el.download = `cignal-training-${aud}-${filter}.csv`; el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card mt-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker mb-1 flex items-center gap-2"><GraduationCap size={13} className="text-signal" /> Econiq</p>
          <h2 className="headline text-xl text-ink">Training Applications</h2>
          <p className="mt-1 text-sm text-muted">Applications from the About page. Update status as you work each one.</p>
        </div>
        <button onClick={exportCsv} disabled={!rows.length} className="mono inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-[11px] tracking-[0.12em] text-muted transition-colors hover:border-signal/40 hover:text-ink disabled:opacity-40">
          <Download size={13} /> EXPORT CSV
        </button>
      </div>

      {audOpts.length > 1 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="kicker mr-1 text-muted">Audience</span>
          {audOpts.map((o) => (
            <button
              key={o.value}
              onClick={() => setAud(o.value)}
              className={`mono rounded-full border px-3 py-1.5 text-[11px] tracking-[0.1em] transition-colors ${aud === o.value ? "border-signal/50 bg-signal/[0.06] text-signal" : "border-[var(--line)] text-muted hover:border-signal/30"}`}
            >
              {o.label.toUpperCase()} <span className="text-muted">·{o.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {["all", ...STATUSES].map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`mono rounded-full border px-3 py-1.5 text-[11px] tracking-[0.1em] transition-colors ${filter === k ? "border-signal/50 bg-signal/[0.06] text-signal" : "border-[var(--line)] text-muted hover:border-signal/30"}`}>
            {k.toUpperCase()} <span className="text-muted">·{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No applications in this view yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => {
              const isOpen = open === a.id;
              return (
                <div key={a.id} className="rounded-xl border border-[var(--line)] bg-bg/40">
                  <button onClick={() => setOpen(isOpen ? null : a.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    {isOpen ? <ChevronDown size={15} className="shrink-0 text-muted" /> : <ChevronRight size={15} className="shrink-0 text-muted" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{a.name}{a.company ? <span className="text-muted"> · {a.company}</span> : null}</p>
                      <p className="mono truncate text-[11px] text-muted">{a.email}{a.role ? ` · ${a.role}` : ""}</p>
                    </div>
                    <span className={`mono hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] tracking-[0.1em] sm:inline ${STATUS_STYLE[a.status] || ""}`}>{(a.status || "new").toUpperCase()}</span>
                    <span className="mono shrink-0 text-[11px] text-muted">{fmt(a.created_at)}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[var(--line)] px-4 py-4">
                      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        {[["Phone", a.phone], ["Role", a.role], ["Portfolio / markets", a.portfolio]].map(([k, v]) => (
                          <div key={k}><dt className="mono text-[10px] tracking-[0.14em] text-muted">{k.toUpperCase()}</dt><dd className="mt-0.5 text-ink">{v || "—"}</dd></div>
                        ))}
                        <div className="sm:col-span-2"><dt className="mono text-[10px] tracking-[0.14em] text-muted">GOALS</dt><dd className="mt-0.5 leading-relaxed text-ink">{a.goals || "—"}</dd></div>
                      </dl>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <a href={`mailto:${a.email}`} className="mono rounded-full border border-signal/40 px-3 py-1.5 text-[11px] tracking-[0.1em] text-signal hover:bg-signal/[0.08]">EMAIL APPLICANT</a>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUSES.map((st) => (
                            <button key={st} onClick={() => setStatus(a.id, st)} className={`mono rounded-full px-2.5 py-1 text-[10px] tracking-[0.08em] transition-colors ${a.status === st ? STATUS_STYLE[st] : "border border-[var(--line)] text-muted hover:text-ink"}`}>
                              {st.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
