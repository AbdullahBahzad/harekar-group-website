import { cn } from "@/lib/utils";
import styles from "./background-paths.module.css";

const paths = Array.from({ length: 14 }, (_, i) => {
  const offset = i * 20;
  const upper = 140 + offset;
  const lower = 600 + offset;

  // Two complete periods in ONE path. At x=0, 1600 and 3200, both the
  // position and tangent match, including across the animation's wrap.
  return `M 0 ${upper}
    C 400 ${upper}, 400 ${lower}, 800 ${lower}
    C 1200 ${lower}, 1200 ${upper}, 1600 ${upper}
    C 2000 ${upper}, 2000 ${lower}, 2400 ${lower}
    C 2800 ${lower}, 2800 ${upper}, 3200 ${upper}`;
});

/** One continuous ribbon, translated by exactly one repeating period. */
export function BackgroundPaths({
  className,
  fullPage = false,
}: {
  className?: string;
  fullPage?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(styles.background, fullPage && styles.page, className)}
    >
      <svg
        className={styles.paths}
        viewBox="0 0 3200 1000"
        preserveAspectRatio="none"
        fill="none"
        focusable="false"
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity={0.3 + (1 - Math.abs(i - 6.5) / 6.5) * 0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
