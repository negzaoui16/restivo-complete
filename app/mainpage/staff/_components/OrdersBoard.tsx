"use client";

import { ShieldCheck } from "lucide-react";
import type { StaffOrder } from "@/lib/staff/board-types";
import type { StaffOrderTarget } from "@/lib/staff/service-rules";
import { ORDER_ACTION_LABEL, ORDER_COLUMNS, itemLabel, minutesSince, ticketNumber } from "../_lib/board";

const TONE: Record<StaffOrder["status"], string> = {
  CONFIRMED: "text-[#8C877D]",
  PREPARING: "text-[#C56A2D]",
  READY: "text-[#2E7D32]",
  DELIVERED: "text-[#8C877D]",
};

export function OrdersBoard({
  orders,
  nowMs,
  busyId,
  onMove,
}: {
  orders: StaffOrder[];
  nowMs: number;
  busyId: string | null;
  onMove: (id: string, status: StaffOrderTarget) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#EDE7DC] bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold">Orders</h2>
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-[#8C877D]">
          {ORDER_COLUMNS.map((column) => (
            <span key={column.status} className={TONE[column.status]}>
              {column.label} {orders.filter((order) => order.status === column.status).length}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ORDER_COLUMNS.map((column) => {
          const inColumn = orders.filter((order) => order.status === column.status);
          return (
            <div key={column.status} className="min-w-0">
              <p className={`mb-2 flex items-center gap-1.5 text-[12px] font-bold ${TONE[column.status]}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {column.label}
                <span className="ml-auto font-semibold">{inColumn.length}</span>
              </p>
              <div className="flex flex-col gap-2">
                {inColumn.map((order) => (
                  <OrderTicket key={order.id} order={order} nowMs={nowMs} busy={busyId === order.id} onMove={onMove} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OrderTicket({
  order,
  nowMs,
  busy,
  onMove,
}: {
  order: StaffOrder;
  nowMs: number;
  busy: boolean;
  onMove: (id: string, status: StaffOrderTarget) => void;
}) {
  const count = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const action = order.actions[0];
  return (
    <article className="rounded-xl border border-[#EDE7DC] bg-[#FFFCF8] p-2.5">
      <p className="text-[13px] font-bold">Order #{ticketNumber(order.id)}</p>
      <p className="text-[11px] text-[#8C877D]">
        {order.reservation ? `${order.reservation.tableName} · ` : ""}
        {itemLabel(count)} · {minutesSince(order.createdAt, nowMs)} min ago
      </p>
      <ul className="mt-1.5 text-[11px] text-[#524D48]">
        {order.items.map((line) => (
          <li key={line.id}>
            {line.quantity} × {line.name}
            {line.notes ? <span className="italic text-[#8C877D]"> ({line.notes})</span> : null}
          </li>
        ))}
      </ul>
      {order.notes ? <p className="mt-1 text-[11px] italic text-[#8C877D]">“{order.notes}”</p> : null}
      {action ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onMove(order.id, action)}
          className="mt-2 w-full rounded-lg border border-[#E7D3C4] py-1.5 text-[12px] font-semibold text-[#8A4B32] hover:bg-[#FAF0EA] disabled:opacity-50"
        >
          {ORDER_ACTION_LABEL[action]}
        </button>
      ) : order.status === "DELIVERED" ? (
        <p className="mt-2 text-center text-[12px] font-semibold text-[#8C877D]">Completed</p>
      ) : null}
    </article>
  );
}
