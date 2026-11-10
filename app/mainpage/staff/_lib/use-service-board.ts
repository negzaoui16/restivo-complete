"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerQuery } from "@/app/mainpage/restaurants/_lib/use-manager-query";
import { apiStaffOrders, apiStaffReservations, apiStaffSetOrder, apiStaffSetReservation } from "@/lib/staff/board-client";
import type { StaffOrderTarget, StaffReservationTarget } from "@/lib/staff/service-rules";

const POLL_MS = 20_000;

/** Today's reservations and kitchen orders of one restaurant, refreshed on a timer. */
export function useServiceBoard(restaurantId: string) {
  const { getFreshAccessToken } = useAuth();
  const reservationsFetcher = useCallback((token: string) => apiStaffReservations(token, restaurantId), [restaurantId]);
  const ordersFetcher = useCallback((token: string) => apiStaffOrders(token, restaurantId), [restaurantId]);
  const reservations = useManagerQuery(reservationsFetcher, POLL_MS);
  const orders = useManagerQuery(ordersFetcher, POLL_MS);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshAll = useCallback(() => {
    reservations.refresh();
    orders.refresh();
  }, [reservations, orders]);

  async function run(id: string, action: (token: string) => Promise<unknown>) {
    setBusyId(id);
    setProblem(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      await action(token);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusyId(null);
      refreshAll();
    }
  }

  const moveReservation = (id: string, status: StaffReservationTarget) =>
    run(id, (token) => apiStaffSetReservation(token, restaurantId, id, status));
  const moveOrder = (id: string, status: StaffOrderTarget) =>
    run(id, (token) => apiStaffSetOrder(token, restaurantId, id, status));

  return {
    reservations: reservations.data,
    orders: orders.data,
    loading: reservations.loading || orders.loading,
    error: reservations.error ?? orders.error,
    busyId,
    problem,
    nowMs,
    refresh: refreshAll,
    moveReservation,
    moveOrder,
  };
}

export type ServiceBoard = ReturnType<typeof useServiceBoard>;
