"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/auth/client";
import { apiCreateJoinRequest, apiGetJoinBoard } from "@/lib/staff/client";
import type { JoinBoard } from "@/lib/staff/types";
import { useAuth } from "@/contexts/AuthContext";

export function useJoinBoard() {
  const { isReady, getAccessToken } = useAuth();
  const [board, setBoard] = useState<JoinBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    const token = getAccessToken();
    if (!token) return;

    let cancelled = false;
    apiGetJoinBoard(token)
      .then((next) => {
        if (!cancelled) setBoard(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load restaurants.");
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, getAccessToken]);

  const send = useCallback(
    async (restaurantId: string, message: string) => {
      const token = getAccessToken();
      if (!token) {
        setError("Your session expired. Sign in again.");
        return false;
      }

      setSendingId(restaurantId);
      setError(null);
      try {
        const request = await apiCreateJoinRequest(token, {
          restaurantId,
          message: message.trim() || undefined,
        });
        setBoard((current) =>
          current ? { ...current, requests: [request, ...current.requests.filter((row) => row.restaurantId !== restaurantId)] } : current
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not send the request.");
        return false;
      } finally {
        setSendingId(null);
      }
      return true;
    },
    [getAccessToken]
  );

  const signedOut = isReady && !getAccessToken();

  return {
    board,
    error: error ?? (signedOut ? "Your session expired. Sign in again." : null),
    sendingId,
    send,
    loaded: board !== null || error !== null || signedOut,
  };
}
