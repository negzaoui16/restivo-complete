import { Check, UtensilsCrossed } from "lucide-react";
import type { StaffOrder } from "@/lib/staff/board-types";
import { ORDER_COLUMNS, itemLabel, minutesSince, ticketNumber } from "../_lib/board";

export function LiveOrderCard({ order, nowMs }: { order: StaffOrder | undefined; nowMs: number }) {
  return (
    <section className="rounded-2xl border border-[#EDE7DC] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <UtensilsCrossed className="h-4 w-4 text-[#B55234]" />
          Live orders
        </h2>
        <span className="rounded-full bg-[#EAF5EC] px-2 py-0.5 text-[10px] font-bold text-[#2E7D32]">Live</span>
      </div>
      {order ? <LiveOrder order={order} nowMs={nowMs} /> : <p className="text-sm text-[#8C877D]">No orders on the pass.</p>}
    </section>
  );
}

function LiveOrder({ order, nowMs }: { order: StaffOrder; nowMs: number }) {
  const current = ORDER_COLUMNS.findIndex((column) => column.status === order.status);
  const count = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const label = ORDER_COLUMNS[current]?.label ?? order.status;

  return (
    <div>
      <p className="text-sm font-bold">Order #{ticketNumber(order.id)}</p>
      <p className="text-[12px] text-[#6B665E]">
        {order.reservation ? `${order.reservation.tableName} · ` : ""}
        {itemLabel(count)}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[#C56A2D]">{label}</p>
      <p className="text-[11px] text-[#8C877D]">Placed {minutesSince(order.createdAt, nowMs)} min ago</p>
      <ol className="mt-4 grid grid-cols-4 gap-1">
        {ORDER_COLUMNS.map((column, index) => (
          <li key={column.status} className="text-center">
            <StepMark done={index <= current} current={index === current} />
            <span className="mt-1 block text-[10px] font-semibold text-[#8C877D]">{column.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepMark({ done, current }: { done: boolean; current: boolean }) {
  const tone = current ? "bg-[#C56A2D] text-white" : done ? "bg-[#2E7D32] text-white" : "bg-[#F3F0EA] text-[#B5ACA0]";
  return (
    <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${tone}`}>
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}
