"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { ServiceBoard } from "../_lib/use-service-board";
import { matchesQuery, ticketNumber } from "../_lib/board";
import { AttentionRow } from "./AttentionRow";
import { LiveOrderCard } from "./LiveOrderCard";
import { OrdersBoard } from "./OrdersBoard";
import { SummaryStrip } from "./SummaryStrip";
import { TodayReservations } from "./TodayReservations";

export function Overview({
  greeting,
  dateLabel,
  board,
  query,
}: {
  greeting: string;
  dateLabel: string;
  board: ServiceBoard;
  query: string;
}) {
  const { user, isReady } = useAuth();
  const name = user?.firstName || user?.displayName;
  const timezone = board.reservations?.timezone ?? "UTC";
  const allReservations = board.reservations?.reservations ?? [];
  const allOrders = board.orders?.orders ?? [];

  const orders = allOrders.filter((order) =>
    matchesQuery(`${ticketNumber(order.id)} ${order.reservation?.tableName ?? ""} ${order.customerName}`, query),
  );
  const reservations = allReservations.filter((row) => matchesQuery(`${row.customerName} ${row.tableName}`, query));
  const preparing = orders.find((order) => order.status === "PREPARING");
  const ready = orders.find((order) => order.status === "READY");
  const arriving = reservations.find((row) => row.status === "CONFIRMED" || row.status === "PENDING");

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-[28px]">
              {greeting}
              {isReady && name ? `, ${name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-[#736D65]">Here&apos;s what needs your attention today.</p>
          </div>
          <p className="rounded-full border border-[#E8E2D7] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6B665E]">
            {dateLabel}
          </p>
        </header>
        <SummaryStrip reservations={allReservations} orders={allOrders} />
        <AttentionRow
          preparing={preparing}
          ready={ready}
          arriving={arriving}
          timezone={timezone}
          nowMs={board.nowMs}
          busyId={board.busyId}
          onMoveOrder={board.moveOrder}
        />
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-[#EDE7DC] bg-white px-4 py-8 text-sm text-[#8C877D]">
            {query ? "No orders match that search." : "No orders to prepare today."}
          </p>
        ) : (
          <OrdersBoard orders={orders} nowMs={board.nowMs} busyId={board.busyId} onMove={board.moveOrder} />
        )}
      </div>
      <aside className="flex flex-col gap-4">
        <LiveOrderCard order={preparing ?? orders[0]} nowMs={board.nowMs} />
        <TodayReservations rows={reservations} timezone={timezone} busyId={board.busyId} onMove={board.moveReservation} />
      </aside>
    </div>
  );
}
