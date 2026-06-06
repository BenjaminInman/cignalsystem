const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

const SERIES = [
  { key: "rent", label: "Rent %", color: "#38BDF8", dash: false, data: [3.2, 3.3, 3.4, 3.5, 3.55, 3.65, 3.75, 3.85, 3.8, 3.85, 3.95, 3.85] },
  { key: "noi", label: "NOI %", color: "#5FB97C", dash: false, data: [3.5, 3.6, 3.7, 3.8, 3.85, 3.95, 4.0, 4.05, 4.1, 4.15, 4.2, 4.2] },
  { key: "vac", label: "Vacancy %", color: "#E5634D", dash: true, data: [6.2, 6.05, 5.95, 5.85, 5.75, 5.65, 5.55, 5.5, 5.45, 5.35, 5.25, 5.2] },
];

const W = 720, H = 300, padL = 42, padR = 14, padT = 18, padB = 32;
const innerW = W - padL - padR, innerH = H - padT - padB;
const Y_MIN = 0, Y_MAX = 8;

const xAt = (i) => padL + (i / (MONTHS.length - 1)) * innerW;
const yAt = (v) => padT + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;

function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function Swatch({ color, dash }) {
  return (
    <svg width="22" height="8" aria-hidden="true">
      <line x1="0" y1="4" x2="22" y2="4" stroke={color} strokeWidth="2.5" strokeDasharray={dash ? "4 3" : ""} strokeLinecap="round" />
    </svg>
  );
}

export default function PerformanceTrends() {
  const gridVals = [0, 2, 4, 6, 8];

  return (
    <section>
      <div className="card h-full p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="headline text-2xl text-ink md:text-3xl">12-Month Performance Trends</h2>
            <p className="mt-1 text-sm text-muted">National average · rent growth, vacancy &amp; NOI (same-store)</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {SERIES.map((s) => (
              <span key={s.key} className="flex items-center gap-2">
                <Swatch color={s.color} dash={s.dash} />
                <span className="mono text-[12px] tracking-[0.04em] text-muted">{s.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
            {/* horizontal grid + y-axis % labels */}
            {gridVals.map((v) => (
              <g key={v}>
                <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
                <text x={padL - 10} y={yAt(v) + 3} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="monospace">{v}%</text>
              </g>
            ))}
            {/* vertical grid + x-axis month labels */}
            {MONTHS.map((m, i) => (
              <g key={m + i}>
                <line x1={xAt(i)} y1={padT} x2={xAt(i)} y2={H - padB} stroke="var(--line)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 4" />
                <text x={xAt(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="monospace">{m}</text>
              </g>
            ))}
            {/* solid axes */}
            <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1" />
            <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1" />
            {/* series */}
            {SERIES.map((s) => {
              const pts = s.data.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
              return (
                <path key={s.key} d={smooth(pts)} fill="none" stroke={s.color} strokeWidth="2.5"
                  strokeDasharray={s.dash ? "6 4" : ""} strokeLinejoin="round" strokeLinecap="round" />
              );
            })}
          </svg>
        </div>

        <p className="mono mt-3 text-[10px] tracking-[0.06em] text-muted">Illustrative sample of national same-store averages.</p>
      </div>
    </section>
  );
}
