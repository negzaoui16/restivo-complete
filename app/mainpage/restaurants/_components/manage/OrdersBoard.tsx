"use client";

import { useCallback, useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiManagerOrders, apiSetOrderStatus } from "@/lib/manager/client";
import type { ManagerOrder } from "@/lib/manager/types";
import { formatSlotTime } from "@/lib/reservations/format";
import type { ManagedOrderStatus } from "@/lib/orders/transitions";
import { useManagerQuery } from "../../_lib/use-manager-query";
import { ORDER_ACTION_LABEL, ORDER_LABEL, RESERVATION_LABEL } from "../../_lib/status";
import { ActionButtons } from "./ActionButtons";
import { DateControl, FilterChips } from "./DateControl";
import { StatusBadge } from "./StatusBadge";

type Filter = "open" | "all" | "DELIVERED" | "CANCELLED";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "To process" },
  { value: "all", label: "All" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function OrdersBoard({ restaurantId }: { restaurantId: string }) {
  const { getFreshAccessToken } = useAuth();
  const [date, setDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // "To process" lists every open order whatever its day; the other filters follow the date.
  const fetcher = useCallback(
    (token: string) =>
      filter === "open"
        ? apiManagerOrders(token, restaurantId, { status: ["PENDING", "CONFIRMED", "PREPARING", "READY"] })
        : apiManagerOrders(token, restaurantId, {
            date: date ?? "today",
            status: filter === "all" ? undefined : [filter],
          }),
    [restaurantId, date, filter],
  );
  const { data, error, loading, refresh } = useManagerQuery(fetcher);

  async function change(item: ManagerOrder, status: ManagedOrderStatus) {
    setBusyId(item.id);
    setProblem(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      await apiSetOrderStatus(token, restaurantId, item.id, status);
      refresh();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not update the order.");
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {filter !== "open" ? (
          data?.date ? <DateControl date={data.date} isToday={date === null} onChange={setDate} /> : <span />
        ) : (
          <p className="text-xs text-[#736D65]">Open orders of every day, oldest first.</p>
        )}
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
          Loading orders...
        </div>
      )}

      {data && data.orders.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center">
          <ShoppingBag className="mb-2 h-8 w-8 text-[#A39C91]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[#1A1A1A]">No orders</p>
          <p className="mt-1 text-xs text-[#736D65]">Nothing matches this filter.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {data?.orders.map((order) => (
          <li key={order.id} className="rounded-2xl border border-[#EDE7DC] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">
                  {order.reservation ? order.reservation.tableName : "No table"}
                  <span className="ml-2 font-semibold text-[#2E2A25]">{order.customer.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-[#736D65]">
                  {order.reservation
                    ? `Reservation ${order.reservation.code} at ${formatSlotTime(order.reservation.startsAt, data.timezone)} (${RESERVATION_LABEL[order.reservation.status].toLowerCase()})`
                    : "Walk-in order"}
                </p>
              </div>
              <StatusBadge status={order.status} label={ORDER_LABEL[order.status]} />
            </div>

            <ul className="mt-3 divide-y divide-[#F4EFEB] text-xs">
              {order.items.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 py-1.5">
                  <span>
                    {line.quantity} x {line.name}
                    {line.notes ? <span className="text-[#A39C91]"> ({line.notes})</span> : null}
                  </span>
                  <span className="text-[#736D65]">{line.unitPrice}</span>
                </li>
              ))}
            </ul>
            {order.notes && <p className="mt-2 text-xs italic text-[#736D65]">&ldquo;{order.notes}&rdquo;</p>}
            <p className="mt-2 text-right text-xs text-[#736D65]">
              {Number(order.discount) > 0 ? (
                <>
                  Subtotal {order.subtotal} - discount {order.discount}{" "}
                </>
              ) : null}
              <span className="text-sm font-bold text-[#1A1A1A]">
                {order.total} {order.currency}
              </span>
            </p>

            <div className="mt-3">
              <ActionButtons
                actions={order.actions.map((status) => ({ status, label: ORDER_ACTION_LABEL[status] ?? status }))}
                busy={busyId === order.id}
                confirmText={() => `Cancel this order for ${order.customer.name}? The customer will be notified.`}
                onRun={(status) => void change(order, status as ManagedOrderStatus)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
