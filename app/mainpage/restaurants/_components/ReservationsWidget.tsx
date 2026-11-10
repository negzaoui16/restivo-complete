"use client";

import React, { useCallback } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { apiManagerReservations } from "@/lib/manager/client";
import { formatSlotTime } from "@/lib/reservations/format";
import { useManagerQuery } from "../_lib/use-manager-query";
import { RESERVATION_LABEL } from "../_lib/status";
import { StatusBadge } from "./manage/StatusBadge";

interface ReservationsWidgetProps {
  restaurantId: string;
  /** Local day, YYYY-MM-DD; today when omitted. */
  date?: string;
  title: string;
  onAddReservation?: () => void;
  onViewAll?: () => void;
}

const VISIBLE_ROWS = 6;

export function ReservationsWidget({ restaurantId, date, title, onAddReservation, onViewAll }: ReservationsWidgetProps) {
  const fetcher = useCallback(
    (token: string) => apiManagerReservations(token, restaurantId, { date }),
    [restaurantId, date],
  );
  const { data, error, loading, refresh } = useManagerQuery(fetcher);
  // Cancelled and no-show rows stay in the full list, not on the dashboard.
  const rows = (data?.reservations ?? []).filter((row) => row.status !== "CANCELLED" && row.status !== "NO_SHOW");

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DC] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3.5 gap-2">
        <h3 className="text-base font-bold text-[#1A1A1A]">{title}</h3>
        <div className="flex items-center gap-3">
          {onAddReservation && (
            <button
              type="button"
              onClick={onAddReservation}
              aria-label="Add a reservation"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E8E2D7] text-[#736D65] hover:bg-[#FAF7F2]"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-[#B55234] hover:text-[#943F25] transition-colors flex items-center gap-1 group"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {error && !data ? (
        <p role="alert" className="py-4 text-xs text-[#B55234]">
          {error}{" "}
          <button type="button" onClick={refresh} className="font-bold underline">
            Try again
          </button>
        </p>
      ) : loading ? (
        <p className="py-6 text-center text-xs text-[#736D65]" role="status">
          Loading...
        </p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#736D65]">No reservations for this day.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left text-xs min-w-[320px]">
            <thead>
              <tr className="border-b border-[#ECE7DC] text-[#8C8479] font-medium">
                <th className="pb-2.5 font-medium">Time</th>
                <th className="pb-2.5 font-medium">Guest</th>
                <th className="pb-2.5 font-medium">Table</th>
                <th className="pb-2.5 font-medium">Guests</th>
                <th className="pb-2.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFEB]">
              {rows.slice(0, VISIBLE_ROWS).map((row) => (
                <tr key={row.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                  <td className="py-2.5 font-semibold text-[#1A1A1A]">{formatSlotTime(row.startsAt, data?.timezone ?? "UTC")}</td>
                  <td className="py-2.5 font-medium text-[#2E2A25]">{row.customer.name}</td>
                  <td className="py-2.5 text-[#736D65]">{row.table.name}</td>
                  <td className="py-2.5 text-[#736D65]">{row.guestCount}</td>
                  <td className="py-2.5 text-right">
                    <StatusBadge status={row.status} label={RESERVATION_LABEL[row.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > VISIBLE_ROWS && (
            <p className="mt-2 text-center text-[11px] text-[#8C8479]">+ {rows.length - VISIBLE_ROWS} more</p>
          )}
        </div>
      )}
    </div>
  );
}
