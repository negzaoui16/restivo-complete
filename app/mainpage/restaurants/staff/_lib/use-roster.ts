"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/auth/client";
import { apiChangeRole, apiGetRoster, apiReviewRequest } from "@/lib/staff/roster-client";
import type { RestaurantRoster, RosterReview } from "@/lib/staff/types";

const EMPTY: RestaurantRoster = { members: [], requests: [] };

export function useRestaurantRoster(restaurantId: string | undefined) {
  const { isReady, getAccessToken } = useAuth();
  const [roster, setRoster] = useState<RestaurantRoster>(EMPTY);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const loaded = Boolean(restaurantId) && loadedFor === restaurantId;

  useEffect(() => {
    if (!isReady || !restaurantId) return;
    let cancelled = false;
    const id = restaurantId;

    Promise.resolve()
      .then(() => {
        const token = getAccessToken();
        if (!token) throw new Error("Sign in again to manage staff.");
        return apiGetRoster(token, id);
      })
      .then((next) => {
        if (cancelled) return;
        setRoster(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(messageOf(err));
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(id);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, restaurantId, getAccessToken]);

  const review = useCallback(
    async (requestId: string, decision: "ACCEPT" | "DECLINE") => {
      if (!restaurantId || pendingId) return;
      const token = getAccessToken();
      if (!token) {
        setError("Sign in again to manage staff.");
        return;
      }

      setPendingId(requestId);
      setError(null);
      try {
        const result = await apiReviewRequest(token, restaurantId, requestId, decision);
        setRoster((current) => applyReview(current, result));
      } catch (err) {
        setError(messageOf(err));
      } finally {
        setPendingId(null);
      }
    },
    [getAccessToken, pendingId, restaurantId]
  );

  const changeRole = useCallback(
    async (membershipId: string, role: "MANAGER" | "STAFF") => {
      if (!restaurantId || pendingId) return;
      const token = getAccessToken();
      if (!token) {
        setError("Sign in again to manage staff.");
        return;
      }

      setPendingId(membershipId);
      setError(null);
      try {
        const member = await apiChangeRole(token, restaurantId, membershipId, role);
        setRoster((current) => ({
          ...current,
          members: current.members.map((entry) => (entry.id === member.id ? member : entry)),
        }));
      } catch (err) {
        setError(messageOf(err));
      } finally {
        setPendingId(null);
      }
    },
    [getAccessToken, pendingId, restaurantId]
  );

  return {
    members: loaded ? roster.members : [],
    requests: loaded ? roster.requests : [],
    loaded,
    error,
    pendingId,
    accept: (requestId: string) => review(requestId, "ACCEPT"),
    decline: (requestId: string) => review(requestId, "DECLINE"),
    changeRole,
  };
}

function applyReview(current: RestaurantRoster, review: RosterReview): RestaurantRoster {
  return {
    members: review.member
      ? [review.member, ...current.members.filter((member) => member.userId !== review.member?.userId)].sort(
          (a, b) => a.name.localeCompare(b.name)
        )
      : current.members,
    requests: current.requests.filter((request) => request.id !== review.requestId),
  };
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Could not update staff.";
}
