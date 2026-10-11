import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";
import { cn } from "@/lib/utils";

/**
 * The heading block every public section opens with: a small gold label, a
 * bold headline, and an optional line of supporting text.
 *
 * One component so the brand's type rules — bold Manrope headings, no large
 * blocks of capitals, 17–18px body copy — are applied in one place rather than
 * restated in each section.
 */
export default function SectionIntro({
  eyebrow,
  title,
  subtitle,
  as: Heading = "h2",
  align = "start",
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  as?: "h1" | "h2";
  align?: "start" | "center";
  className?: string;
  /** Anything that belongs with the heading, such as a link beneath it. */
  children?: ReactNode;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <p className="text-gold-deep flex items-center gap-3 text-sm font-bold tracking-wide sm:text-base">
        <span
          aria-hidden
          className={cn("bg-gold h-0.5 w-8 rounded-full", align === "center" && "hidden")}
        />
        {eyebrow}
      </p>
      <Heading className="font-display text-bone mt-4 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </Heading>
      {subtitle && (
        <p className="text-bone/75 mt-5 text-lg leading-relaxed text-pretty">
          {subtitle}
        </p>
      )}
      {children}
    </Reveal>
  );
}
