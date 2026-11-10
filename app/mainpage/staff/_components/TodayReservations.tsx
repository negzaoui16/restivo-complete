"use client";

import { formatSlotTime } from "@/lib/reservations/format";
import type { StaffReservation } from "@/lib/staff/board-types";
import type { StaffReservationTarget } from "@/lib/staff/service-rules";

const ACTION_LABEL: Record<StaffReservationTarget, string> = { SEATED: "Seat", COMPLETED: "Complete" };

const STATUS_LABEL: Record<StaffReservation["status"], string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  COMPLETED: "Completed",
};

const STATUS_TONE: Record<StaffReservation["status"], string> = {
  PENDING: "bg-[#FDF3E3] text-[#C56A2D]",
  CONFIRMED: "bg-[#EAF5EC] text-[#2E7D32]",
  SEATED: "bg-[#FAF0EA] text-[#B55234]",
  COMPLETED: "bg-[#F3F0EA] text-[#8C877D]",
};

export function TodayReservations({
  rows,
  timezone,
  busyId,
  onMove,
}: {
  rows: StaffReservation[];
  timezone: string;
  busyId: string | null;
  onMove: (id: string, status: StaffReservationTarget) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#EDE7DC] bg-white p-4">
      <h2 className="mb-3 text-[15px] font-bold">Today&apos;s reservations</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[#8C877D]">No reservations for today.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-1.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="w-12 font-semibold text-[#6B665E]">{formatSlotTime(row.startsAt, timezone)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{row.customerName}</span>
                <span className="text-[#8C877D]">{row.tableName}</span>
                <span className="w-5 text-center text-[#8C877D]" title="Guests">
                  {row.guestCount}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[row.status]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
              </div>
              {row.actions.length > 0 ? (
                <div className="flex gap-2 pl-14">
                  {row.actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => onMove(row.id, action)}
                      className="rounded-lg border border-[#E7D3C4] px-2.5 py-1 text-[12px] font-semibold text-[#8A4B32] hover:bg-[#FAF0EA] disabled:opacity-50"
                    >
                      {ACTION_LABEL[action]}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
