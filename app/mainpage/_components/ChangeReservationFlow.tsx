"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ApiError } from "@/contexts/AuthContext";
import type { DiscoverRestaurantDetail } from "@/lib/discover/types";
import { apiListMyReservations, apiUpdateReservation } from "@/lib/reservations/client";
import { formatSlotDate, formatSlotTime, localDateOf } from "@/lib/reservations/format";
import type { PublicReservation } from "@/lib/reservations/types";
import { useRequireSignIn } from "../_lib/useRequireSignIn";
import { BookingPanel, type BookingSelection } from "./BookingPanel";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "missing" }
  | { state: "ready"; reservation: PublicReservation };

// Refusals that mean "this table / this slot cannot be booked": pick again on the plan.
const PLAN_CODES = new Set(["SLOT_TAKEN", "TABLE_TOO_SMALL", "TOO_SOON", "TOO_FAR", "OUTSIDE_HOURS", "NOT_FOUND"]);

/**
 * Changes the date, time, table, guests or notes of an upcoming reservation. The plan opens with the
 * current values, the reservation's own slot counts as free, and the server applies the rules of a new
 * booking. Pre-orders stay attached.
 */
export function ChangeReservationFlow({
  restaurant,
  reservationId,
}: {
  restaurant: DiscoverRestaurantDetail;
  reservationId: string;
}) {
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState<{ id: number; message: string } | null>(null);
  const [saved, setSaved] = useState<PublicReservation | null>(null);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const all = await apiListMyReservations(token);
        if (cancelled) return;
        const found = all.find((item) => item.id === reservationId && item.restaurant.id === restaurant.id && item.canCancel);
        setLoad(found ? { state: "ready", reservation: found } : { state: "missing" });
      } catch (err) {
        if (!cancelled) setLoad({ state: "error", message: err instanceof Error ? err.message : "Could not load your reservation." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, reservationId, restaurant.id, attempt, getFreshAccessToken]);

  async function save(selection: BookingSelection) {
    setBusy(true);
    setProblem(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new ApiError("MISSING_TOKEN", "Please sign in again.", 401);
      const updated = await apiUpdateReservation(token, reservationId, {
        tableId: selection.tableId,
        date: selection.date,
        time: selection.time,
        guestCount: selection.guests,
        notes: selection.notes,
      });
      setSaved(updated);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      const message = err instanceof Error ? err.message : "Could not save your changes.";
      if (code === "NOT_MODIFIABLE") {
        setLoad({ state: "missing" });
      } else if (PLAN_CODES.has(code)) {
        setPlanNotice((current) => ({ id: (current?.id ?? 0) + 1, message }));
      } else {
        setProblem(message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    const tz = saved.restaurant.timezone;
    return (
      <section className="rounded-2xl border border-[#C6E6CD] bg-[#F1F8F2] p-5" role="status">
        <p className="flex items-center gap-2 text-base font-bold text-[#1A1A1A]">
          <CheckCircle2 className="h-5 w-5 text-[#227B3A]" aria-hidden="true" />
          Reservation updated
        </p>
        <p className="mt-2 text-sm text-[#524D48]">
          {saved.table.name} · {formatSlotDate(saved.startsAt, tz)} at {formatSlotTime(saved.startsAt, tz)} ·{" "}
          {saved.guestCount} {saved.guestCount === 1 ? "guest" : "guests"} · Code{" "}
          <span className="font-mono font-semibold">{saved.code}</span>
        </p>
        <p className="mt-1 text-xs text-[#736D65]">Your pre-orders stay attached to this reservation.</p>
        <Link
          href="/mainpage/reservations"
          className="mt-4 inline-flex rounded-full bg-[#B55234] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#9E4328]"
        >
          Back to my reservations
        </Link>
      </section>
    );
  }

  if (load.state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-[#736D65]" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading your reservation...
      </p>
    );
  }

  if (load.state === "error") {
    return (
      <p className="text-sm text-[#B55234]" role="alert">
        {load.message}{" "}
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-bold underline">
          Try again
        </button>
      </p>
    );
  }

  if (load.state === "missing") {
    return (
      <div className="rounded-2xl border border-[#E8E2D7] bg-white p-5" role="alert">
        <p className="text-sm font-bold text-[#1A1A1A]">This reservation can no longer be changed.</p>
        <p className="mt-1 text-xs text-[#736D65]">Only an upcoming reservation that has not started can be changed.</p>
        <Link href="/mainpage/reservations" className="mt-3 inline-flex text-xs font-semibold text-[#B55234] hover:underline">
          Back to my reservations
        </Link>
      </div>
    );
  }

  const current = load.reservation;
  const tz = current.restaurant.timezone;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E8D9CF] bg-[#FBF5F0] p-4 text-sm text-[#1A1A1A]">
        <p className="font-bold">Changing reservation {current.code}</p>
        <p className="mt-0.5 text-xs text-[#524D48]">
          Now: {current.table.name} · {formatSlotDate(current.startsAt, tz)} at {formatSlotTime(current.startsAt, tz)} ·{" "}
          {current.guestCount} {current.guestCount === 1 ? "guest" : "guests"}. Pick the new slot and table below; your
          pre-orders stay.
        </p>
        <Link href="/mainpage/reservations" className="mt-2 inline-flex text-xs font-semibold text-[#B55234] hover:underline">
          Keep it as it is
        </Link>
      </div>
      <BookingPanel
        restaurant={restaurant}
        busy={busy}
        notice={planNotice}
        initial={{
          tableId: current.table.id,
          date: localDateOf(current.startsAt, tz),
          time: formatSlotTime(current.startsAt, tz),
          guests: current.guestCount,
          notes: current.notes ?? "",
        }}
        change={{ reservationId: current.id, onSave: (selection) => void save(selection), error: problem }}
      />
    </div>
  );
}
