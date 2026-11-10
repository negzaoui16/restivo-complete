"use client";

import { Bell, CalendarDays, ShieldCheck } from "lucide-react";
import { formatSlotTime } from "@/lib/reservations/format";
import type { StaffOrder, StaffReservation } from "@/lib/staff/board-types";
import type { StaffOrderTarget } from "@/lib/staff/service-rules";
import { ORDER_ACTION_LABEL, itemLabel, minutesSince, ticketNumber } from "../_lib/board";

const CARD = "flex flex-col justify-between rounded-2xl border p-3.5";
const BUTTON = "mt-3 inline-flex w-fit items-center rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-50";

function countOf(order: StaffOrder): number {
  return order.items.reduce((sum, line) => sum + line.quantity, 0);
}

/** What needs a hand now: the order in the kitchen, the next guests, the order waiting at the pass. */
export function AttentionRow({
  preparing,
  ready,
  arriving,
  timezone,
  nowMs,
  busyId,
  onMoveOrder,
}: {
  preparing: StaffOrder | undefined;
  ready: StaffOrder | undefined;
  arriving: StaffReservation | undefined;
  timezone: string;
  nowMs: number;
  busyId: string | null;
  onMoveOrder: (id: string, status: StaffOrderTarget) => void;
}) {
  if (!preparing && !ready && !arriving) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
        <Bell className="h-4 w-4 text-[#B55234]" />
        Needs your attention
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {preparing ? (
          <article className={`${CARD} border-[#F0E4D8] bg-[#FBF7F2]`}>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C56A2D]">
                <Bell className="h-3.5 w-3.5" /> Preparing
              </p>
              <h3 className="mt-2 text-sm font-bold">Order #{ticketNumber(preparing.id)}</h3>
              <p className="mt-1 text-[12px] text-[#6B665E]">
                {preparing.reservation ? `${preparing.reservation.tableName} · ` : ""}
                {itemLabel(countOf(preparing))}
              </p>
              <p className="mt-1 text-[12px] text-[#8C877D]">Placed {minutesSince(preparing.createdAt, nowMs)} min ago</p>
            </div>
            {preparing.actions[0] ? (
              <button
                type="button"
                disabled={busyId === preparing.id}
                onClick={() => onMoveOrder(preparing.id, preparing.actions[0])}
                className={`${BUTTON} border-[#E7D3C4] text-[#8A4B32]`}
              >
                {ORDER_ACTION_LABEL[preparing.actions[0]]}
              </button>
            ) : null}
          </article>
        ) : null}
        {arriving ? (
          <article className={`${CARD} border-[#EDE7DC] bg-white`}>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8C877D]">
                <CalendarDays className="h-3.5 w-3.5" /> Next reservation
              </p>
              <h3 className="mt-2 text-sm font-bold">{arriving.customerName}</h3>
              <p className="mt-1 text-[12px] text-[#6B665E]">
                {formatSlotTime(arriving.startsAt, timezone)} · {arriving.guestCount} {arriving.guestCount === 1 ? "guest" : "guests"}
              </p>
              <p className="mt-1 text-[12px] text-[#8C877D]">{arriving.tableName}</p>
            </div>
          </article>
        ) : null}
        {ready ? (
          <article className={`${CARD} border-[#D7EBD9] bg-[#F4FAF5]`}>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2E7D32]">
                <ShieldCheck className="h-3.5 w-3.5" /> Order ready
              </p>
              <h3 className="mt-2 text-sm font-bold">Order #{ticketNumber(ready.id)}</h3>
              <p className="mt-1 text-[12px] text-[#6B665E]">
                {ready.reservation ? `${ready.reservation.tableName} · ` : ""}
                {itemLabel(countOf(ready))}
              </p>
              <p className="mt-1 text-[12px] text-[#2E7D32]">Ready for pickup</p>
            </div>
            {ready.actions[0] ? (
              <button
                type="button"
                disabled={busyId === ready.id}
                onClick={() => onMoveOrder(ready.id, ready.actions[0])}
                className={`${BUTTON} border-[#B7D7BA] text-[#2E7D32]`}
              >
                {ORDER_ACTION_LABEL[ready.actions[0]]}
              </button>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
