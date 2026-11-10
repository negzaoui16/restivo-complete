"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiListNotifications,
  apiMarkNotificationsRead,
  type NotificationList,
  type PublicNotification,
} from "@/lib/notifications/client";

const POLL_MS = 60_000;

function timeAgo(iso: string, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

/** Where a notification leads: the customer pages list their own reservations and orders. */
function targetOf(item: PublicNotification): string {
  if (item.data?.alertKey) return "/mainpage/restaurants/live";
  if (item.type === "STAFF_REQUEST") return item.data?.role === "MANAGER" ? "/mainpage/restaurants" : "/mainpage/staff";
  if (item.data?.orderId) return "/mainpage/orders";
  return "/mainpage/reservations";
}

/** Bell of the customer top bar: unread count, dropdown list, mark as read. Refreshes every minute. */
export function NotificationBell() {
  const router = useRouter();
  const { user, getFreshAccessToken } = useAuth();
  const signedIn = Boolean(user);
  const [list, setList] = useState<NotificationList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;

    async function load() {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const next = await apiListNotifications(token);
        if (cancelled) return;
        setList(next);
        setNow(Date.now());
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load your notifications.");
      }
    }

    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [signedIn, getFreshAccessToken, tick]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function markRead(ids: string[] | "all") {
    try {
      const token = await getFreshAccessToken();
      if (!token) return;
      setList(await apiMarkNotificationsRead(token, ids));
    } catch {
      setError("Could not update your notifications.");
    }
  }

  const unread = list?.unread ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) setTick((value) => value + 1);
        }}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        className="w-8.5 h-8.5 rounded-full bg-[#FAF7F2]/80 hover:bg-white border border-[#E8E4DA] flex items-center justify-center text-[#4A4643] hover:text-[#1A1A1A] transition-all relative shadow-2xs"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B55234] px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute right-0 mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-[#E8E4DA] shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] px-3 py-2.5">
              <p className="text-xs font-semibold text-[#1A1A1A]">Notifications</p>
              <button
                type="button"
                disabled={unread === 0}
                onClick={() => void markRead("all")}
                className="text-[11px] font-semibold text-[#B55234] hover:underline disabled:text-[#B5ACA0] disabled:no-underline"
              >
                Mark all as read
              </button>
            </div>

            {error && (
              <p role="alert" className="px-3 py-2 text-xs text-[#B55234]">
                {error}
              </p>
            )}

            {list && list.notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <BellOff className="mb-2 h-6 w-6 text-[#B5ACA0]" aria-hidden="true" />
                <p className="text-xs font-semibold text-[#1A1A1A]">You are all caught up</p>
                <p className="mt-1 text-[11px] text-[#7A746B]">
                  Updates about your reservations and orders will show up here.
                </p>
              </div>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y divide-[#F6F2EA]">
                {list?.notifications.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (!item.readAt) void markRead([item.id]);
                        router.push(targetOf(item));
                      }}
                      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[#FAF7F2] ${
                        item.readAt ? "" : "bg-[#FDF8F4]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-[#B55234]"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-[#1A1A1A]">{item.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-[#524D48]">{item.message}</span>
                        <span className="mt-1 block text-[10px] text-[#9E988F]">{timeAgo(item.createdAt, now)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
