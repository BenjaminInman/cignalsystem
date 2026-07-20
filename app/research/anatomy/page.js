"use client";

import React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import CanaryMark from "@/components/CanaryMark";
import { ANATOMY, ANATOMY_MORE, TYPE_LABEL } from "@/lib/anatomy";

const CLS_COLOR = { leading: "var(--up)", coincident: "var(--coin)", lagging: "var(--down)" };
const CLS_LABEL = { leading: "Leading", coincident: "Coincident", lagging: "Lagging" };

// The app palette doesn't define a coincident token; Anatomy needs a third
// cycle color between up-green and down-red. Gold reads as "in-between" here
// without colliding with the signal accent used for chrome.
const COIN = "#C9A84C";

function ClassDot({ cls, size = 8 }) {
  const c = cls === "coincident" ? COIN : CLS_COLOR[cls];
  return <span style={{ width: size, height: size, background: c, borderRadius: 2, display: "inline-block", flex: "0 0 auto" }} />;
}

function ClassChip({ cls }) {
  const c = cls === "coincident" ? COIN : CLS_COLOR[cls];
  return (
    <span className="mono inline-flex items-center gap-1.5 rounded px-2 py-1 text-[9px] tracking-[0.1em]" style={{ color: c }}>
      <ClassDot cls={cls} size={7} /> {CLS_LABEL[cls]?.toUpperCase()}
    </span>
  );
}

function TypeBadge({ type }) {
  const isBasket = type === "weighted_sum";
  const isFamily = type === "family";
  const color = isBasket ? "var(--signal)" : isFamily ? "#c98f6a" : "#8b93cf";
  const border = isBasket ? "rgba(245,181,68,.35)" : isFamily ? "rgba(201,143,106,.4)" : "rgba(139,147,207,.4)";
  return (
    <span
      className="mono rounded px-2 py-1 text-[8.5px] tracking-[0.1em]"
      style={{ color, border: `1px solid ${border}` }}
    >
      {TYPE_LABEL[type]?.toUpperCase()}
    </span>
  );
}

const fmtPct = (n) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);
const fmtLevel = (n) => (n == null ? "—" : `${n.toFixed(2)}%`);
const fmtVal = (n, fmt) => {
  if (n == null) return "—";
  if (fmt === "usd_mo") return `$${Math.round(n).toLocaleString()}/mo`;
  if (fmt === "usd") return `$${Math.round(n).toLocaleString()}`;
  return `${n}`;
};

function Card({ card }) {
  const isBasket = card.type === "weighted_sum";
  const isFamily = card.type === "family";
  const isContribution = card.type === "contribution";
  const stripColor = (cls) => (cls === "coincident" ? COIN : cls === "leading" ? "var(--up)" : "var(--down)");
  const maxContrib = Math.max(0.01, ...card.components.map((c) => Math.abs(c.contribution || 0)));

  return (
    <div className="card p-5 md:p-6">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink md:text-xl">{card.name}</h3>
          <p className="mono mt-1 text-[11px] text-muted">{card.formula}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <TypeBadge type={card.type} />
            <ClassChip cls={card.parentClass} />
          </div>
          {card.headline && (
            <div className="mono text-right text-[13px]">
              <span className="text-ink">{card.headline.yoyPct != null ? fmtPct(card.headline.yoyPct) : fmtLevel(card.headline.level)}</span>
              <span className="text-muted"> {card.headline.label || "headline"}</span>
            </div>
          )}
        </div>
      </div>

      {/* proportion strip — baskets only */}
      {isBasket && (
        <div className="mt-4 flex h-6 overflow-hidden rounded-md border border-[var(--line)]">
          {card.components.map((c) => (
            <div
              key={c.label}
              className="mono flex items-center justify-center text-[9px] font-semibold"
              style={{ width: `${c.weight}%`, background: stripColor(c.cls), color: "#0A0B0A", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden" }}
              title={`${c.label} · ${c.weight}%`}
            >
              {c.weight >= 10 ? `${c.label.split(",")[0]} ${Math.round(c.weight)}%` : ""}
            </div>
          ))}
        </div>
      )}

      {/* FAMILY — the same thing measured different ways, shown as gauge tiles */}
      {isFamily && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {card.components.map((c) => (
            <div key={c.label} className="rounded-lg border border-[var(--line)] bg-bg p-3">
              <div className="flex items-center gap-1.5">
                <ClassDot cls={c.cls} size={7} />
                <p className="mono text-[9px] uppercase tracking-[0.06em] text-muted">{c.label}</p>
              </div>
              <p className="mt-1.5 text-xl font-semibold" style={{ color: c.yoyPct != null ? "var(--ink)" : "var(--muted)" }}>
                {c.yoyPct != null ? fmtPct(c.yoyPct) : "—"}
              </p>
              <p className="mono mt-0.5 text-[9px] leading-tight text-muted/80">{c.role}</p>
            </div>
          ))}
        </div>
      )}

      {/* CONTRIBUTION — parts sum to the headline; net exports can go negative */}
      {isContribution && (
        <div className="mt-4 space-y-2.5">
          {card.components.map((c) => {
            const w = Math.min(48, (Math.abs(c.level || 0) / maxContrib) * 46);
            const neg = (c.level || 0) < 0;
            return (
              <div key={c.label} className="grid grid-cols-[14px_1.5fr_1.6fr_66px] items-center gap-3">
                <ClassDot cls={c.cls} size={9} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{c.label}</p>
                  <p className="mono text-[9px] uppercase tracking-[0.08em] text-muted">{CLS_LABEL[c.cls]}{c.role ? ` · ${c.role}` : ""}</p>
                </div>
                {/* diverging bar around a center line */}
                <div className="relative hidden h-4 rounded bg-bg sm:block">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--line-strong)]" />
                  <div className="absolute inset-y-0 rounded" style={{ [neg ? "right" : "left"]: "50%", width: `${w}%`, background: stripColor(c.cls), opacity: 0.6 }} />
                </div>
                <div className="mono text-right text-[12px] text-ink">
                  {c.level != null ? `${c.level >= 0 ? "+" : ""}${c.level.toFixed(2)} pp` : "—"}
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-[14px_1.5fr_1.6fr_66px] items-center gap-3 border-t border-[var(--line)] pt-2.5">
            <span />
            <p className="text-[13px] font-semibold text-signal">{card.sumLabel || "Total"}</p>
            <p className="mono hidden text-[10px] text-muted sm:block">{card.sumNote || "sum of parts"}</p>
            <div className="mono text-right text-[12px] font-semibold text-signal">
              {card.headline?.level != null ? `${card.sumSigned && card.headline.level >= 0 ? "+" : ""}${card.headline.level.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* RATIO — numerator ÷ denominator = the headline ratio */}
      {card.type === "ratio" && (
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
            {card.components.map((c, i) => (
              <React.Fragment key={c.label}>
                {i > 0 && <div className="flex items-center justify-center text-2xl text-muted">÷</div>}
                <div className="rounded-lg border border-[var(--line)] bg-bg p-3.5">
                  <div className="flex items-center gap-1.5">
                    <ClassDot cls={c.cls} size={7} />
                    <p className="mono text-[9px] uppercase tracking-[0.06em] text-muted">{c.label}</p>
                  </div>
                  <p className="mt-1.5 text-lg font-semibold text-ink">{fmtVal(c.level, c.fmt)}</p>
                  <p className="mono mt-0.5 text-[9px] text-muted/80">{c.role}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
          {card.headline?.level != null && (
            <div className="mt-3 flex items-center justify-between rounded-lg border-l-2 border-signal bg-bg2 px-4 py-3">
              <span className="mono text-[10px] uppercase tracking-[0.1em] text-muted">= Rent as a share of income</span>
              <span className="text-xl font-semibold text-signal">{card.headline.level.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* GENERIC component rows — difference / product / deflated / basket */}
      {!isFamily && !isContribution && card.type !== "ratio" && (
      <div className="mt-4 space-y-2.5">
        {card.components.map((c) => (
          <div key={c.label} className="grid grid-cols-[14px_1fr_auto] items-center gap-3 md:grid-cols-[14px_1.7fr_84px_72px_1fr]">
            <ClassDot cls={c.cls} size={9} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">{c.label}</p>
              <p className="mono text-[9px] uppercase tracking-[0.08em] text-muted">
                {CLS_LABEL[c.cls]}{c.role ? ` · ${c.role}` : ""}
              </p>
            </div>
            {/* weight (baskets) or relation role */}
            <div className="mono hidden text-right text-[11.5px] text-muted md:block">
              {c.weight != null ? `${c.weight}%` : c.relation ? c.relation : ""}
            </div>
            {/* live YoY or level */}
            <div className="mono text-right text-[11.5px]" style={{ color: c.yoyPct != null || c.level != null ? "var(--ink)" : "var(--muted)" }}>
              {c.level != null ? fmtLevel(c.level) : c.yoyPct != null ? fmtPct(c.yoyPct) : (c.tracked ? "—" : "pending")}
            </div>
            {/* contribution bar (baskets) */}
            {isBasket ? (
              <div className="relative hidden h-4 overflow-hidden rounded bg-bg md:block">
                {c.contribution != null && (
                  <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${Math.min(100, (Math.abs(c.contribution) / maxContrib) * 92)}%`, background: stripColor(c.cls), opacity: 0.55 }} />
                )}
                <span className="mono absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-ink">
                  {c.contribution != null ? `${c.contribution >= 0 ? "+" : ""}${c.contribution.toFixed(2)} pp` : ""}
                </span>
              </div>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>
        ))}
      </div>
      )}

      {/* residual — honest gap, never fudged */}
      {card.residual && (
        <p className="mono mt-3 text-[10px] leading-relaxed text-muted">
          {card.residual.untrackedWeight > 0
            ? `${card.residual.untrackedWeight}% of the basket (energy, food, core goods) is shown by weight only — live YoY pending sub-series wiring.`
            : `Residual ${card.residual.pp >= 0 ? "+" : ""}${card.residual.pp} pp from rounding across components.`}
        </p>
      )}

      {/* revision / provenance note */}
      {card.note && (
        <p className="mono mt-3 text-[10px] leading-relaxed text-muted/90">{card.note}</p>
      )}

      {/* the divide insight */}
      <div className="mt-4 rounded-lg border-l-2 border-signal bg-bg2 px-3.5 py-3">
        <p className="text-[12.5px] leading-relaxed text-muted">{card.teach}</p>
      </div>

      {/* canary handoff */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
        <p className="mono text-[9px] leading-relaxed text-muted">
          {card.weightsAsOf ? `Weights ${card.weightsAsOf} · ${card.weightSource} · ` : ""}
          live values from Cignal · US national
        </p>
        <Link
          href={`/research?ask=${encodeURIComponent(`What's driving ${card.name} right now, and which of its components is moving it?`)}`}
          className="mono flex shrink-0 items-center gap-2 rounded-lg border border-signal/30 bg-signal/[0.06] px-3 py-2 text-[11px] tracking-[0.02em] text-signal hover:bg-signal/15"
        >
          <CanaryMark size={13} className="text-signal" /> Ask Canary what's driving this →
        </Link>
      </div>
    </div>
  );
}

export default function AnatomyPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "research")) return <ComingSoonInline vertical={vertical} title="Anatomy" />;
  return <AnatomyInner />;
}

function AnatomyInner() {
  const [cards, setCards] = useState(null);

  useEffect(() => {
    let on = true;
    fetch("/api/anatomy")
      .then((r) => r.json())
      .then((d) => { if (on) setCards(d?.cards || []); })
      .catch(() => { if (on) setCards([]); });
    return () => { on = false; };
  }, []);

  // Fall back to the static config (structure only) if the feed is empty, so the
  // page never renders blank — it just shows the makeup without live numbers.
  const view = cards && cards.length ? cards : ANATOMY.map((e) => ({ ...e, components: e.components.map((c) => ({ label: c.label, role: c.role, cls: c.cls, weight: c.weight ?? null, relation: c.relation || null, yoyPct: null, level: null, contribution: null, tracked: !!c.slug })), headline: null, residual: null }));

  return (
    <div className="pt-12 pb-16">
      <Link href="/research" className="mono mb-6 inline-flex items-center gap-2 text-[12px] tracking-[0.04em] text-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to Canary
      </Link>

      <p className="kicker mb-3">Cignal Intelligence</p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Anatomy</h1>
      <p className="mt-4 max-w-2xl text-muted">
        A composite is not a measurement — it&apos;s an average. And an average can hide the one thing a cycle
        investor needs: whether its parts lead the market or lag it. Below is every number we publish that&apos;s
        assembled from other numbers, pulled apart — with each component colored by <span className="text-ink">its own</span> role in the cycle.
      </p>

      {/* legend */}
      <div className="mono mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.08em] text-muted">
        <span className="flex items-center gap-2"><ClassDot cls="leading" /> Leading part</span>
        <span className="flex items-center gap-2"><ClassDot cls="coincident" /> Coincident / volatile</span>
        <span className="flex items-center gap-2"><ClassDot cls="lagging" /> Lagging part</span>
      </div>

      {/* cards */}
      <div className="mt-8 space-y-4">
        {view.map((c) => <Card key={c.slug || c.name} card={c} />)}
      </div>

      {/* roadmap — recognized composites being pulled apart next */}
      <div className="mt-10">
        <div className="mb-1 flex items-center gap-3">
          <span className="h-px w-8 bg-signal/60" />
          <h3 className="mono text-[11px] tracking-[0.18em] text-muted">COMING TO ANATOMY</h3>
        </div>
        <p className="mono mb-3 pl-11 text-[10.5px] leading-relaxed text-muted">
          More numbers built from other numbers — recognized composites we&apos;ll pull apart next.
        </p>
        <div className="card divide-y divide-[var(--line)]">
          {ANATOMY_MORE.map((m) => (
            <div key={m.name} className="grid grid-cols-[1fr_auto] items-start gap-4 px-5 py-4 sm:grid-cols-[1.3fr_1.7fr_auto]">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-medium text-ink">{m.name}</p>
                  <span className="mono rounded-sm bg-bg px-1.5 py-0.5 text-[8px] tracking-[0.12em] text-muted/70">SOON</span>
                </div>
                {m.parts && <p className="mono mt-1 text-[9px] uppercase tracking-[0.08em] text-up">◉ {m.parts}</p>}
                {m.note && <p className="mt-1 text-[11px] leading-relaxed text-muted sm:hidden">{m.note}</p>}
              </div>
              <div className="hidden sm:block">
                <p className="mono text-[10.5px] leading-relaxed text-muted">{m.formula}</p>
                {m.note && <p className="mt-1 text-[11px] leading-relaxed text-muted/80">{m.note}</p>}
              </div>
              <div className="flex items-center justify-end gap-2">
                <TypeBadge type={m.type} />
                <ClassChip cls={m.cls} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mono mt-8 text-[10px] leading-relaxed text-muted">
        Live values pulled from Cignal, US national. CPI weights are BLS relative importance (Dec 2025). Component
        cycle roles are Cignal editorial classifications. Anatomy shows how a number is built; Canary reads what&apos;s
        moving it right now.
      </p>
    </div>
  );
}
