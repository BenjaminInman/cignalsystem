import { ArrowRight } from "lucide-react";

const SCORE_URL = "/cignalscore";

function arc(cx, cy, r, fromDeg, toDeg, steps = 60) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const deg = fromDeg + (toDeg - fromDeg) * (i / steps);
    const rad = (deg * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(rad)).toFixed(1)},${(cy - r * Math.sin(rad)).toFixed(1)}`);
  }
  return "M " + pts.join(" L ");
}

function ScoreArc() {
  const cx = 100, cy = 100, r = 78;
  const frac = 0.55; // representative fill
  const endDeg = 180 * (1 - frac);
  const endRad = (endDeg * Math.PI) / 180;
  const mx = cx + r * Math.cos(endRad), my = cy - r * Math.sin(endRad);

  return (
    <svg viewBox="0 0 200 124" className="mx-auto w-44">
      <path d={arc(cx, cy, r, 180, 0)} fill="none" stroke="var(--line-strong)" strokeWidth="10" strokeLinecap="round" />
      <path d={arc(cx, cy, r, 180, endDeg)} fill="none" stroke="#F5B544" strokeWidth="10" strokeLinecap="round" />
      <circle cx={mx} cy={my} r="6" fill="#F5B544" />
      <text x={cx} y={92} textAnchor="middle" fontSize="40" fontWeight="700" fill="#F5B544" fontFamily="Archivo, sans-serif">?</text>
      <text x="18" y="118" textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="monospace">10</text>
      <text x="182" y="118" textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="monospace">40</text>
    </svg>
  );
}

export default function CignalScoreCTA() {
  return (
    <div className="card p-6 text-center">
      <p className="kicker mb-2">Free Assessment</p>
      <ScoreArc />
      <h2 className="headline mt-1 text-xl text-ink">What&apos;s your Cignal Score?</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        A free 5-minute diagnostic that reveals how clearly you read the market cycle — across phase positioning,
        indicator literacy, behavioral discipline, timing, and signal sourcing.
      </p>
      <div className="mono mt-4 flex items-center justify-center gap-2 text-[10px] tracking-[0.12em] text-muted">
        <span>18 QUESTIONS</span>
        <span className="text-[var(--line-strong)]">·</span>
        <span>5 CATEGORIES</span>
        <span className="text-[var(--line-strong)]">·</span>
        <span>5 MIN</span>
      </div>
      <a href={SCORE_URL} className="mono mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2.5 text-[12px] tracking-[0.08em] text-bg hover:opacity-90">
        Take the free assessment <ArrowRight size={14} />
      </a>
    </div>
  );
}
