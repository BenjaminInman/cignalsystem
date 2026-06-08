export default function ComingSoonInline({ vertical, title }) {
  const label = vertical?.label || "this vertical";
  return (
    <div className="pt-12 pb-10">
      <h1 className="headline text-4xl text-ink md:text-5xl">{title}</h1>
      <div className="card mt-8 flex flex-col items-center px-6 py-20 text-center">
        <p className="kicker mb-3">{label}</p>
        <h2 className="headline text-2xl text-ink md:text-3xl">
          This view is being tailored for {label}.
        </h2>
        <p className="mt-3 max-w-md text-muted">
          We&apos;re adapting {title} for the {label.toLowerCase()} cycle. It&apos;ll light up
          here soon — the live Multifamily system shows the full version today.
        </p>
        <a
          href="https://multifamily.cignalsystem.com"
          className="mono mt-7 inline-flex items-center gap-2 rounded-sm border border-signal/40 px-4 py-2.5 text-[12px] tracking-[0.08em] text-signal hover:bg-signal/10"
        >
          SEE IT ON MULTIFAMILY →
        </a>
      </div>
    </div>
  );
}
