"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListMyReservations } from "@/lib/reservations/client";
import { formatSlotDate, formatSlotTime } from "@/lib/reservations/format";
import type { PublicReservation } from "@/lib/reservations/types";

const ACTIVE = ["PENDING", "CONFIRMED", "SEATED"];

/** The customer's next reservation, or nothing when there is none (or it cannot be loaded). */
export function NextReservationCard() {
  const { user, getFreshAccessToken } = useAuth();
  const signedIn = Boolean(user);
  const [next, setNext] = useState<PublicReservation | null>(null);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;

    async function load() {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const nowMs = Date.now();
        const rows = await apiListMyReservations(token);
        const upcoming = rows
          .filter((row) => ACTIVE.includes(row.status) && Date.parse(row.endsAt) > nowMs)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        if (!cancelled) setNext(upcoming[0] ?? null);
      } catch {
        // The card is a convenience: stay hidden rather than show an error on the home page.
      }
    }

    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [signedIn, getFreshAccessToken]);

  if (!next) return null;
  const tz = next.restaurant.timezone;

  return (
    <section aria-labelledby="next-reservation-title" className="mt-5">
      <Link
        href="/mainpage/reservations"
        className="flex items-center gap-4 rounded-2xl border border-[#EDE7DC] bg-white p-4 shadow-2xs transition-colors hover:border-[#DFD5C4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF0EA] text-[#B55234]">
          <CalendarCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="next-reservation-title" className="block text-[11px] font-semibold uppercase tracking-wider text-[#9E988F]">
            {next.status === "SEATED" ? "Your current reservation" : "Your next reservation"}
          </span>
          <span className="block truncate text-sm font-bold text-[#1A1A1A]">{next.restaurant.name}</span>
          <span className="block text-xs text-[#736D65]">
            {formatSlotDate(next.startsAt, tz)} · {formatSlotTime(next.startsAt, tz)} · {next.table.name} · Code{" "}
            <span className="font-mono font-semibold">{next.code}</span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-[#B55234]" aria-hidden="true" />
      </Link>
    </section>
  );
}
