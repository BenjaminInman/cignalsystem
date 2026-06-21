"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Lock, Plus, X } from "lucide-react";
import { useContent } from "@/components/VerticalProvider";
import { createClient } from "@/lib/supabase/client";
import { SLUG_BY_NAME } from "@/lib/indicator-slugs";

const SERIES_COLORS = ["#F5B544", "#5FB97C", "#6FA8DC", "#E5634D", "#B68FD6"];
const CHART_TYPES = ["Line", "Area", "Bar"];
const SCALE_MODES = [
  { key: "native", label: "Native units" },
  { key: "indexed", label: "Indexed to 100" },
];
const ALL_RANGES = [10, 20, 40];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const yrLab = (ts) => String(new Date(ts).getUTCFullYear());
const monLab = (ts) => { const d = new Date(ts); return `${MON[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`; };

const GROUP_AXIS = { pct: "%", count: "K", days: "days", index: "index" };

function fmtValue(line, v, scale) {
  if (v == null || !Number.isFinite(v)) return "—";
  if (scale === "indexed") return v.toFixed(1);
  const s = v.toFixed(line.round ?? 1);
  if (line.group === "pct") return (line.unit || "").includes("pp") ? `${s}pp` : `${s}%`;
  if (line.group === "count") return `${s}K`;
  if (line.group === "days") return `${s}d`;
  return s;
}

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const rawStep = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = niceNorm * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/* ---------- chart ---------- */
function CompareChart({ lines, scale, chartType, yLabel }) {
  const [hoverX, setHoverX] = useState(null);
  const wrapRef = useRef(null);
  const W = 940, H = 380, padL = 54, padR = 16, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const drawn = lines.filter((l) => l.data.length > 0);
  const bounds = useMemo(() => {
    let tMin = Infinity, tMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    drawn.forEach((l) => l.data.forEach((p) => {
      if (p.t < tMin) tMin = p.t; if (p.t > tMax) tMax = p.t;
      if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
    }));
    if (scale === "indexed") { yMin = Math.min(yMin, 100); yMax = Math.max(yMax, 100); }
    const pad = (yMax - yMin) * 0.08 || 1;
    return { tMin, tMax, yMin: yMin - pad, yMax: yMax + pad };
  }, [drawn, scale]);

  if (!drawn.length) {
    return <div className="mono flex h-[300px] items-center justify-center text-[12px] text-muted">No data for this selection yet.</div>;
  }

  const { tMin, tMax, yMin, yMax } = bounds;
  const xAt = (t) => padL + ((t - tMin) / (tMax - tMin || 1)) * innerW;
  const yAt = (v) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;
  const yticks = niceTicks(yMin, yMax, 4);
  const baseline = scale === "indexed" ? 100 : (yMin < 0 && yMax > 0 ? 0 : null);

  const y0 = new Date(tMin).getUTCFullYear(), y1 = new Date(tMax).getUTCFullYear();
  const yearSpan = y1 - y0;
  const xStep = yearSpan > 24 ? 5 : yearSpan > 12 ? 2 : 1;
  const xLabels = [];
  for (let y = Math.ceil(y0 / xStep) * xStep; y <= y1; y += xStep) xLabels.push(Date.UTC(y, 0, 1));

  const allTimes = Array.from(new Set(drawn.flatMap((l) => l.data.map((p) => p.t)))).sort((a, b) => a - b);
  let hoverT = null;
  if (hoverX != null && allTimes.length) {
    const t = tMin + ((hoverX - padL) / innerW) * (tMax - tMin);
    hoverT = allTimes.reduce((best, cur) => (Math.abs(cur - t) < Math.abs(best - t) ? cur : best), allTimes[0]);
  }
  const valAt = (data, t) => { const hit = data.find((p) => p.t === t); return hit ? hit.y : null; };
  const onMove = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    setHoverX(Math.max(padL, Math.min(W - padR, x)));
  };

  return (
    <div>
      <div className="mb-2 mono text-[10px] tracking-[0.16em] text-muted">{yLabel}</div>
      <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHoverX(null)} style={{ width: "100%" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
          {yticks.map((v) => (
            <g key={v}>
              <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
              <text x={padL - 8} y={yAt(v) + 3} textAnchor="end" fontSize="10" fill="#797E85" fontFamily="'IBM Plex Mono', monospace">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
            </g>
          ))}
          {baseline != null && baseline >= yMin && baseline <= yMax && (
            <line x1={padL} y1={yAt(baseline)} x2={W - padR} y2={yAt(baseline)} stroke="#797E85" strokeOpacity="0.5" strokeWidth="1" />
          )}
          {xLabels.map((t) => (
            <text key={t} x={xAt(t)} y={H - 10} textAnchor="middle" fontSize="10" fill="#797E85" fontFamily="'IBM Plex Mono', monospace">{yrLab(t)}</text>
          ))}

          {drawn.map((l) => {
            const px = l.data.map((p) => ({ x: +xAt(p.t).toFixed(1), y: +yAt(p.y).toFixed(1) }));
            if (chartType === "Bar") {
              const bw = Math.max(1, Math.min(6, (innerW / l.data.length) * 0.6 / drawn.length));
              const off = (drawn.indexOf(l) - (drawn.length - 1) / 2) * bw;
              const yb = baseline != null ? yAt(baseline) : H - padB;
              return <g key={l.slug}>{px.map((p, i) => (
                <rect key={i} x={p.x + off - bw / 2} y={Math.min(p.y, yb)} width={bw} height={Math.abs(p.y - yb)} fill={l.color} fillOpacity="0.75" />
              ))}</g>;
            }
            const path = smooth(px);
            return (
              <g key={l.slug}>
                {chartType === "Area" && (
                  <path d={`${path} L ${px[px.length - 1].x},${H - padB} L ${px[0].x},${H - padB} Z`} fill={l.color} fillOpacity="0.10" />
                )}
                <path d={path} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}

          {hoverT != null && (
            <g>
              <line x1={xAt(hoverT)} y1={padT} x2={xAt(hoverT)} y2={H - padB} stroke="#F5B544" strokeOpacity="0.35" strokeWidth="1" />
              {drawn.map((l) => { const v = valAt(l.data, hoverT); return v == null ? null : (
                <circle key={l.slug} cx={xAt(hoverT)} cy={yAt(v)} r="3.2" fill={l.color} stroke="#08090A" strokeWidth="1.5" />
              ); })}
            </g>
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--line)] pt-3">
        <span className="mono text-[11px] tracking-[0.06em] text-muted">{hoverT != null ? monLab(hoverT) : "Hover the chart"}</span>
        {drawn.map((l) => (
          <span key={l.slug} className="mono flex items-center gap-1.5 text-[11px]">
            <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />
            <span className="text-muted">{l.name}</span>
            <span className="text-ink">{hoverT != null ? fmtValue(l, valAt(l.data, hoverT), scale) : ""}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- tool ---------- */
export default function IndicatorCompare() {
  const { INDICATORS = [] } = useContent();
  const options = useMemo(
    () => INDICATORS.filter((i) => SLUG_BY_NAME[i.name]).map((i) => ({ name: i.name, slug: SLUG_BY_NAME[i.name], type: i.type, cat: i.cat })),
    [INDICATORS]
  );

  const [tier, setTier] = useState("free");
  const [selected, setSelected] = useState([]);
  const [years, setYears] = useState(10);
  const [chartType, setChartType] = useState("Line");
  const [scale, setScale] = useState("native");
  const [picker, setPicker] = useState(false);
  const [raw, setRaw] = useState({}); // slug -> { points, unit, group, round }
  const [loading, setLoading] = useState(false);

  const caps = tier === "pro" ? { maxSlugs: 5, years: ALL_RANGES } : { maxSlugs: 2, years: [10] };

  // default: Inflation vs Interest Rates (same unit, the pair that exposed the bug)
  useEffect(() => {
    if (!options.length || selected.length) return;
    const inflation = options.find((o) => o.slug === "cpi_headline");
    const rates = options.find((o) => o.slug === "fed_funds");
    const fallback = options.slice(0, 2);
    setSelected([inflation, rates].filter(Boolean).length === 2 ? [inflation, rates] : fallback);
  }, [options]); // eslint-disable-line

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) return;
      supabase.from("profiles").select("tier, is_admin").eq("id", u.id).single().then(({ data: p }) => {
        if (p?.is_admin || p?.tier === "pro") setTier("pro");
      });
    });
  }, []);

  useEffect(() => {
    setSelected((s) => s.slice(0, caps.maxSlugs));
    if (!caps.years.includes(years)) setYears(caps.years[caps.years.length - 1]);
  }, [tier]); // eslint-disable-line

  useEffect(() => {
    if (!selected.length) { setRaw({}); return; }
    let on = true;
    setLoading(true);
    const slugs = selected.map((s) => s.slug).join(",");
    fetch(`/api/compare?slugs=${slugs}&years=${years}`)
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        if (d?.tier && d.tier !== tier) setTier(d.tier);
        const map = {};
        (d?.series || []).forEach((s) => { map[s.slug] = { points: s.points || [], unit: s.unit, group: s.group, round: s.round }; });
        setRaw(map);
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [selected, years]); // eslint-disable-line

  // Indexed is only meaningful when every selected series stays strictly positive.
  const canIndex = selected.length > 0 && selected.every((s) => {
    const pts = raw[s.slug]?.points || [];
    return pts.length > 0 && pts.every((p) => p.v > 0);
  });
  const effScale = scale === "indexed" && canIndex ? "indexed" : "native";

  const groups = Array.from(new Set(selected.map((s) => raw[s.slug]?.group).filter(Boolean)));
  const mixedUnits = effScale === "native" && groups.length > 1;
  const yLabel = effScale === "indexed"
    ? "Index · 100 = window start"
    : groups.length === 1 ? (GROUP_AXIS[groups[0]] || "value") : "native units (mixed)";

  const lines = selected.map((s, i) => {
    const meta = raw[s.slug] || {};
    let data = (meta.points || []).map((p) => ({ t: Date.parse(`${p.d}T00:00:00Z`), y: p.v })).filter((p) => Number.isFinite(p.t));
    if (effScale === "indexed" && data.length) {
      const base = data.find((p) => p.y > 0)?.y;
      if (base) data = data.map((p) => ({ t: p.t, y: (p.y / base) * 100 }));
    }
    return { slug: s.slug, name: s.name, color: SERIES_COLORS[i], group: meta.group, unit: meta.unit, round: meta.round, data };
  });

  const atCap = selected.length >= caps.maxSlugs;
  const isSel = (slug) => selected.some((s) => s.slug === slug);
  const add = (o) => { if (!isSel(o.slug) && !atCap) setSelected((s) => [...s, o]); };
  const remove = (slug) => setSelected((s) => s.filter((x) => x.slug !== slug));

  const seg = (active) =>
    `mono rounded px-3 py-1.5 text-[12px] tracking-[0.04em] transition-colors ${active ? "bg-signal/15 text-signal" : "text-muted hover:text-ink"}`;

  return (
    <section className="relative mt-14 overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-bg2/70 via-bg2/30 to-bg/10 px-6 py-8 md:px-10">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 400" aria-hidden="true">
        <defs>
          <radialGradient id="compareGlow" cx="85%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="400" fill="url(#compareGlow)" />
        <path d="M0,92 C150,60 250,124 400,88 C550,54 650,122 800,82 C950,46 1050,112 1200,76" fill="none" stroke="#F5B544" strokeOpacity="0.10" strokeWidth="2" />
        <g fill="#F5B544" fillOpacity="0.32">
          <circle cx="400" cy="88" r="3" />
          <circle cx="800" cy="82" r="3" />
          <circle cx="1200" cy="76" r="3" />
        </g>
      </svg>
      <div className="relative">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-signal/60" />
        <h2 className="mono text-[12px] tracking-[0.2em] text-signal">INDICATOR COMPARISON</h2>
        {tier !== "pro" && <span className="mono text-[10px] tracking-[0.14em] text-muted">FREE · 2 SERIES · 10Y</span>}
      </div>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Overlay indicators to read how leading series move ahead of trailing ones across the cycle. Each line is shown the
        same way it appears on the tab above — rates as rates, inflation and rent as year-over-year. Use Indexed to compare
        shape when units differ.
      </p>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          {selected.map((s, i) => (
            <span key={s.slug} className="mono inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px]"
              style={{ borderColor: `${SERIES_COLORS[i]}66`, color: "#ECEDEF" }}>
              <span className="h-2 w-2 rounded-sm" style={{ background: SERIES_COLORS[i] }} />
              {s.name}
              {raw[s.slug]?.unit && <span className="text-[10px] text-muted">{raw[s.slug].unit}</span>}
              <button onClick={() => remove(s.slug)} className="text-muted hover:text-ink"><X size={12} /></button>
            </span>
          ))}
          <div className="relative">
            <button onClick={() => setPicker((p) => !p)} disabled={atCap}
              className={`mono inline-flex items-center gap-1.5 rounded-md border border-[var(--line-strong)] px-3 py-1.5 text-[12px] tracking-[0.04em] ${atCap ? "cursor-not-allowed text-muted/50" : "text-muted hover:text-ink"}`}>
              <Plus size={12} /> Add indicator
            </button>
            {picker && !atCap && (
              <div className="absolute left-0 top-full z-30 mt-2 max-h-72 w-72 overflow-y-auto rounded-lg border border-[var(--line-strong)] bg-bg2 p-1.5 shadow-2xl shadow-black/50">
                {options.map((o) => (
                  <button key={o.slug} disabled={isSel(o.slug)} onClick={() => { add(o); setPicker(false); }}
                    className={`mono flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] ${isSel(o.slug) ? "text-muted/40" : "text-muted hover:bg-white/[0.04] hover:text-ink"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${o.type === "LEADING" ? "bg-up" : "bg-[#6FA8DC]"}`} />
                    <span className="flex-1">{o.name}</span>
                    <span className="text-[9px] tracking-[0.1em] text-muted/60">{o.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {atCap && tier !== "pro" && (
            <a href="/upgrade?page=indicators" className="mono inline-flex items-center gap-1.5 rounded-md bg-signal/15 px-3 py-1.5 text-[11px] tracking-[0.06em] text-signal hover:bg-signal/25">
              <Lock size={11} /> Add up to 5 with Pro
            </a>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--line)] pt-4">
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] tracking-[0.16em] text-muted">RANGE</span>
            <div className="inline-flex rounded-md border border-[var(--line)] p-1">
              {ALL_RANGES.map((y) => {
                const allowed = caps.years.includes(y);
                return (
                  <button key={y} disabled={!allowed} onClick={() => allowed && setYears(y)}
                    className={`${seg(years === y)} ${!allowed ? "cursor-not-allowed opacity-40" : ""} inline-flex items-center gap-1`}>
                    {y}Y {!allowed && <Lock size={10} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] tracking-[0.16em] text-muted">SCALE</span>
            <div className="inline-flex rounded-md border border-[var(--line)] p-1">
              {SCALE_MODES.map((m) => (
                <button key={m.key} onClick={() => setScale(m.key)} className={seg(scale === m.key)}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] tracking-[0.16em] text-muted">CHART</span>
            <div className="inline-flex rounded-md border border-[var(--line)] p-1">
              {CHART_TYPES.map((t) => (
                <button key={t} onClick={() => setChartType(t)} className={seg(chartType === t)}>{t}</button>
              ))}
            </div>
          </div>
          {loading && <span className="mono animate-pulse text-[11px] text-muted">loading…</span>}
        </div>

        {scale === "indexed" && !canIndex && (
          <p className="mono mt-3 text-[11px] text-muted/80">Indexed view needs strictly positive series — a selection crosses zero, so native units are shown.</p>
        )}
        {mixedUnits && (
          <p className="mono mt-3 text-[11px] text-muted/80">These indicators use different units. Switch to Indexed to compare their shape on one scale.</p>
        )}

        <div className="mt-5">
          {selected.length === 0 ? (
            <div className="mono flex h-[300px] items-center justify-center text-[12px] text-muted">Add an indicator to begin.</div>
          ) : (
            <CompareChart lines={lines} scale={effScale} chartType={chartType} yLabel={yLabel} />
          )}
        </div>
      </div>

      {tier !== "pro" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-signal/30 bg-signal/[0.05] px-5 py-4">
          <p className="text-sm text-muted">
            <span className="text-ink">See the pattern, not just the moment.</span> Pro opens 20- and 40-year history and up to five layered indicators.
          </p>
          <a href="/upgrade?page=indicators" className="mono shrink-0 rounded-md bg-signal px-4 py-2 text-[12px] tracking-[0.06em] text-bg hover:brightness-110">
            Unlock full history →
          </a>
        </div>
      )}
      </div>
    </section>
  );
}
