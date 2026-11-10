import { Armchair, CalendarDays, ChefHat, Clock } from "lucide-react";
import type { StaffOrder, StaffReservation } from "@/lib/staff/board-types";

/** Counts only, taken from today's board. No money, no statistics. */
export function SummaryStrip({ reservations, orders }: { reservations: StaffReservation[]; orders: StaffOrder[] }) {
  const items = [
    { id: "reservations", label: "Reservations today", value: reservations.length, Icon: CalendarDays },
    { id: "tables", label: "Tables occupied", value: reservations.filter((row) => row.status === "SEATED").length, Icon: Armchair },
    { id: "preparing", label: "Orders preparing", value: orders.filter((order) => order.status === "PREPARING").length, Icon: ChefHat },
    { id: "ready", label: "Orders ready", value: orders.filter((order) => order.status === "READY").length, Icon: Clock },
  ];
  return (
    <section className="grid grid-cols-2 gap-2 rounded-2xl border border-[#EDE7DC] bg-white p-3 sm:grid-cols-4">
      {items.map(({ id, label, value, Icon }) => (
        <div key={id} className="flex items-center gap-2.5 px-1 py-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF7F2] text-[#B55234]">
            <Icon className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-[#1A1A1A]">{value}</span>
            <span className="block text-[11px] text-[#8C877D]">{label}</span>
          </span>
        </div>
      ))}
    </section>
  );
}
