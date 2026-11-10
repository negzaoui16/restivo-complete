"use client";

import { Loader2 } from "lucide-react";
import { useServiceBoard } from "../_lib/use-service-board";
import { matchesQuery, ticketNumber } from "../_lib/board";
import { useStaffChrome } from "../_context/staff-chrome";
import { OrdersBoard } from "./OrdersBoard";
import { Overview } from "./Overview";
import { StaffSection } from "./StaffSection";
import { TodayReservations } from "./TodayReservations";

export function StaffWorkspace({
  greeting,
  dateLabel,
  restaurantId,
}: {
  greeting: string;
  dateLabel: string;
  restaurantId: string;
}) {
  const { section, search } = useStaffChrome();
  const board = useServiceBoard(restaurantId);

  if (section === "tables" || section === "menu" || section === "notifications") {
    return <StaffSection section={section} />;
  }

  if (board.error && !board.reservations && !board.orders) {
    return (
      <div role="alert" className="rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-4 py-3 text-sm text-[#B55234]">
        {board.error}{" "}
        <button type="button" onClick={board.refresh} className="font-bold underline">
          Try again
        </button>
      </div>
    );
  }
  if (board.loading && !board.reservations && !board.orders) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-[#736D65]" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading today&apos;s service...
      </div>
    );
  }

  const timezone = board.reservations?.timezone ?? "UTC";
  const banner = board.problem ? (
    <p role="alert" className="mb-3 rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-3 py-2 text-xs font-semibold text-[#B55234]">
      {board.problem}
    </p>
  ) : null;

  if (section === "orders") {
    const orders = (board.orders?.orders ?? []).filter((order) =>
      matchesQuery(`${ticketNumber(order.id)} ${order.reservation?.tableName ?? ""} ${order.customerName}`, search),
    );
    return (
      <>
        {banner}
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-[#EDE7DC] bg-white px-4 py-8 text-sm text-[#8C877D]">
            {search ? "No orders match that search." : "No orders to prepare today."}
          </p>
        ) : (
          <OrdersBoard orders={orders} nowMs={board.nowMs} busyId={board.busyId} onMove={board.moveOrder} />
        )}
      </>
    );
  }

  if (section === "reservations") {
    const rows = (board.reservations?.reservations ?? []).filter((row) => matchesQuery(`${row.customerName} ${row.tableName}`, search));
    return (
      <>
        {banner}
        <TodayReservations rows={rows} timezone={timezone} busyId={board.busyId} onMove={board.moveReservation} />
      </>
    );
  }

  return (
    <>
      {banner}
      <Overview greeting={greeting} dateLabel={dateLabel} board={board} query={search} />
    </>
  );
}
