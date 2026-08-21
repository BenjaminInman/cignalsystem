"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// Colour by MEANING, not raw direction. For a spread, widening (up) is the
// warning. For the yield curve (invert), flattening (down) is the warning. So
// "red" always means credit conditions deteriorating, whichever way the number
// moved.
function toneColor(d, invert) {
  const worse = invert ? d < -0.02 : d > 0.02;
  const better = invert ? d > 0.02 : d < -0.02;
  return worse ? "var(--down)" : better ? "var(--up)" : "var(--muted)";
}
function word(d, invert) {
  if (Math.abs(d) <= 0.02) return "flat";
  const up = d > 0;
  return invert ? (up ? "steepening" : "flattening") : up ? "widening" : "tightening";
}
const sign = (v) => (v > 0 ? "+" : "") + v.toFixed(2);

function Spark({ vals, color }) {
  if (!vals || vals.length < 2) return null;
  const w = 150, h = 34, pad = 3;
  const lo = Math.min(...vals), hi = Math.max(...vals), rng = hi - lo || 1;
  const pts = vals
    .map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (v - lo) / rng) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastX = pad + (w - 2 * pad);
  const lastY = pad + (1 - (vals[vals.length - 1] - lo) / rng) * (h - 2 * pad);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" opacity="0.9" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="2.5" fill={color} />
    </svg>
  );
}

const verdictStyle = {
  TIGHTENING: { color: "var(--down)", bg: "rgba(229,99,77,0.12)" },
  EASING: { color: "var(--up)", bg: "rgba(95,185,124,0.12)" },
  MIXED: { color: "var(--warn, #E0A13A)", bg: "rgba(224,161,58,0.12)" },
};

export default function CreditBackdrop() {
  const [open, setOpen] = useState(false); // collapsed by default
  const [data, setData] = useState(null);

  useEffect(() => {
    let on = true;
    fetch("/api/credit-backdrop")
      .then((r) => r.json())
      .then((d) => on && setData(d))
      .catch(() => on && setData({ items: [], verdict: null }));
    return () => {
      on = false;
    };
  }, []);

  const verdict = data?.verdict;
  const vs = verdict ? verdictStyle[verdict] : null;

  return (
    <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--line)] bg-bg2/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6"
      >
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-signal/40 bg-signal/[0.08]">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F5B544" strokeWidth="1.6">
            <path d="M3 17 L9 11 L13 15 L21 7" />
            <path d="M15 7 h6 v6" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="headline text-xl text-ink md:text-2xl">Capital Markets Backdrop</h2>
            {vs && (
              <span
                className="mono rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em]"
                style={{ color: vs.color, background: vs.bg }}
              >
                {verdict}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            The cost and availability of capital — credit spreads and the curve, read by direction.
          </p>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-signal transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--line)]">
          {!data ? (
            <p className="mono px-6 py-8 text-[11px] text-muted">Loading capital-markets data…</p>
          ) : data.items.length === 0 ? (
            <p className="mono px-6 py-8 text-[11px] text-muted">Backdrop unavailable.</p>
          ) : (
            <>
              {data.items.map((d) => {
                const c30 = toneColor(d.d30, d.invert);
                const c90 = toneColor(d.d90, d.invert);
                return (
                  <div
                    key={d.slug}
                    className="grid grid-cols-[1.5fr_84px_1fr] items-center gap-4 border-b border-[var(--line)] px-5 py-4 last:border-b-0 md:px-6"
                  >
                    <div>
                      <div className="text-[15px] font-semibold text-ink">{d.name}</div>
                      <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{d.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="mono text-[21px] text-ink">
                        {d.cur.toFixed(2)}
                        <span className="text-[12px] text-muted">pp</span>
                      </div>
                      <div className="mono mt-0.5 text-[10px] text-muted">as of {String(d.asof).slice(5)}</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="mono flex items-center gap-2 text-[11px]">
                        <span className="w-8 text-muted">30d</span>
                        <span style={{ color: c30 }}>
                          {sign(d.d30)} · {word(d.d30, d.invert)}
                        </span>
                      </span>
                      <span className="mono flex items-center gap-2 text-[11px]">
                        <span className="w-8 text-muted">90d</span>
                        <span style={{ color: c90 }}>
                          {sign(d.d90)} · {word(d.d90, d.invert)}
                        </span>
                      </span>
                      <Spark vals={d.spark} color={c90} />
                    </div>
                  </div>
                );
              })}
              <p className="px-5 py-4 text-[11.5px] leading-relaxed text-muted md:px-6">
                These lead the cost and availability of multifamily debt — widening spreads and a flattening
                curve mean acquisition and construction financing gets pricier and choosier before it shows in
                transaction volume. A leading read on <em>credit conditions</em>, not a recession timer.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
