"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, DollarSign, TrendingUp, Building2, Activity,
  ChevronDown, Trash2, Save, X, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContent, useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";

const CLASS_OPTIONS = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-"];

const ICONS = {
  "PROPERTIES": Building2,
  "TOTAL UNITS": Building2,
  "AVG OCCUPANCY": Activity,
  "ANNUAL NOI (RUN-RATE)": TrendingUp,
};

// ---------- helpers ----------
const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const fmtMoney = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "—"
    : `$${Math.round(Number(n)).toLocaleString()}`;
const fmtPct = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : `${Number(n)}%`;
const thisMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const monthLabel = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

// P&L flow. loss_to_lease is signed (negative = loss).
function derive(s) {
  const tri = num(s.total_rental_income);
  const ltl = num(s.loss_to_lease);
  const vac = num(s.vacancy_loss);
  const bd = num(s.bad_debt);
  const conc = num(s.concessions);
  const oi = num(s.other_income);
  const exp = num(s.total_expenses);
  const nri =
    tri === null ? null : tri + (ltl || 0) - (vac || 0) - (bd || 0) - (conc || 0);
  const ti = nri === null && oi === null ? null : (nri || 0) + (oi || 0);
  const noi = ti === null ? null : ti - (exp || 0);
  return { net_rental_income: nri, total_income: ti, noi };
}

const EMPTY_SNAP = {
  avg_rent_1bed: "", avg_rent_2bed: "", avg_rent_3bed: "", avg_rent_4bed: "",
  physical_occupancy: "",
  total_rental_income: "", loss_to_lease: "", vacancy_loss: "", bad_debt: "", concessions: "",
  net_rental_income: "", other_income: "", total_income: "", total_expenses: "", noi: "",
};
const EMPTY_PROP = { name: "", city: "", state: "", unit_count: "", class: "" };

// ---------- gate ----------
export default function PortfolioPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "portfolio"))
    return <ComingSoonInline vertical={vertical} title="Portfolio" />;
  return <PortfolioInner />;
}

function PortfolioInner() {
  const { COPY = {} } = useContent();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState(null);
  const [properties, setProperties] = useState(null); // null = loading
  const [latest, setLatest] = useState({});            // property_id -> latest snapshot row
  const [openId, setOpenId] = useState(null);          // expanded property id, or "new"

  // editor working state
  const [prop, setProp] = useState(EMPTY_PROP);
  const [month, setMonth] = useState(thisMonth());
  const [snaps, setSnaps] = useState([]);              // all snapshots for open property
  const [snap, setSnap] = useState(EMPTY_SNAP);
  const [override, setOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // initial load
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProperties([]); return; }
      setUserId(user.id);
      const { data: props } = await supabase
        .from("portfolio_properties")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      const list = props || [];
      setProperties(list);
      if (list.length) {
        const { data: rows } = await supabase
          .from("portfolio_snapshots")
          .select("*")
          .in("property_id", list.map((p) => p.id))
          .order("snapshot_month", { ascending: false });
        const byProp = {};
        for (const r of rows || []) if (!byProp[r.property_id]) byProp[r.property_id] = r;
        setLatest(byProp);
      }
    })();
  }, [supabase]);

  // ---------- derived portfolio stats ----------
  const stats = useMemo(() => {
    const list = properties || [];
    const units = list.reduce((a, p) => a + (p.unit_count || 0), 0);
    let occW = 0, occU = 0, annualNoi = 0;
    for (const p of list) {
      const s = latest[p.id];
      if (!s) continue;
      if (s.physical_occupancy != null && p.unit_count) {
        occW += Number(s.physical_occupancy) * p.unit_count;
        occU += p.unit_count;
      }
      if (s.noi != null) annualNoi += Number(s.noi) * 12;
    }
    return [
      { label: "PROPERTIES", value: String(list.length), color: "#ECEDEF" },
      { label: "TOTAL UNITS", value: units.toLocaleString(), color: "#ECEDEF" },
      { label: "AVG OCCUPANCY", value: occU ? `${(occW / occU).toFixed(1)}%` : "—", color: "#5FB97C" },
      { label: "ANNUAL NOI (RUN-RATE)", value: annualNoi ? fmtMoney(annualNoi) : "—", color: "#F5B544" },
    ];
  }, [properties, latest]);

  const chartAssets = useMemo(
    () => (properties || [])
      .map((p) => ({ name: p.name, noi: Number(latest[p.id]?.noi) || 0 }))
      .filter((a) => a.noi > 0),
    [properties, latest]
  );

  // ---------- editor open / close ----------
  async function openProperty(p) {
    if (openId === p.id) { setOpenId(null); return; }
    setErr(""); setOverride(false);
    setOpenId(p.id);
    setProp({
      name: p.name || "", city: p.city || "", state: p.state || "",
      unit_count: p.unit_count ?? "", class: p.class || "",
    });
    const { data: rows } = await supabase
      .from("portfolio_snapshots").select("*")
      .eq("property_id", p.id)
      .order("snapshot_month", { ascending: false });
    const list = rows || [];
    setSnaps(list);
    const m = list[0]?.snapshot_month?.slice(0, 7) || thisMonth();
    loadMonth(m, list);
  }

  function openNew() {
    setErr(""); setOverride(false);
    setOpenId("new");
    setProp(EMPTY_PROP);
    setSnaps([]);
    setMonth(thisMonth());
    setSnap(EMPTY_SNAP);
  }

  function loadMonth(ym, list = snaps) {
    setMonth(ym);
    const row = list.find((r) => r.snapshot_month?.slice(0, 7) === ym);
    if (!row) { setSnap(EMPTY_SNAP); return; }
    const next = {};
    for (const k of Object.keys(EMPTY_SNAP)) next[k] = row[k] ?? "";
    setSnap(next);
  }

  // ---------- save ----------
  async function save() {
    setErr("");
    if (!prop.name.trim()) { setErr("Property name is required."); return; }
    setSaving(true);
    try {
      let propertyId = openId;

      // upsert property
      const propPayload = {
        user_id: userId,
        name: prop.name.trim(),
        city: prop.city.trim() || null,
        state: prop.state.trim() || null,
        unit_count: num(prop.unit_count),
        class: prop.class || null,
        updated_at: new Date().toISOString(),
      };
      if (openId === "new") {
        const { data, error } = await supabase
          .from("portfolio_properties").insert(propPayload).select("*").single();
        if (error) throw error;
        propertyId = data.id;
        setProperties((cur) => [...(cur || []), data]);
      } else {
        const { data, error } = await supabase
          .from("portfolio_properties").update(propPayload).eq("id", openId).select("*").single();
        if (error) throw error;
        setProperties((cur) => (cur || []).map((p) => (p.id === openId ? data : p)));
      }

      // upsert snapshot for the selected month
      const d = derive(snap);
      const snapPayload = {
        property_id: propertyId,
        user_id: userId,
        snapshot_month: `${month}-01`,
        avg_rent_1bed: num(snap.avg_rent_1bed),
        avg_rent_2bed: num(snap.avg_rent_2bed),
        avg_rent_3bed: num(snap.avg_rent_3bed),
        avg_rent_4bed: num(snap.avg_rent_4bed),
        physical_occupancy: num(snap.physical_occupancy),
        total_rental_income: num(snap.total_rental_income),
        loss_to_lease: num(snap.loss_to_lease),
        vacancy_loss: num(snap.vacancy_loss),
        bad_debt: num(snap.bad_debt),
        concessions: num(snap.concessions),
        other_income: num(snap.other_income),
        total_expenses: num(snap.total_expenses),
        net_rental_income: override ? num(snap.net_rental_income) : d.net_rental_income,
        total_income: override ? num(snap.total_income) : d.total_income,
        noi: override ? num(snap.noi) : d.noi,
        updated_at: new Date().toISOString(),
      };
      const { data: srow, error: serr } = await supabase
        .from("portfolio_snapshots")
        .upsert(snapPayload, { onConflict: "property_id,snapshot_month" })
        .select("*").single();
      if (serr) throw serr;

      // refresh local snapshot caches
      setSnaps((cur) => {
        const rest = cur.filter((r) => r.snapshot_month?.slice(0, 7) !== month);
        return [srow, ...rest].sort((a, b) => (a.snapshot_month < b.snapshot_month ? 1 : -1));
      });
      setLatest((cur) => {
        const existing = cur[propertyId];
        if (!existing || existing.snapshot_month <= srow.snapshot_month)
          return { ...cur, [propertyId]: srow };
        return cur;
      });
      if (openId === "new") setOpenId(propertyId);
    } catch (e) {
      setErr(e.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this property and all its monthly history? This can't be undone.")) return;
    await supabase.from("portfolio_properties").delete().eq("id", id);
    setProperties((cur) => (cur || []).filter((p) => p.id !== id));
    setLatest((cur) => { const n = { ...cur }; delete n[id]; return n; });
    if (openId === id) setOpenId(null);
  }

  const deriveLive = derive(snap);

  // ---------- render ----------
  return (
    <div className="pt-12 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="headline text-4xl text-ink md:text-5xl">Portfolio Tracker</h1>
          <p className="mt-3 max-w-2xl text-muted">
            {COPY.pfSubtitle || "Track your assets month over month and benchmark them against live market signals."}
          </p>
        </div>
        <button
          onClick={openNew}
          className="mono flex items-center gap-2 rounded-sm bg-signal px-4 py-2.5 text-[12px] tracking-[0.06em] text-bg hover:opacity-90"
        >
          <Plus size={14} /> Add Property
        </button>
      </div>

      {/* summary stats */}
      <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = ICONS[s.label] || Activity;
          return (
            <div key={s.label} className="bg-bg2 p-6">
              <p className="kicker mb-4 flex items-center gap-2"><Icon size={13} className="text-muted" /> {s.label}</p>
              <p className="headline text-3xl" style={{ color: s.color }}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* NOI chart */}
      {chartAssets.length > 0 && (
        <div className="card mt-8 p-6">
          <h2 className="mb-4 font-semibold text-ink">Latest Monthly NOI by Property</h2>
          <NoiChart assets={chartAssets} />
        </div>
      )}

      {/* loading / empty */}
      {properties === null && (
        <p className="mono mt-8 text-[12px] text-muted">Loading your portfolio…</p>
      )}
      {properties !== null && properties.length === 0 && openId !== "new" && (
        <div className="card mt-8 p-10 text-center">
          <Building2 size={28} className="mx-auto text-muted" />
          <p className="mt-3 text-sm text-muted">
            No properties yet. Use <button onClick={openNew} className="text-signal underline-offset-2 hover:underline">Add Property</button> to start tracking — each month you enter builds your portfolio&apos;s history against the cycle.
          </p>
        </div>
      )}

      {/* new-property editor */}
      {openId === "new" && (
        <div className="card mt-8 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">New Property</h3>
            <button onClick={() => setOpenId(null)} className="text-muted hover:text-ink"><X size={18} /></button>
          </div>
          <Editor
            prop={prop} setProp={setProp}
            snap={snap} setSnap={setSnap}
            month={month} loadMonth={loadMonth} snaps={snaps}
            override={override} setOverride={setOverride}
            deriveLive={deriveLive}
            saving={saving} err={err} onSave={save}
          />
        </div>
      )}

      {/* property list */}
      <div className="mt-8 space-y-4">
        {(properties || []).map((p) => {
          const s = latest[p.id] || {};
          const isOpen = openId === p.id;
          return (
            <div key={p.id} className="card overflow-hidden">
              <button
                onClick={() => openProperty(p)}
                className="flex w-full flex-col gap-4 p-6 text-left lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                    {p.class && <span className="mono rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-muted">{p.class}</span>}
                  </div>
                  <p className="mono mt-1 text-[12px] text-muted">
                    {[p.city, p.state].filter(Boolean).join(", ")}
                    {p.unit_count ? ` · ${p.unit_count} units` : ""}
                    {s.snapshot_month ? ` · as of ${monthLabel(s.snapshot_month.slice(0, 7))}` : " · no data yet"}
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                    <Col label="Occupancy" value={fmtPct(s.physical_occupancy)} color={s.physical_occupancy != null ? "#5FB97C" : undefined} />
                    <Col label="Total Income" value={fmtMoney(s.total_income)} />
                    <Col label="NOI" value={fmtMoney(s.noi)} color={s.noi != null ? "#F5B544" : undefined} />
                  </div>
                  <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--line)] p-6">
                  <div className="mb-5 flex items-center justify-end">
                    <button onClick={() => remove(p.id)} className="mono flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-down hover:opacity-80">
                      <Trash2 size={13} /> Delete property
                    </button>
                  </div>
                  <Editor
                    prop={prop} setProp={setProp}
                    snap={snap} setSnap={setSnap}
                    month={month} loadMonth={loadMonth} snaps={snaps}
                    override={override} setOverride={setOverride}
                    deriveLive={deriveLive}
                    saving={saving} err={err} onSave={save}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- editor ----------
function Editor({ prop, setProp, snap, setSnap, month, loadMonth, snaps, override, setOverride, deriveLive, saving, err, onSave }) {
  const sp = (k) => (e) => setProp({ ...prop, [k]: e.target.value });
  const ss = (k) => (e) => setSnap({ ...snap, [k]: e.target.value });
  const recorded = new Set((snaps || []).map((r) => r.snapshot_month?.slice(0, 7)));

  return (
    <div className="space-y-7">
      {/* month selector */}
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Reporting Month" wide>
          <input
            type="month" value={month} onChange={(e) => loadMonth(e.target.value)}
            className="input" max={thisMonth()}
          />
        </Field>
        {recorded.has(month)
          ? <span className="mono mb-2 text-[11px] text-up">● Editing recorded month</span>
          : <span className="mono mb-2 text-[11px] text-muted">○ New month — not yet recorded</span>}
      </div>

      {/* property block */}
      <Section title="Property">
        <Field label="Property Name" wide><input value={prop.name} onChange={sp("name")} className="input" placeholder="e.g. The Maddox" /></Field>
        <Field label="City"><input value={prop.city} onChange={sp("city")} className="input" /></Field>
        <Field label="State"><input value={prop.state} onChange={sp("state")} className="input" maxLength={2} placeholder="TN" /></Field>
        <Field label="Unit Count"><input type="number" value={prop.unit_count} onChange={sp("unit_count")} className="input" /></Field>
        <Field label="Class">
          <select value={prop.class} onChange={sp("class")} className="input">
            <option value="">—</option>
            {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </Section>

      {/* operational block */}
      <Section title="Operational" hint="Leave a bedroom type blank where N/A.">
        <Field label="Avg Rent · 1 Bed"><input type="number" value={snap.avg_rent_1bed} onChange={ss("avg_rent_1bed")} className="input" /></Field>
        <Field label="Avg Rent · 2 Bed"><input type="number" value={snap.avg_rent_2bed} onChange={ss("avg_rent_2bed")} className="input" /></Field>
        <Field label="Avg Rent · 3 Bed"><input type="number" value={snap.avg_rent_3bed} onChange={ss("avg_rent_3bed")} className="input" /></Field>
        <Field label="Avg Rent · 4 Bed"><input type="number" value={snap.avg_rent_4bed} onChange={ss("avg_rent_4bed")} className="input" /></Field>
        <Field label="Physical Occupancy (%)"><input type="number" value={snap.physical_occupancy} onChange={ss("physical_occupancy")} className="input" placeholder="94.5" /></Field>
      </Section>

      {/* financial block */}
      <Section
        title="Financial — Monthly P&L"
        hint="Net Rental Income, Total Income, and NOI are calculated automatically."
        action={
          <label className="mono flex cursor-pointer items-center gap-2 text-[11px] tracking-[0.04em] text-muted">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="accent-[#F5B544]" />
            Override calculated fields
          </label>
        }
      >
        <Field label="Total Rental Income"><input type="number" value={snap.total_rental_income} onChange={ss("total_rental_income")} className="input" /></Field>
        <Field label="Loss / Gain to Lease" hint="negative = loss"><input type="number" value={snap.loss_to_lease} onChange={ss("loss_to_lease")} className="input" /></Field>
        <Field label="Vacancy Loss"><input type="number" value={snap.vacancy_loss} onChange={ss("vacancy_loss")} className="input" /></Field>
        <Field label="Bad Debt"><input type="number" value={snap.bad_debt} onChange={ss("bad_debt")} className="input" /></Field>
        <Field label="Concessions"><input type="number" value={snap.concessions} onChange={ss("concessions")} className="input" /></Field>
        <Calc label="Net Rental Income" override={override} value={snap.net_rental_income} computed={deriveLive.net_rental_income} onChange={ss("net_rental_income")} />
        <Field label="Other Income"><input type="number" value={snap.other_income} onChange={ss("other_income")} className="input" /></Field>
        <Calc label="Total Income" override={override} value={snap.total_income} computed={deriveLive.total_income} onChange={ss("total_income")} />
        <Field label="Total Expenses"><input type="number" value={snap.total_expenses} onChange={ss("total_expenses")} className="input" /></Field>
        <Calc label="NOI" override={override} value={snap.noi} computed={deriveLive.noi} onChange={ss("noi")} accent />
      </Section>

      {err && <p className="mono text-[12px] text-down">{err}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={onSave} disabled={saving}
          className="mono flex items-center gap-2 rounded-sm bg-signal px-5 py-2.5 text-[12px] tracking-[0.06em] text-bg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save Month"}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--line-strong, #2a2d31);
          border-radius: 4px;
          padding: 0.55rem 0.7rem;
          font-family: "IBM Plex Mono", monospace;
          font-size: 13px;
          color: #eceeef;
          outline: none;
        }
        .input:focus { border-color: #F5B544; }
      `}</style>
    </div>
  );
}

function Section({ title, hint, action, children }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="kicker">{title}</p>
        {action}
      </div>
      {hint && <p className="mono mb-3 text-[11px] text-muted">{hint}</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, wide, children }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="mono mb-1.5 block text-[10px] tracking-[0.08em] text-muted">
        {label}{hint ? <span className="ml-1 text-[9px] normal-case opacity-70">({hint})</span> : null}
      </label>
      {children}
    </div>
  );
}

function Calc({ label, value, computed, override, onChange, accent }) {
  if (override) {
    return (
      <div>
        <label className="mono mb-1.5 block text-[10px] tracking-[0.08em] text-muted">{label} <span className="text-[9px] opacity-70">(manual)</span></label>
        <input type="number" value={value} onChange={onChange} className="input" />
        <style jsx>{`
          .input { width:100%; background:var(--bg); border:1px solid var(--line-strong,#2a2d31); border-radius:4px; padding:.55rem .7rem; font-family:"IBM Plex Mono",monospace; font-size:13px; color:#eceeef; outline:none; }
          .input:focus { border-color:#F5B544; }
        `}</style>
      </div>
    );
  }
  return (
    <div>
      <label className="mono mb-1.5 block text-[10px] tracking-[0.08em] text-muted">{label} <span className="text-[9px] opacity-70">(auto)</span></label>
      <div
        className="mono rounded px-2.5 py-2.5 text-[13px]"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed var(--line-strong,#2a2d31)",
          color: accent ? "#F5B544" : "#eceeef",
        }}
      >
        {fmtMoney(computed)}
      </div>
    </div>
  );
}

function Col({ label, value, color }) {
  return (
    <div>
      <p className="mono text-[10px] tracking-[0.1em] text-muted">{label}</p>
      <p className="mono mt-1 text-sm" style={{ color: color || "#eceeef" }}>{value}</p>
    </div>
  );
}

function NoiChart({ assets }) {
  const max = Math.max(...assets.map((a) => a.noi), 0.0001);
  const w = 1100, h = 230, pad = 30;
  const bw = (w - pad * 2) / Math.max(assets.length, 1);
  return (
    <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full">
      {assets.map((a, i) => {
        const x = pad + i * bw + bw * 0.2;
        const bwInner = bw * 0.6;
        const hgt = (a.noi / max) * (h - pad);
        return (
          <g key={a.name + i}>
            <rect x={x} y={h - hgt} width={bwInner} height={hgt} rx="4" fill="#F5B544" opacity="0.85" />
            <text x={x + bwInner / 2} y={h + 18} textAnchor="middle" fontSize="11" fill="#797e85" fontFamily="IBM Plex Mono">{a.name.split(" ")[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}
