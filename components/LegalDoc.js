import { Scale } from "lucide-react";

// Renders a numbered legal document. sections: [{ h, p, list? }]
export default function LegalDoc({ kicker = "Legal", title, effective, intro, sections, contact }) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-14 pb-24 fade-up">
      <p className="kicker mb-3 flex items-center gap-2">
        <Scale size={12} className="text-signal" /> {kicker}
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">{title}</h1>
      {effective && (
        <p className="mono mt-3 text-[12px] tracking-[0.04em] text-muted">
          Effective {effective}
        </p>
      )}
      {intro && (
        <p className="mt-8 text-[15px] leading-relaxed text-muted">{intro}</p>
      )}
      <div className="mt-10 space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold text-ink">
              {i + 1}. {s.h}
            </h2>
            {s.p && (
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.p}</p>
            )}
            {s.list && (
              <ul className="mt-3 space-y-1.5">
                {s.list.map((li, j) => (
                  <li
                    key={j}
                    className="flex gap-2.5 text-[14px] leading-relaxed text-muted"
                  >
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-signal/60" />
                    <span>{li}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {contact && (
        <p className="mono mt-12 border-t border-[var(--line)] pt-6 text-[12px] leading-relaxed text-muted/80">
          {contact}
        </p>
      )}
    </div>
  );
}
