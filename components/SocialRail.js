import { socialLinks } from "@/lib/brand";
import { ICONS } from "@/components/SocialIcons";

// Floating "connect" rail pinned to the left edge, vertically centered.
// Left side is the stronger placement for a follow bar: it sits in the reader's
// initial F-pattern scan path and avoids the right-rail "banner blindness" zone.
// Desktop only (lg+) — the footer icons carry tablet/mobile, and the wide-screen
// gutter keeps the rail clear of the centered content column.
export default function SocialRail() {
  const links = socialLinks();
  if (!links.length) return null;

  return (
    <aside
      aria-label="Follow Cignal System"
      className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 select-none flex-col items-start lg:flex"
    >
      <div className="flex flex-col overflow-hidden rounded-r-lg border border-l-0 border-[var(--line)] bg-bg2/80 shadow-[0_0_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
        {/* aperture seal */}
        <div className="flex h-8 w-11 items-center justify-center border-b border-[var(--line)]">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
            <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
            <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
          </svg>
        </div>

        {links.map(({ key, label, href }) => {
          const Icon = ICONS[key];
          return (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="group relative flex h-11 w-11 items-center justify-center border-b border-[var(--line)] text-muted transition-colors duration-200 last:border-b-0 hover:bg-[var(--signal-dim)] hover:text-signal"
            >
              {Icon && (
                <Icon className="h-[17px] w-[17px] transition-transform duration-200 group-hover:scale-110" />
              )}
              {/* terminal-style flyout label */}
              <span className="mono pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-[var(--line-strong)] bg-bg2 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                {label}
              </span>
            </a>
          );
        })}

        {/* vertical caption */}
        <div
          className="flex h-[74px] w-11 items-center justify-center border-t border-[var(--line)]"
          style={{ writingMode: "vertical-rl" }}
        >
          <span className="mono rotate-180 text-[9px] uppercase tracking-[0.34em] text-muted/60">
            Connect
          </span>
        </div>
      </div>
    </aside>
  );
}
