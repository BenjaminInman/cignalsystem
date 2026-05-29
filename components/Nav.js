"use client";

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
              <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
              <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
            </svg>
          </span>
          <span className="mono text-sm font-medium tracking-[0.18em] text-ink">
            CIGNAL<span className="text-signal">·</span>SYSTEM
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {["Intelligence", "Indicators", "Research", "Method"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="hover-line mono text-[12px] tracking-[0.12em] text-muted transition-colors hover:text-ink"
            >
              {l.toUpperCase()}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#"
            className="mono hidden text-[12px] tracking-[0.1em] text-muted transition-colors hover:text-ink sm:block"
          >
            SIGN IN
          </a>
          <a
            href="#"
            className="mono rounded-sm border border-signal/40 bg-signal/10 px-4 py-2 text-[12px] tracking-[0.1em] text-signal transition-all hover:bg-signal hover:text-bg"
          >
            REQUEST ACCESS
          </a>
        </div>
      </div>
    </header>
  );
}
