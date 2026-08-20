"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import ServiceIcon from "@/components/ServiceIcon";
import type { ServiceKey } from "@/data/services";

/** Spacing of the sampling lattice, in CSS pixels. Smaller reads finer, costs more. */
const SAMPLE_GRID = 6;

/** Radius of the sensor lens around the pointer, in CSS pixels. */
const REVEAL_RADIUS = 150;

/** Fraction of the radius that stays at full strength before feathering out. */
const FALLOFF_START = 0.55;

/**
 * Alpha difference between neighbouring cells that counts as a contour.
 *
 * Low enough to catch the soft interior edges of the mane, high enough that
 * the video's own compression noise does not light up as structure.
 */
const EDGE_THRESHOLD = 0.16;

/** Clean white for the wireframe and brackets — the "live system" read. */
const SCAN_COOL = "255, 255, 255";

/** Brand gold, for the sweep bands travelling through the body. */
const SCAN_GOLD = "239, 204, 110";

/** Seconds for one full top-to-bottom pass of the sweep bands. */
const SWEEP_PERIOD = 2.8;

/**
 * Readout anchors, in coordinates normalised to the lion's contained video box
 * (0,0 top-left → 1,1 bottom-right).
 *
 * These are the one thing worth tuning by eye: they are placed against the
 * roar footage's framing, so if the clip is ever recut the brackets need
 * nudging with it. Each anchor pairs a point on the lion with the service that
 * belongs there, which is the whole idea — the lens reads him as a system.
 */
const ANCHORS: { x: number; y: number; service: ServiceKey }[] = [
  { x: 0.52, y: 0.3, service: "surveillance" }, // eye line
  { x: 0.47, y: 0.46, service: "k9" }, // jaw
  { x: 0.35, y: 0.3, service: "crisis" }, // mane, upper left
  { x: 0.66, y: 0.4, service: "erp" }, // shoulder
  { x: 0.62, y: 0.62, service: "armored" }, // flank
  { x: 0.38, y: 0.68, service: "static" }, // foreleg
  { x: 0.72, y: 0.78, service: "mobile" }, // hindquarter
  { x: 0.3, y: 0.85, service: "cit" }, // paw
];

/** How many readouts may be locked at once. More than this reads as clutter. */
const MAX_LOCKED = 3;

type Locked = { service: ServiceKey; x: number; y: number };

/**
 * The pointer as a sensor lens: the lion resolves into a scanned wireframe,
 * and the services running at each point on him lock on as tracking readouts.
 *
 * This does not draw an effect *over* the lion — it re-renders the lion. Each
 * frame the video is downscaled into a small sampling buffer, one pixel per
 * lattice cell, and inside the lens every cell is examined: cells sitting on an
 * alpha discontinuity are his contours and are struck in white, while cells
 * inside the silhouette are lit gold only where a sweep band is currently
 * passing. What surfaces is his own outline, scanned. The video layer is masked
 * transparent over the same disc, so the readout stands in for him rather than
 * covering him.
 *
 * The downscale is what makes it cheap. `drawImage` into a tiny canvas lets the
 * GPU do the box-filtering, so one `getImageData` of a few thousand pixels
 * replaces per-pixel work in JS. The loop only runs while the pointer is
 * engaged, and only cells within the lens are ever visited.
 *
 * Playback is never touched — the sampler holds a read-only reference and
 * `drawImage` does not disturb the element's clock.
 */
export default function SensorSweep({
  videoRef,
}: {
  /** The lion clip to sample. Null until the video mounts, or on the still. */
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("services.items");
  const [active, setActive] = useState(false);
  const [locked, setLocked] = useState<Locked[]>([]);
  const hotspotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pointer position in stage space. A ref, not state — the render loop reads
  // it every frame and must not drag React through a re-render to do so.
  const pointer = useRef({ x: -9999, y: -9999 });
  const activeRef = useRef(false);

  /*
   * The readouts currently on screen, mirrored outside React.
   *
   * The loop runs at 60fps but the *set* of locked services changes only when
   * the pointer crosses an anchor. Diffing against this ref means `setLocked`
   * fires on those crossings alone, so the DOM layer re-renders a handful of
   * times per sweep instead of sixty times a second.
   */
  const lockedRef = useRef<Locked[]>([]);

  useEffect(() => {
    if (reduceMotion) return;

    const hotspot = hotspotRef.current;
    const canvas = canvasRef.current;
    const stage = hotspot?.parentElement;
    if (!hotspot || !canvas || !stage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sampling buffer: one pixel per lattice cell.
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;

    let frame = 0;
    let dpr = 1;

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      if (!activeRef.current) return;

      const video = videoRef.current;
      // readyState < 2 means no frame is decoded yet — nothing to sample.
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      // Where the video actually sits inside the stage, after object-contain.
      const stageRect = stage.getBoundingClientRect();
      const vidRect = video.getBoundingClientRect();
      const left = vidRect.left - stageRect.left;
      const top = vidRect.top - stageRect.top;

      const cols = Math.max(1, Math.ceil(vidRect.width / SAMPLE_GRID));
      const rows = Math.max(1, Math.ceil(vidRect.height / SAMPLE_GRID));
      if (sampler.width !== cols || sampler.height !== rows) {
        sampler.width = cols;
        sampler.height = rows;
      }

      /*
       * `object-contain` letterboxes the frame inside the element, so the
       * source rect has to be the contained box — otherwise the scan drifts
       * away from the lion at aspect ratios that do not match.
       */
      const scale = Math.min(
        vidRect.width / video.videoWidth,
        vidRect.height / video.videoHeight,
      );
      const drawW = video.videoWidth * scale;
      const drawH = video.videoHeight * scale;
      const offX = ((vidRect.width - drawW) / 2 / vidRect.width) * cols;
      const offY = ((vidRect.height - drawH) / 2 / vidRect.height) * rows;

      sctx.clearRect(0, 0, cols, rows);
      try {
        sctx.drawImage(
          video,
          offX,
          offY,
          (drawW / vidRect.width) * cols,
          (drawH / vidRect.height) * rows,
        );
      } catch {
        return; // Frame not sampleable this tick; try again next one.
      }

      const { data } = sctx.getImageData(0, 0, cols, rows);
      const { x: px, y: py } = pointer.current;
      const inner = REVEAL_RADIUS * FALLOFF_START;

      // Only the lattice cells inside the lens are worth visiting.
      const c0 = Math.max(0, Math.floor((px - REVEAL_RADIUS - left) / SAMPLE_GRID));
      const c1 = Math.min(cols, Math.ceil((px + REVEAL_RADIUS - left) / SAMPLE_GRID));
      const r0 = Math.max(0, Math.floor((py - REVEAL_RADIUS - top) / SAMPLE_GRID));
      const r1 = Math.min(rows, Math.ceil((py + REVEAL_RADIUS - top) / SAMPLE_GRID));

      /*
       * Two bands travelling down the lens, half a period apart, so there is
       * always light somewhere in the body and the sweep never reads as dead.
       */
      const phase = (now / 1000 / SWEEP_PERIOD) % 1;
      const bandY = [phase, (phase + 0.5) % 1].map(
        (p) => py - REVEAL_RADIUS + p * REVEAL_RADIUS * 2,
      );
      const bandWidth = REVEAL_RADIUS * 0.22;

      const alphaAt = (gx: number, gy: number) =>
        gx < 0 || gy < 0 || gx >= cols || gy >= rows
          ? 0
          : data[(gy * cols + gx) * 4 + 3] / 255;

      for (let gy = r0; gy < r1; gy++) {
        const cy = top + gy * SAMPLE_GRID + SAMPLE_GRID / 2;
        for (let gx = c0; gx < c1; gx++) {
          const cx = left + gx * SAMPLE_GRID + SAMPLE_GRID / 2;

          const dx = cx - px;
          const dy = cy - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > REVEAL_RADIUS) continue;

          const alpha = alphaAt(gx, gy);
          if (alpha < 0.06) continue; // Outside the lion's silhouette.

          // Feather the lens edge so the readout has no hard rim.
          const falloff =
            dist <= inner ? 1 : 1 - (dist - inner) / (REVEAL_RADIUS - inner);

          /*
           * Contour detection. The largest alpha step to a neighbour is how
           * sharply the silhouette turns here, which is exactly what a
           * wireframe wants to trace: the outline and the internal folds of
           * the mane light up, flat interior does not.
           */
          const edge = Math.max(
            Math.abs(alpha - alphaAt(gx - 1, gy)),
            Math.abs(alpha - alphaAt(gx + 1, gy)),
            Math.abs(alpha - alphaAt(gx, gy - 1)),
            Math.abs(alpha - alphaAt(gx, gy + 1)),
          );

          if (edge > EDGE_THRESHOLD) {
            // Structure: struck in white, weighted by how hard the edge turns.
            const strength = Math.min(1, (edge - EDGE_THRESHOLD) * 2.4);
            ctx.fillStyle = `rgba(${SCAN_COOL}, ${strength * falloff * 0.95})`;
            ctx.fillRect(
              cx - SAMPLE_GRID * 0.28,
              cy - SAMPLE_GRID * 0.28,
              SAMPLE_GRID * 0.56,
              SAMPLE_GRID * 0.56,
            );
            continue;
          }

          /*
           * Interior: gold, and only under a passing band. Away from the
           * bands the body stays open, so the lens reads as *scanning* him
           * rather than as a solid patch pasted over him.
           */
          const band = Math.min(
            Math.abs(cy - bandY[0]),
            Math.abs(cy - bandY[1]),
          );
          if (band > bandWidth) continue;

          const heat = (1 - band / bandWidth) ** 2;
          const luma =
            (0.299 * data[(gy * cols + gx) * 4] +
              0.587 * data[(gy * cols + gx) * 4 + 1] +
              0.114 * data[(gy * cols + gx) * 4 + 2]) /
            255;
          const opacity = heat * falloff * alpha * (0.25 + 0.75 * luma) * 0.8;
          if (opacity < 0.03) continue;

          ctx.fillStyle = `rgba(${SCAN_GOLD}, ${opacity})`;
          ctx.fillRect(cx - 1, cy - 1, 2, 2);
        }
      }

      /* ---- readout selection ---------------------------------------------- */

      const near = ANCHORS.map((anchor) => {
        const ax = left + anchor.x * vidRect.width;
        const ay = top + anchor.y * vidRect.height;
        return {
          service: anchor.service,
          x: ax,
          y: ay,
          dist: Math.hypot(ax - px, ay - py),
        };
      })
        .filter((anchor) => anchor.dist < REVEAL_RADIUS * 0.92)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, MAX_LOCKED)
        .map(({ service, x, y }) => ({ service, x, y }));

      const changed =
        near.length !== lockedRef.current.length ||
        near.some((anchor, i) => {
          const prev = lockedRef.current[i];
          return (
            anchor.service !== prev.service ||
            Math.abs(anchor.x - prev.x) > 1 ||
            Math.abs(anchor.y - prev.y) > 1
          );
        });

      if (changed) {
        lockedRef.current = near;
        setLocked(near);
      }
    };
    frame = requestAnimationFrame(draw);

    /* ---- pointer plumbing ------------------------------------------------ */

    const place = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      pointer.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      // The lion's hole reads these; the canvas reads the ref above.
      stage.style.setProperty("--mx", `${pointer.current.x}px`);
      stage.style.setProperty("--my", `${pointer.current.y}px`);
    };

    const open = (on: boolean) => {
      activeRef.current = on;
      stage.style.setProperty("--hole-r", on ? `${REVEAL_RADIUS}px` : "0px");
      setActive(on);
      if (!on) {
        lockedRef.current = [];
        setLocked([]);
      }
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      place(event);
      open(true);
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      open(false);
    };
    const onMove = (event: PointerEvent) => place(event);
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      place(event);
      open(true);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      open(false);
    };

    hotspot.addEventListener("pointerenter", onEnter);
    hotspot.addEventListener("pointerleave", onLeave);
    hotspot.addEventListener("pointermove", onMove);
    hotspot.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      hotspot.removeEventListener("pointerenter", onEnter);
      hotspot.removeEventListener("pointerleave", onLeave);
      hotspot.removeEventListener("pointermove", onMove);
      hotspot.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // Never leave the lion stuck open.
      stage.style.setProperty("--hole-r", "0px");
    };
  }, [reduceMotion, videoRef]);

  /*
   * Reduced motion: no scan and no frame loop — just a soft gold wash that
   * fades with pointer presence.
   */
  if (reduceMotion) {
    return (
      <div
        ref={hotspotRef}
        aria-hidden
        className="absolute top-1/2 left-1/2 z-20 aspect-square w-[92%] max-w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            opacity: active ? 1 : 0,
            transition: "opacity 500ms ease-out",
            background:
              "radial-gradient(circle at center, rgba(239,204,110,0.16) 0%, rgba(197,156,64,0.08) 45%, transparent 72%)",
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/*
       * Circular sensor matching the ring — border-radius participates in
       * hit-testing, so the target is genuinely round, not a square box.
       */}
      <div
        ref={hotspotRef}
        aria-hidden
        className="absolute top-1/2 left-1/2 z-20 aspect-square w-[92%] max-w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ touchAction: "manipulation" }}
      />

      {/* The scanned lion. Sits just above the video it is standing in for. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[15]"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />

      {/* A whisper of light so the lens reads as an instrument. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[14]"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 520ms ease-out",
          background: `radial-gradient(circle ${REVEAL_RADIUS * 1.05}px at var(--mx, -999px) var(--my, -999px), rgba(${SCAN_COOL},0.07) 0%, rgba(197,156,64,0.06) 45%, transparent 72%)`,
        }}
      />

      {/*
       * Tracking readouts. DOM rather than canvas on purpose: the icons are the
       * site's own `ServiceIcon` set and the labels are translated strings, so
       * they stay in the one place where locale, direction and stroke weight
       * are already handled.
       */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[16]">
        {locked.map((lock) => (
          <div
            key={lock.service}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: lock.x,
              top: lock.y,
              animation: "sensor-lock 240ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <Bracket />
            {/* Label rides outside the bracket so it never sits on the art. */}
            <div className="absolute top-1/2 left-[calc(100%+0.5rem)] flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap">
              {/* White, matching the wireframe it annotates — the icon set
                  strokes with `currentColor`, so the colour is set here. */}
              <span style={{ color: `rgb(${SCAN_COOL})` }}>
                <ServiceIcon
                  name={lock.service}
                  className="h-3.5 w-3.5 shrink-0"
                />
              </span>
              <span
                className="max-w-[9rem] truncate text-[0.6rem] tracking-[0.18em] uppercase"
                style={{ color: `rgba(${SCAN_COOL}, 0.85)` }}
              >
                {t(`${lock.service}.title`)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Four corner ticks — the classic acquisition frame, drawn once. */
function Bracket() {
  const corner = "absolute h-2.5 w-2.5 border-current";
  return (
    <div
      className="relative h-11 w-11"
      style={{ color: `rgba(${SCAN_COOL}, 0.9)` }}
    >
      <span className={`${corner} top-0 left-0 border-t border-l`} />
      <span className={`${corner} top-0 right-0 border-t border-r`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} right-0 bottom-0 border-r border-b`} />
    </div>
  );
}
