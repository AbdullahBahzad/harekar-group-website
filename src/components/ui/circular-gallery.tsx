"use client";

import React, {
  useState,
  useEffect,
  useRef,
  type HTMLAttributes,
} from "react";

/** Conditional class-name join, shadcn-style. */
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

/** A single card on the orbit. */
export interface GalleryItem {
  /** Stable identity, used for selection. */
  id?: string;
  /** Primary label — here, the service name. */
  common: string;
  /** Secondary italic label — here, the service group. */
  binomial: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by: string;
  };
}

/**
 * Beyond this many degrees off-centre a card is edge-on or behind the
 * cylinder. Those are still rendered (they are what makes it read as a ring)
 * but must not take the pointer, or a click aimed at the front card can land
 * on a ghost card ticking past behind it.
 */
const FACING_LIMIT = 75;

/*
 * `onSelect` is omitted from the inherited DOM attributes: React already
 * defines one there for text-selection events, and ours takes a GalleryItem
 * rather than an event.
 */
interface CircularGalleryProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: GalleryItem[];
  /** Controls how far the items are from the center. */
  radius?: number;
  /** Controls the speed of auto-rotation when uncontrolled. */
  autoRotateSpeed?: number;
  /**
   * Controlled rotation in degrees. When provided, the gallery is driven
   * entirely by the parent (e.g. section-scoped scroll) and the internal
   * window-scroll/auto-rotate behaviour is disabled.
   */
  rotation?: number;
  /** Currently opened card's `id`. Cards become buttons when `onSelect` is set. */
  selectedId?: string | null;
  onSelect?: (item: GalleryItem) => void;
  /** Accessible verb for the card trigger, e.g. "Show details". */
  selectLabel?: string;
  /**
   * Card footprint in px. Supplied by the parent because the right size depends
   * on the stage's height and on how much perspective magnifies the front card
   * — neither of which a breakpoint class can express.
   */
  cardWidth?: number;
  cardHeight?: number;
}

/**
 * A 3D carousel of cards arranged on a cylinder.
 *
 * Adapted for this codebase from the reference shadcn component: brand tokens
 * replace the stock border/card palette, and a controlled `rotation` prop was
 * added so the one-page scroll can drive it via its own section progress
 * rather than document scroll.
 */
const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  (
    {
      items,
      className,
      radius = 600,
      autoRotateSpeed = 0.02,
      rotation: controlledRotation,
      selectedId,
      onSelect,
      selectLabel,
      cardWidth = 300,
      cardHeight = 400,
      ...props
    },
    ref,
  ) => {
    const isControlled = controlledRotation !== undefined;
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Uncontrolled fallback: rotation follows document scroll.
    useEffect(() => {
      if (isControlled) return;

      const handleScroll = () => {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        const scrollableHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress =
          scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        setRotation(scrollProgress * 360);

        scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }, [isControlled]);

    // Uncontrolled fallback: gentle auto-rotation while idle.
    useEffect(() => {
      if (isControlled) return;

      const autoRotate = () => {
        if (!isScrolling) {
          setRotation((prev) => prev + autoRotateSpeed);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };

      animationFrameRef.current = requestAnimationFrame(autoRotate);
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isScrolling, autoRotateSpeed, isControlled]);

    const activeRotation = isControlled ? controlledRotation : rotation;
    const anglePerItem = 360 / items.length;

    return (
      <div
        ref={ref}
        role="region"
        aria-label="Circular 3D Gallery"
        className={cn(
          "relative flex h-full w-full items-center justify-center",
          className,
        )}
        style={{ perspective: "2000px" }}
        {...props}
      >
        <div
          className="relative h-full w-full"
          style={{
            transform: `rotateY(${activeRotation}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = activeRotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(
              relativeAngle > 180 ? 360 - relativeAngle : relativeAngle,
            );
            const opacity = Math.max(0.25, 1 - normalizedAngle / 180);

            const interactive = Boolean(onSelect);
            const isFacing = normalizedAngle < FACING_LIMIT;
            const isSelected = selectedId != null && item.id === selectedId;

            const card = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D-transformed card; next/image adds no value here */}
                <img
                  src={item.photo.url}
                  alt={item.photo.text}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                  style={{ objectPosition: item.photo.pos || "center" }}
                />

                {/* Gold lift on hover and while selected. */}
                <span
                  aria-hidden
                  className={cn(
                    "from-gold/25 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent transition-opacity duration-300",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                />

                {/* Gold-tinted footer gradient carrying the labels. */}
                <div className="pointer-events-none absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-10 text-left rtl:text-right">
                  <h3 className="font-display text-bone text-lg leading-snug font-medium">
                    {item.common}
                  </h3>
                  <em className="text-gold-bright/80 mt-1 block text-xs italic">
                    {item.binomial}
                  </em>
                </div>

                {/* Hairline gold top edge for the premium read. */}
                <div className="via-gold/40 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
              </>
            );

            const surface = cn(
              "group relative h-full w-full overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-lg transition-colors duration-300",
              isSelected
                ? "border-gold/70 bg-surface/45"
                : "border-bone/10 bg-surface/30",
            );

            return (
              <div
                key={item.photo.url}
                className="absolute"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  /*
                   * The trailing translate centres the card on its own anchor.
                   * This used to be `marginLeft: -125px / marginTop: -170px`,
                   * hardcoded to the 250x340 mobile card — so from the `sm`
                   * breakpoint up, where the card becomes 300x400, the entire
                   * ring hung 25px right and 30px low of the stage. Percentages
                   * resolve against the element's own box, so this stays correct
                   * at every breakpoint. It is applied first (rightmost) so it
                   * offsets the card in its own plane before the ring places it.
                   */
                  transform: `rotateY(${itemAngle}deg) translateZ(${radius}px) translate(-50%, -50%)`,
                  left: "50%",
                  top: "50%",
                  opacity,
                  transition: "opacity 0.3s linear",
                  /*
                   * Only the cards turned toward the viewer accept the pointer.
                   * Keyboard focus is unaffected, so every service stays
                   * reachable by Tab regardless of where the ring happens to be.
                   */
                  pointerEvents: interactive && !isFacing ? "none" : undefined,
                }}
              >
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onSelect?.(item)}
                    aria-pressed={isSelected}
                    aria-label={
                      selectLabel ? `${item.common} — ${selectLabel}` : item.common
                    }
                    className={cn(
                      surface,
                      "focus-visible:ring-gold hover:border-gold/50 cursor-pointer text-start outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
                    )}
                  >
                    {card}
                  </button>
                ) : (
                  <div role="group" aria-label={item.common} className={surface}>
                    {card}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

CircularGallery.displayName = "CircularGallery";

export { CircularGallery };
