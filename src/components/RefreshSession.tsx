"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Pulls fresh entitlement into the session, once, on mount.
 *
 * Without this a customer who has just paid keeps the token they signed in
 * with, which still says Standard — so the product they were charged for stays
 * locked until the session expires. Rendered on the payment result page, it
 * makes the purchase take effect immediately.
 *
 * The ref guard matters: `update()` changes the session, which re-renders this
 * component, which would call `update()` again. React Strict Mode also mounts
 * effects twice in development. Both paths are stopped here.
 */
export default function RefreshSession() {
  const { update } = useSession();
  const refreshed = useRef(false);

  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    void update();
  }, [update]);

  return null;
}
