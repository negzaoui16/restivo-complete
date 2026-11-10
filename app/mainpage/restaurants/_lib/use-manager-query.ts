"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Fetcher<T> = (token: string) => Promise<T>;
type Result<T> = { source: unknown; data: T | null; error: string | null };

/**
 * Loads manager data with the signed-in token and refreshes it on a timer
 * (paused while the tab is hidden). Pass a memoized `fetcher`; a new fetcher
 * means a new query, and `null` keeps the hook idle.
 */
export function useManagerQuery<T>(fetcher: Fetcher<T> | null, intervalMs = 30_000) {
  const { getFreshAccessToken } = useAuth();
  const [result, setResult] = useState<Result<T>>({ source: null, data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!fetcher) return undefined;
    const load = fetcher;
    let cancelled = false;

    async function run() {
      try {
        const token = await getFreshAccessToken();
        if (!token) throw new Error("Your session expired. Sign in again.");
        const data = await load(token);
        if (!cancelled) setResult({ source: load, data, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load the data.";
        if (!cancelled) setResult((prev) => ({ source: load, data: prev.source === load ? prev.data : null, error: message }));
      }
    }

    void run();
    const timer = window.setInterval(() => {
      if (!document.hidden) void run();
    }, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetcher, getFreshAccessToken, intervalMs, tick]);

  const current = result.source === fetcher;
  const refresh = useCallback(() => setTick((value) => value + 1), []);
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: fetcher !== null && !current,
    refresh,
  };
}
