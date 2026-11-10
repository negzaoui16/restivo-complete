"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiLiveState } from "@/lib/live/client";

const PULSE_MS = 60_000;

/**
 * Alerts are written when the live state is read. This reads it once a minute while a manager
 * is anywhere in the restaurant area, so alerts reach the bell without the Live floor page being
 * open. The Live floor page reads it itself, so it is skipped there. Renders nothing.
 */
export function LiveAlertsPulse({ restaurantId }: { restaurantId: string | null }) {
  const { getFreshAccessToken } = useAuth();
  const onLivePage = usePathname().endsWith("/live");

  useEffect(() => {
    if (!restaurantId || onLivePage) return undefined;
    const id = restaurantId;
    let cancelled = false;
    async function pulse() {
      if (document.hidden) return;
      try {
        const token = await getFreshAccessToken();
        if (token && !cancelled) await apiLiveState(token, id);
      } catch {
        // The bell and the pages show their own errors; a missed pulse is retried a minute later.
      }
    }
    void pulse();
    const timer = window.setInterval(() => void pulse(), PULSE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [restaurantId, onLivePage, getFreshAccessToken]);

  return null;
}
