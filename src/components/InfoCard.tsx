import type { ReactNode } from "react";

/**
 * A plain content card for the light ground: white panel, hairline border,
 * a gold-ringed icon (or index number), a bold title and body text.
 *
 * Replaces the dark neon `GradientCard` on the public pages, which was built
 * for a black background and has no light equivalent.
 */
export default function InfoCard({
  icon,
  index,
  title,
  body,
  as: Heading = "h3",
}: {
  icon?: ReactNode;
  index?: string;
  title: string;
  body: string;
  as?: "h3" | "h4";
}) {
  return (
    <article className="border-bone/10 hover:border-gold/60 flex h-full flex-col rounded-2xl border bg-white p-6 shadow-[0_1px_2px_rgba(16,29,47,0.04),0_8px_24px_-12px_rgba(16,29,47,0.12)] transition-colors duration-300 sm:p-7">
      <span className="bg-gold/12 text-gold-deep border-gold/30 flex size-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold tabular-nums">
        {icon ?? index}
      </span>
      <Heading className="font-display text-bone mt-5 text-xl leading-snug font-bold text-balance">
        {title}
      </Heading>
      <p className="text-bone/75 mt-3 text-base leading-relaxed text-pretty">
        {body}
      </p>
    </article>
  );
}
