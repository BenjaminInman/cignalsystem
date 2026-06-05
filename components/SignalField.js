// Ambient market-signal backdrop: faint gold waveform, node points, and a soft glow.
// Pass a unique `id` per instance so the gradient defs don't collide on one page.
export default function SignalField({ id = "sf" }) {
  const glow = `${id}-glow`;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 420" aria-hidden="true">
      <defs>
        <radialGradient id={glow} cx="78%" cy="6%" r="75%">
          <stop offset="0%" stopColor="#F5B544" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="420" fill={`url(#${glow})`} />
      <path d="M0,250 C120,180 200,300 320,235 C440,175 520,300 640,225 C760,160 840,290 960,215 C1080,150 1150,250 1200,205" fill="none" stroke="#F5B544" strokeOpacity="0.13" strokeWidth="2" />
      <path d="M0,310 C140,265 220,350 360,295 C500,245 580,340 720,285 C860,235 940,330 1080,280 C1140,258 1175,270 1200,262" fill="none" stroke="#F5B544" strokeOpacity="0.06" strokeWidth="1.5" />
      <g fill="#F5B544" fillOpacity="0.35">
        <circle cx="320" cy="235" r="3" />
        <circle cx="640" cy="225" r="3" />
        <circle cx="960" cy="215" r="3" />
      </g>
    </svg>
  );
}
