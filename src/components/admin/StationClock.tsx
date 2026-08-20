"use client";

import { useEffect, useState } from "react";

/**
 * Live UTC readout for the console header.
 *
 * UTC rather than local time on purpose: an operations log that mixes Baghdad
 * time with a reader's own timezone is a log you cannot correlate. Zulu is
 * what the rest of the field uses.
 *
 * It renders an em-dash placeholder until mounted. Printing a real clock on
 * the server guarantees a hydration mismatch, because the second it renders is
 * never the second the browser hydrates.
 */
export default function StationClock() {
  const [stamp, setStamp] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, "0");
      const mm = String(now.getUTCMinutes()).padStart(2, "0");
      const ss = String(now.getUTCSeconds()).padStart(2, "0");
      setStamp(`${hh}:${mm}:${ss}Z`);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className="text-gold/80 font-mono text-xs tracking-[0.18em] tabular-nums"
      // The clock changes every second; announcing it would make a screen
      // reader unusable.
      aria-hidden
    >
      {stamp ?? "--:--:--Z"}
    </span>
  );
}
