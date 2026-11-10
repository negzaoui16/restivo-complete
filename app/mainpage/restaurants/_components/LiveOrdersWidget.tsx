"use client";

import React, { useCallback } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { apiManagerOrders } from "@/lib/manager/client";
import type { ManagerOrder } from "@/lib/manager/types";
import { useManagerQuery } from "../_lib/use-manager-query";
import { ORDER_LABEL } from "../_lib/status";
import { StatusBadge } from "./manage/StatusBadge";

interface LiveOrdersWidgetProps {
  restaurantId: string;
  onViewAll?: () => void;
  onSelectOrder?: (order: ManagerOrder) => void;
}

const OPEN = ["PENDING", "CONFIRMED", "PREPARING", "READY"];
const VISIBLE_ROWS = 5;

export function LiveOrdersWidget({ restaurantId, onViewAll, onSelectOrder }: LiveOrdersWidgetProps) {
  const fetcher = useCallback(
    (token: string) => apiManagerOrders(token, restaurantId, { status: OPEN }),
    [restaurantId],
  );
  const { data, error, loading, refresh } = useManagerQuery(fetcher);
  const orders = data?.orders ?? [];

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DC] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-[#1A1A1A]">Live orders</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-[#B55234] hover:text-[#943F25] transition-colors flex items-center gap-1 group"
        >
          <span>View all orders</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
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
      ) : orders.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#736D65]">No order to process.</p>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, VISIBLE_ROWS).map((order) => {
            const count = order.items.reduce((sum, line) => sum + line.quantity, 0);
            return (
              <button
                type="button"
                key={order.id}
                onClick={() => onSelectOrder?.(order)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#EDE7DC] hover:border-[#DFD5C4] hover:bg-[#FAF7F2] transition-all text-left group"
              >
                <div>
                  <p className="text-xs font-bold text-[#1A1A1A] tracking-wide">
                    {order.reservation ? order.reservation.tableName : "No table"} · {order.customer.name}
                  </p>
                  <p className="text-[11px] text-[#7A746B]">
                    {count} {count === 1 ? "item" : "items"} · {order.total} {order.currency}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} label={ORDER_LABEL[order.status]} />
                  <ChevronRight className="w-3.5 h-3.5 text-[#A39C91] group-hover:text-[#1A1A1A] transition-all" />
                </div>
              </button>
            );
          })}
          {orders.length > VISIBLE_ROWS && (
            <p className="text-center text-[11px] text-[#8C8479]">+ {orders.length - VISIBLE_ROWS} more</p>
          )}
        </div>
      )}
    </div>
  );
}
