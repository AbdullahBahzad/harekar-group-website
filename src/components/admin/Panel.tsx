import type { ReactNode } from "react";

/**
 * The console's one structural unit: a plain bordered card.
 *
 * Used to carry a "dossier" frame — corner ticks, a two-digit station index,
 * a monospace all-caps title. Simplified to an ordinary card so the console
 * reads like the rest of the product's admin tooling rather than a themed
 * instrument panel.
 */
export default function Panel({
  label,
  action,
  children,
  className = "",
  tone = "gold",
}: {
  /** Title printed into the card header. */
  label?: string;
  /** Optional control docked to the right of the title. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "gold" | "clear" | "elevated" | "critical";
}) {
  const toneClass = {
    gold: "border-bone/10",
    clear: "border-status-clear/30",
    elevated: "border-status-elevated/30",
    critical: "border-status-critical/30",
  }[tone];

  return (
    <section
      className={`bg-surface/30 rounded-xl border ${toneClass} ${className}`}
    >
      {(label || action) && (
        <header className="border-bone/8 flex items-center gap-3 border-b px-4 py-3">
          {label && (
            <h2 className="text-bone/80 text-sm font-medium">{label}</h2>
          )}
          <span className="flex-1" />
          {action}
        </header>
      )}

      <div>{children}</div>
    </section>
  );
}
