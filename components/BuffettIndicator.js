import { Gauge } from "lucide-react";

// Latest reading (Market Cap / GDP). Updated periodically; see methodology note.
const VALUE = 238.8;
const AS_OF = "June 2026";
const MIN = 50;
const MAX = 250;

const ZONES = [
  { label: "Undervalued", w: 20, color: "#5FB97C" },        // 50–90
  { label: "Fair", w: 15, color: "#A7C957" },               // 90–120
  { label: "Elevated", w: 15, color: "#E8B04B" },           // 120–150
  { label: "Overvalued", w: 25, color: "#E0843B" },         // 150–200
  { label: "Significantly Over", w: 25, color: "#D7402B" }, // 200–250
];

export default function BuffettIndicator() {
  const pos = Math.min(100, Math.max(0, ((VALUE - MIN) / (MAX - MIN)) * 100));

  return (
    <section className="relative mt-14 overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-bg2/70 via-bg2/30 to-bg/10 px-6 py-8 md:px-10">
      {/* ambient market-signal backdrop */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 360" aria-hidden="true">
        <defs>
          <radialGradient id="buffettGlow" cx="80%" cy="6%" r="75%">
            <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="360" fill="url(#buffettGlow)" />
        <path d="M0,210 C120,150 200,250 320,200 C440,150 520,250 640,195 C760,140 840,240 960,185 C1080,135 1150,210 1200,175" fill="none" stroke="#F5B544" strokeOpacity="0.10" strokeWidth="2" />
        <g fill="#F5B544" fillOpacity="0.3">
          <circle cx="320" cy="200" r="3" />
          <circle cx="640" cy="195" r="3" />
          <circle cx="960" cy="185" r="3" />
        </g>
      </svg>

      <div className="relative">
      <p className="kicker mb-3 flex items-center gap-2"><Gauge size={12} className="text-signal" /> Macro · Broad Market</p>
      <h2 className="headline text-3xl text-ink md:text-4xl">The Buffett Indicator</h2>
      <p className="mt-3 max-w-2xl text-muted">
        Total US stock-market capitalization measured against GDP — the metric Warren Buffett once called
        the best single gauge of where overall valuations stand. It frames the macro backdrop the whole
        real-estate cycle plays out inside.
      </p>

      <div className="card mt-6 p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-[260px_1fr] md:items-center">
          {/* Reading */}
          <div>
            <div className="headline text-6xl" style={{ color: "#D7402B" }}>{VALUE.toFixed(0)}%</div>
            <p className="mt-2 text-lg font-semibold text-ink">Significantly Overvalued</p>
            <p className="mono mt-1 text-[11px] tracking-[0.06em] text-muted">
              ~2σ ABOVE TREND · NEAR RECORD HIGHS
            </p>
          </div>

          {/* Explainer */}
          <div className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              The ratio divides the combined value of all US public companies by the size of the economy.
              Around <span className="text-ink">100%</span> is broadly &ldquo;fair&rdquo;; readings past
              <span className="text-ink"> ~150%</span> have historically marked stretched, late-cycle markets.
            </p>
            <p>
              At <span className="text-ink">~{VALUE.toFixed(0)}%</span>, the broad market is richly priced
              versus output — a backdrop that tends to compress forward returns and sharpen the hunt for
              yield, including into real assets. It is a context gauge, not a timing trigger.
            </p>
          </div>
        </div>

        {/* Gauge */}
        <div className="mt-8">
          <div className="relative">
            <div className="flex h-3 overflow-hidden rounded-full">
              {ZONES.map((z) => (
                <div key={z.label} style={{ width: `${z.w}%`, backgroundColor: z.color }} />
              ))}
            </div>
            {/* marker */}
            <div className="absolute -top-1.5 flex -translate-x-1/2 flex-col items-center" style={{ left: `${pos}%` }}>
              <div className="h-6 w-0.5 bg-ink" />
            </div>
            <div className="absolute -bottom-7 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos}%` }}>
              <span className="mono rounded-sm bg-ink px-1.5 py-0.5 text-[10px] font-medium text-bg">{VALUE.toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-9 flex justify-between mono text-[9px] tracking-[0.08em] text-muted">
            <span>50%</span><span>UNDER</span><span>FAIR</span><span>ELEVATED</span><span>OVER</span><span>250%</span>
          </div>
        </div>

        <p className="mono mt-6 border-t border-[var(--line)] pt-4 text-[10px] leading-relaxed tracking-[0.04em] text-muted">
          As of {AS_OF} · total market cap ÷ GDP (Wilshire 5000 basis). Sources: GuruFocus, MacroMicro,
          Current Market Valuation. Updated periodically — structural caveats apply (US firms&rsquo; foreign
          revenue and the rate regime both shift &ldquo;fair&rdquo; levels). Educational, not investment advice.
        </p>
      </div>
      </div>
    </section>
  );
}
