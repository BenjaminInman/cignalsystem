import {
  Database,
  Building2,
  MapPin,
  Layers,
  Radio,
  Landmark,
  Home,
  LineChart,
  Truck,
  Package,
  UserCog,
} from "lucide-react";

// Maps the string keys we pass from the server to real icon components.
const ICONS = {
  landmark: Landmark,
  home: Home,
  line: LineChart,
  truck: Truck,
  package: Package,
  user: UserCog,
};

// Cadence badge styling, keyed by tone.
const TONES = {
  live: "border-up/30 bg-up/10 text-up",
  monthly: "border-signal/30 bg-signal/10 text-signal",
  annual: "border-[var(--line-strong)] bg-bg2 text-muted",
  manual: "border-dashed border-[var(--line-strong)] text-muted",
};

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "—");

export default function AdminDataCoverage({ coverage }) {
  const { msa, zip, obs, indicators, migrationRows, geographies, sources } =
    coverage;

  return (
    <div className="pt-12">
      <p className="kicker mb-3 flex items-center gap-2">
        <Database size={12} className="text-signal" /> Admin · Data coverage
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Coverage</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Live counts straight from Supabase — markets, geographies, and every feed
        currently powering the platform. Refreshes on each load.
      </p>

      {/* Headline stats */}
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
        <Stat icon={Building2} label="MSAs" value={fmt(msa)} />
        <Stat icon={MapPin} label="ZIP codes" value={fmt(zip)} />
        <Stat icon={Layers} label="Data points" value={fmt(obs)} accent />
        <Stat icon={Radio} label="Sources" value={fmt(sources.length)} />
      </div>

      <p className="mono mt-3 text-[11px] tracking-[0.04em] text-muted">
        {indicators} indicators · {migrationRows} migration rankings ·{" "}
        {fmt(geographies)} geographies
      </p>

      {/* Source list */}
      <div className="card mt-8 overflow-hidden p-0">
        <div className="hidden grid-cols-[1.4fr_2fr_0.9fr_0.9fr] gap-4 border-b border-[var(--line)] px-5 py-3 md:grid">
          <Th>Source</Th>
          <Th>What it feeds</Th>
          <Th>Volume</Th>
          <Th>Cadence</Th>
        </div>

        {sources.map((s) => {
          const Icon = ICONS[s.icon] || Database;
          return (
            <div
              key={s.name}
              className="grid grid-cols-1 gap-2 border-b border-[var(--line)] px-5 py-4 last:border-0 md:grid-cols-[1.4fr_2fr_0.9fr_0.9fr] md:items-center md:gap-4"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon size={15} strokeWidth={1.8} className="shrink-0 text-muted" />
                <span className="truncate text-[14px] text-ink">{s.name}</span>
              </div>
              <p className="mono truncate text-[12px] text-muted">{s.desc}</p>
              <p className="mono text-[12px] text-muted">{s.volume}</p>
              <div>
                <span
                  className={`mono inline-flex rounded-full border px-3 py-1 text-[11px] tracking-[0.06em] ${
                    TONES[s.tone] || TONES.manual
                  }`}
                >
                  {s.cadence}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mono mt-4 text-[11px] tracking-[0.04em] text-muted">
        Counts read live from <span className="text-ink">indicators</span>,{" "}
        <span className="text-ink">regions</span>,{" "}
        <span className="text-ink">observations</span> and{" "}
        <span className="text-ink">migration_rankings</span>. Cadence and feed
        labels are maintained in code.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-bg2 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon
          size={14}
          className={accent ? "text-signal" : "text-muted"}
          strokeWidth={1.8}
        />
        <span className="kicker">{label}</span>
      </div>
      <p className={`headline text-3xl ${accent ? "text-signal" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function Th({ children }) {
  return <span className="kicker">{children}</span>;
}
