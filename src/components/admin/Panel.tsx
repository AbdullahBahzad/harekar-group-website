import type { ReactNode } from "react";

/**
 * The console's one structural unit: a framed readout.
 *
 * Every panel wears the same four corner ticks the hero's sensor lens draws
 * around a locked service. Reusing that motif is the whole idea — the console
 * should look like the instrument the public site advertises, not like a
 * generic table page bolted onto the back of it.
 *
 * The frame is drawn with four absolutely-positioned spans rather than a
 * border-image or an SVG, so it inherits `currentColor` and can be re-tinted
 * per severity by changing one class on the wrapper.
 */
export default function Panel({
  label,
  index,
  action,
  children,
  className = "",
  tone = "gold",
}: {
  /** Small caps title, printed into the top rule. */
  label?: string;
  /** Two-digit station index, echoing the site's sidebar numbering. */
  index?: string;
  /** Optional control docked to the right of the title rule. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "gold" | "clear" | "elevated" | "critical";
}) {
  const toneClass = {
    gold: "text-gold/50",
    clear: "text-status-clear/60",
    elevated: "text-status-elevated/60",
    critical: "text-status-critical/70",
  }[tone];

  return (
    <section
      className={`border-bone/8 bg-ink/40 relative border ${className}`}
    >
      {/* Corner ticks — the console's signature. */}
      <span aria-hidden className={`pointer-events-none absolute inset-0 ${toneClass}`}>
        <span className="absolute -top-px -left-px size-3 border-t border-l border-current" />
        <span className="absolute -top-px -right-px size-3 border-t border-r border-current" />
        <span className="absolute -bottom-px -left-px size-3 border-b border-l border-current" />
        <span className="absolute -right-px -bottom-px size-3 border-r border-b border-current" />
      </span>

      {(label || action) && (
        <header className="border-bone/8 flex items-center gap-3 border-b px-4 py-2.5">
          {index && (
            <span className="text-gold/70 font-mono text-[10px] tracking-[0.2em] tabular-nums">
              {index}
            </span>
          )}
          {label && (
            <h2 className="text-bone/55 font-mono text-[10px] tracking-[0.28em] uppercase">
              {label}
            </h2>
          )}
          {/* Rule that fills whatever space the title leaves. */}
          <span aria-hidden className="via-bone/12 h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
          {action}
        </header>
      )}

      <div className="relative">{children}</div>
    </section>
  );
}
