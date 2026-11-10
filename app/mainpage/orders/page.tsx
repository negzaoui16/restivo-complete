"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShoppingBag } from "lucide-react";
import { apiListMyOrders } from "@/lib/orders/client";
import type { PublicOrder } from "@/lib/orders/types";
import { formatSlotDate, formatSlotTime } from "@/lib/reservations/format";
import { useRequireSignIn } from "../_lib/useRequireSignIn";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; orders: PublicOrder[] };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FFF4DC] text-[#8A5A00] border-[#F3DDA6]",
  CONFIRMED: "bg-[#E7F5EA] text-[#227B3A] border-[#C6E6CD]",
  PREPARING: "bg-[#E6EEF9] text-[#24508F] border-[#C5D7F0]",
  READY: "bg-[#E6EEF9] text-[#24508F] border-[#C5D7F0]",
  DELIVERED: "bg-[#F1EEE8] text-[#6B6661] border-[#E1DBCF]",
  CANCELLED: "bg-[#FBEAE5] text-[#B55234] border-[#F0CFC4]",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function OrdersPage() {
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const orders = await apiListMyOrders(token);
        if (!cancelled) setLoad({ state: "ready", orders });
      } catch (err) {
        if (!cancelled) {
          setLoad({ state: "error", message: err instanceof Error ? err.message : "Could not load orders." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, attempt, getFreshAccessToken]);

  // Statuses change on the manager side: refresh quietly every 30 seconds.
  useEffect(() => {
    if (!signedIn) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setAttempt((value) => value + 1);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [signedIn]);

  return (
    <div className="mt-3 pb-4">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">Orders</h1>

      {load.state === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading orders…
        </div>
      ) : null}

      {load.state === "error" ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
          <p className="text-sm text-[#B55234]">{load.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="rounded-full border border-[#D8D2C5] px-4 py-1.5 text-xs font-medium text-[#423E3A] hover:bg-black/5"
          >
            Try again
          </button>
        </div>
      ) : null}

      {load.state === "ready" && load.orders.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5ECE5] text-[#B55234]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <p className="text-base font-bold text-[#1A1A1A]">No orders yet</p>
          <p className="mt-1 max-w-sm text-sm text-[#736D65]">
            Book a table, then pre-order dishes from the restaurant menu.
          </p>
          <Link
            href="/mainpage/explore"
            className="mt-4 rounded-full bg-[#B55234] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E4328]"
          >
            Browse restaurants
          </Link>
        </div>
      ) : null}

      {load.state === "ready" && load.orders.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {load.orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrderCard({ order }: { order: PublicOrder }) {
  const tz = order.restaurant.timezone;
  const hasDiscount = Number(order.discount) !== 0;
  return (
    <article className="rounded-2xl border border-[#E8E2D7] bg-white p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-[#1A1A1A]">{order.restaurant.name}</h3>
          {order.reservation ? (
            <p className="mt-0.5 text-xs text-[#7A746B]">
              For {formatSlotDate(order.reservation.startsAt, tz)} at {formatSlotTime(order.reservation.startsAt, tz)} ·{" "}
              {order.reservation.tableName} · <span className="font-mono">{order.reservation.code}</span>
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[order.status] ?? ""}`}
        >
          {order.cancelledByRestaurant ? "Cancelled by the restaurant" : (STATUS_LABEL[order.status] ?? order.status)}
        </span>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-[#524D48]">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span>
              {item.quantity} × {item.name}
            </span>
            <span className="tabular-nums">{item.unitPrice}</span>
          </li>
        ))}
      </ul>
      {order.notes ? <p className="mt-2 text-xs italic text-[#736D65]">“{order.notes}”</p> : null}

      <dl className="mt-3 space-y-0.5 border-t border-[#F2ECE4] pt-2 text-xs text-[#524D48]">
        {hasDiscount ? (
          <>
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">
                {order.subtotal} {order.currency}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Promotions</dt>
              <dd className="tabular-nums">
                -{order.discount} {order.currency}
              </dd>
            </div>
          </>
        ) : null}
        <div className="flex justify-between text-sm font-bold text-[#1A1A1A]">
          <dt>Total</dt>
          <dd className="tabular-nums">
            {order.total} {order.currency}
          </dd>
        </div>
      </dl>
    </article>
  );
}
