"use client";

import { useCallback, useState } from "react";
import { CalendarX, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiManagerReservations, apiSetReservationStatus } from "@/lib/manager/client";
import type { ManagerReservation } from "@/lib/manager/types";
import { formatSlotTime } from "@/lib/reservations/format";
import type { ManagedReservationStatus } from "@/lib/reservations/transitions";
import { useManagerQuery } from "../../_lib/use-manager-query";
import { ORDER_LABEL, RESERVATION_ACTION_LABEL, RESERVATION_LABEL } from "../../_lib/status";
import { ActionButtons } from "./ActionButtons";
import { DateControl, FilterChips } from "./DateControl";
import { StatusBadge } from "./StatusBadge";

type Filter = "all" | "upcoming" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "SEATED", label: "Seated" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
];

const statusesOf = (filter: Filter): string[] | undefined =>
  filter === "all" ? undefined : filter === "upcoming" ? ["PENDING", "CONFIRMED"] : [filter];

export function ReservationsBoard({ restaurantId }: { restaurantId: string }) {
  const { getFreshAccessToken } = useAuth();
  const [date, setDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const fetcher = useCallback(
    (token: string) => apiManagerReservations(token, restaurantId, { date: date ?? undefined, status: statusesOf(filter) }),
    [restaurantId, date, filter],
  );
  const { data, error, loading, refresh } = useManagerQuery(fetcher);

  async function change(item: ManagerReservation, status: ManagedReservationStatus) {
    setBusyId(item.id);
    setProblem(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      await apiSetReservationStatus(token, restaurantId, item.id, status);
      refresh();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not update the reservation.");
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {data ? <DateControl date={data.from} isToday={date === null} onChange={setDate} /> : <span />}
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {problem && (
        <p role="alert" className="rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-3 py-2 text-xs font-semibold text-[#B55234]">
          {problem}
        </p>
      )}
      {error && !data && (
        <div role="alert" className="rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-4 py-3 text-sm text-[#B55234]">
          {error}{" "}
          <button type="button" onClick={refresh} className="font-bold underline">
            Try again
          </button>
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-[#736D65]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading reservations...
        </div>
      )}

      {data && data.reservations.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center">
          <CalendarX className="mb-2 h-8 w-8 text-[#A39C91]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[#1A1A1A]">No reservations</p>
          <p className="mt-1 text-xs text-[#736D65]">Nothing matches this day and filter.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {data?.reservations.map((item) => {
          const openOrders = item.orders.filter((order) => order.status !== "CANCELLED").length;
          return (
            <li key={item.id} className="rounded-2xl border border-[#EDE7DC] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-[#1A1A1A]">
                    {formatSlotTime(item.startsAt, data.timezone)}
                    <span className="ml-2 text-sm font-semibold text-[#2E2A25]">{item.customer.name}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-[#736D65]">
                    <span>{item.table.name}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {item.guestCount}
                    </span>
                    <span className="font-mono">{item.code}</span>
                  </p>
                </div>
                <StatusBadge status={item.status} label={RESERVATION_LABEL[item.status]} />
              </div>

              {item.notes && <p className="mt-2 text-xs italic text-[#736D65]">&ldquo;{item.notes}&rdquo;</p>}

              {item.orders.length > 0 && (
                <div className="mt-3 rounded-xl bg-[#FAF7F2] px-3 py-2">
                  <p className="text-xs font-semibold text-[#1A1A1A]">
                    Pre-order{item.orders.length > 1 ? "s" : ""}: {item.ordersTotal} {data.currency}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {item.orders.map((order) => (
                      <StatusBadge key={order.id} status={order.status} label={`${ORDER_LABEL[order.status]} · ${order.total}`} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <ActionButtons
                  actions={item.actions.map((status) => ({ status, label: RESERVATION_ACTION_LABEL[status] ?? status }))}
                  busy={busyId === item.id}
                  confirmText={(status) =>
                    status === "CANCELLED"
                      ? `Cancel the reservation of ${item.customer.name}? ${
                          openOrders > 0 ? "Its pending pre-orders will be cancelled too. " : ""
                        }The customer will be notified.`
                      : `Mark ${item.customer.name} as a no-show? The table is freed and the customer will be notified.`
                  }
                  onRun={(status) => void change(item, status as ManagedReservationStatus)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
