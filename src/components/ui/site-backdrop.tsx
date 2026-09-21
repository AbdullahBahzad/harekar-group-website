"use client";

import { useEffect, useRef } from "react";
import styles from "./site-backdrop.module.css";

/**
 * The page's background: fine gold specks rising slowly through the dark, each
 * swaying a little and twinkling.
 *
 * Fixed to the viewport so it fills the screen at every scroll position, sits
 * behind the sections, and never takes a click. Deliberately faint — it should
 * give the page some air, not compete with what is on top of it. There are no
 * lines between the specks: linked dots are the drifting constellation on the
 * map section, and this is a different effect.
 */
export function SiteBackdrop() {
  return (
    <div aria-hidden="true" className={styles.root}>
      <Dust />
    </div>
  );
}

type Mote = {
  x: number;
  y: number;
  radius: number;
  /** Rise speed, pixels per second. */
  rise: number;
  /** Sideways sway: amplitude in px, and phase. */
  sway: number;
  phase: number;
  alpha: number;
};

/**
 * One canvas and one loop, paused while the tab is hidden, and drawn once and
 * left still for visitors who have asked for reduced motion.
 */
function Dust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let motes: Mote[] = [];
    let frame = 0;
    let last = 0;

    function seed() {
      const count = Math.min(
        120,
        Math.max(46, Math.floor((width * height) / 15000)),
      );
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.7 + 0.7,
        rise: Math.random() * 16 + 6,
        sway: Math.random() * 18 + 6,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.5 + 0.4,
      }));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      draw(0);
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      for (const m of motes) {
        const twinkle = 0.55 + 0.45 * Math.sin(time * 0.0009 + m.phase * 3);
        const x = m.x + Math.sin(time * 0.0004 + m.phase) * m.sway;
        ctx!.beginPath();
        ctx!.arc(x, m.y, m.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(242, 210, 125, ${(m.alpha * twinkle).toFixed(3)})`;
        ctx!.fill();
      }
    }

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      for (const m of motes) {
        m.y -= m.rise * dt;
        // Leaves off the top, comes back in at the bottom.
        if (m.y < -4) {
          m.y = height + 4;
          m.x = Math.random() * width;
        }
      }
      draw(now);
      frame = requestAnimationFrame(tick);
    }

    function onVisibility() {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden && !reduceMotion) frame = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduceMotion) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
