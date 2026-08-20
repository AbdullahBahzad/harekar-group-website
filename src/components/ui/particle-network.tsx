"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

/**
 * Brand palette, mirroring the tokens in globals.css. Canvas needs concrete
 * colour strings, so these are kept in sync by hand rather than read per frame.
 */
const GOLD = "197, 156, 64";
const GOLD_BRIGHT = "239, 204, 110";

/** Pixels within which two particles are joined by a line. */
const LINK_DISTANCE = 132;

/** Cursor influence radius, in pixels. */
const MOUSE_RADIUS = 130;

/** One particle per N square pixels, then clamped by MAX_PARTICLES. */
const AREA_PER_PARTICLE = 9000;
const MAX_PARTICLES = 150;

type Particle = {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
};

/**
 * An interactive constellation of drifting points that link to their
 * neighbours and scatter away from the cursor.
 *
 * Sized to its parent rather than the window, painted on a transparent canvas
 * so whatever sits behind it still shows through, and paused whenever it is
 * scrolled out of view. `pointer-events-none` keeps every control underneath
 * it clickable.
 */
export default function ParticleNetwork({
  className,
  ...props
}: HTMLAttributes<HTMLCanvasElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frameId = 0;
    let visible = true;
    const mouse = { x: null as number | null, y: null as number | null };

    function seed() {
      const count = Math.min(
        Math.floor((width * height) / AREA_PER_PARTICLE),
        MAX_PARTICLES,
      );
      particles = Array.from({ length: count }, () => {
        const size = Math.random() * 1.6 + 0.9;
        return {
          size,
          x: Math.random() * (width - size * 4) + size * 2,
          y: Math.random() * (height - size * 4) + size * 2,
          directionX: Math.random() * 0.4 - 0.2,
          directionY: Math.random() * 0.4 - 0.2,
        };
      });
    }

    function resize() {
      const rect = parent!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      // Back the canvas with device pixels so the dots stay crisp.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function drawParticle(p: Particle) {
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${GOLD}, 0.75)`;
      ctx!.fill();
    }

    function update(p: Particle) {
      // Bounce off the edges of the field.
      if (p.x > width || p.x < 0) p.directionX = -p.directionX;
      if (p.y > height || p.y < 0) p.directionY = -p.directionY;

      // Scatter away from the cursor.
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.hypot(dx, dy);
        if (distance < MOUSE_RADIUS + p.size && distance > 0) {
          const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
          p.x -= (dx / distance) * force * 5;
          p.y -= (dy / distance) * force * 5;
        }
      }

      p.x += p.directionX;
      p.y += p.directionY;
      drawParticle(p);
    }

    function connect() {
      const maxSq = LINK_DISTANCE * LINK_DISTANCE;

      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= maxSq) continue;

          // Fade with distance. Clamped, so the alpha can never go negative.
          const opacity = 1 - distSq / maxSq;

          // Links near the cursor catch the brighter champagne tone.
          let near = false;
          if (mouse.x !== null && mouse.y !== null) {
            const mdx = particles[a].x - mouse.x;
            const mdy = particles[a].y - mouse.y;
            near = mdx * mdx + mdy * mdy < MOUSE_RADIUS * MOUSE_RADIUS;
          }

          ctx!.strokeStyle = near
            ? `rgba(${GOLD_BRIGHT}, ${opacity * 0.85})`
            : `rgba(${GOLD}, ${opacity * 0.4})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(particles[a].x, particles[a].y);
          ctx!.lineTo(particles[b].x, particles[b].y);
          ctx!.stroke();
        }
      }
    }

    function render() {
      // Transparent clear, so the section behind stays visible.
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) update(p);
      connect();
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      if (visible) render();
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    }

    function handlePointerLeave() {
      mouse.x = null;
      mouse.y = null;
    }

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    // Idle off-screen rather than burning frames far down the page.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { rootMargin: "120px" },
    );
    io.observe(parent);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    if (reduceMotion) {
      // A single settled frame: the texture, none of the movement.
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) drawParticle(p);
      connect();
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      {...props}
    />
  );
}
