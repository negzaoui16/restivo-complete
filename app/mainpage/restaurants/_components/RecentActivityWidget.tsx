"use client";

import React, { useCallback } from "react";
import { ArrowRight, CalendarDays, ShoppingBag } from "lucide-react";
import { apiManagerActivity } from "@/lib/manager/client";
import { formatSlotDate, formatSlotTime } from "@/lib/reservations/format";
import { useManagerQuery } from "../_lib/use-manager-query";

interface RecentActivityWidgetProps {
  restaurantId: string;
  timezone: string;
  onViewAll?: () => void;
}

const VISIBLE_CARDS = 4;

export function RecentActivityWidget({ restaurantId, timezone, onViewAll }: RecentActivityWidgetProps) {
  const fetcher = useCallback((token: string) => apiManagerActivity(token, restaurantId), [restaurantId]);
  const { data, error, loading, refresh } = useManagerQuery(fetcher);
  const items = (data ?? []).slice(0, VISIBLE_CARDS);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-[#1A1A1A]">Recent activity</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-[#B55234] hover:text-[#943F25] transition-colors flex items-center gap-1 group"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {error && !data ? (
        <p role="alert" className="text-xs text-[#B55234]">
          {error}{" "}
          <button type="button" onClick={refresh} className="font-bold underline">
            Try again
          </button>
        </p>
      ) : loading ? (
        <p className="py-4 text-xs text-[#736D65]" role="status">
          Loading...
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-[#EDE7DC] bg-white py-6 text-center text-xs text-[#736D65]">
          No activity yet. Reservations and orders will show up here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#EDE7DC] p-3.5 flex items-center gap-3 hover:border-[#DFD5C4] transition-all"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-black/5 ${
                  item.kind === "reservation" ? "bg-[#FAF0EA] text-[#B55234]" : "bg-[#FDF0E6] text-[#D96B27]"
                }`}
              >
                {item.kind === "reservation" ? <CalendarDays className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#1A1A1A] truncate">{item.title}</p>
                <p className="text-[11px] text-[#7A746B] truncate mt-0.5">{item.subtitle}</p>
                <p className="text-[10px] text-[#8C857B] font-medium mt-1">
                  {formatSlotDate(item.at, timezone)} · {formatSlotTime(item.at, timezone)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
