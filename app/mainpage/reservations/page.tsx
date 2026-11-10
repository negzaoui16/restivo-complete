"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX, Loader2, Star } from "lucide-react";
import { apiCancelReservation, apiListMyReservations } from "@/lib/reservations/client";
import { formatSlotDate, formatSlotTime } from "@/lib/reservations/format";
import type { PublicReservation } from "@/lib/reservations/types";
import { RatingStars } from "../_components/RatingStars";
import { ReviewForm } from "../_components/ReviewForm";
import { useRequireSignIn } from "../_lib/useRequireSignIn";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; reservations: PublicReservation[]; now: number };

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-[#E7F5EA] text-[#227B3A] border-[#C6E6CD]",
  PENDING: "bg-[#FFF4DC] text-[#8A5A00] border-[#F3DDA6]",
  SEATED: "bg-[#E6EEF9] text-[#24508F] border-[#C5D7F0]",
  COMPLETED: "bg-[#F1EEE8] text-[#6B6661] border-[#E1DBCF]",
  CANCELLED: "bg-[#FBEAE5] text-[#B55234] border-[#F0CFC4]",
  NO_SHOW: "bg-[#F1EEE8] text-[#6B6661] border-[#E1DBCF]",
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  SEATED: "Seated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export default function ReservationsPage() {
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const reservations = await apiListMyReservations(token);
        if (!cancelled) setLoad({ state: "ready", reservations, now: Date.now() });
      } catch (err) {
        if (!cancelled) {
          setLoad({ state: "error", message: err instanceof Error ? err.message : "Could not load reservations." });
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

  async function cancel(id: string) {
    setBusy(id);
    setProblem(null);
    setNotice(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) return;
      const { reservation: updated, cancelledOrders } = await apiCancelReservation(token, id);
      setNotice(
        cancelledOrders > 0
          ? `Reservation cancelled. ${cancelledOrders} pre-${cancelledOrders === 1 ? "order was" : "orders were"} cancelled too.`
          : "Reservation cancelled.",
      );
      setLoad((current) =>
        current.state === "ready"
          ? { ...current, reservations: current.reservations.map((item) => (item.id === id ? updated : item)) }
          : current,
      );
      setConfirming(null);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not cancel this reservation.");
      setAttempt((value) => value + 1);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 pb-4">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">Reservations</h1>

      {problem ? (
        <p className="mb-3 text-sm font-medium text-[#B55234]" role="alert">
          {problem}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm font-medium text-[#227B3A]" role="status">
          {notice}
        </p>
      ) : null}

      {load.state === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reservations…
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

      {load.state === "ready" ? (
        load.reservations.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5ECE5] text-[#B55234]">
              <CalendarX className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-[#1A1A1A]">No reservations yet</p>
            <p className="mt-1 max-w-sm text-sm text-[#736D65]">Pick a restaurant and book your first table.</p>
            <Link
              href="/mainpage/explore"
              className="mt-4 rounded-full bg-[#B55234] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E4328]"
            >
              Browse restaurants
            </Link>
          </div>
        ) : (
          <Lists
            reservations={load.reservations}
            now={load.now}
            confirming={confirming}
            busy={busy}
            onAskCancel={setConfirming}
            onCancel={cancel}
          />
        )
      ) : null}
    </div>
  );
}

function Lists({
  reservations,
  now,
  confirming,
  busy,
  onAskCancel,
  onCancel,
}: {
  reservations: PublicReservation[];
  now: number;
  confirming: string | null;
  busy: string | null;
  onAskCancel: (id: string | null) => void;
  onCancel: (id: string) => void;
}) {
  // A reservation is "upcoming" while it is active and its slot has not ended.
  const upcoming = reservations.filter(
    (item) => (item.status === "CONFIRMED" || item.status === "PENDING" || item.status === "SEATED") && Date.parse(item.endsAt) > now,
  );
  const past = reservations.filter((item) => !upcoming.includes(item)).reverse();

  return (
    <div className="space-y-8">
      <Group title="Upcoming" empty="Nothing booked ahead.">
        {upcoming.map((item) => (
          <Card key={item.id} item={item} confirming={confirming} busy={busy} onAskCancel={onAskCancel} onCancel={onCancel} />
        ))}
      </Group>
      {past.length > 0 ? (
        <Group title="Past and cancelled" empty="">
          {past.map((item) => (
            <Card key={item.id} item={item} confirming={confirming} busy={busy} onAskCancel={onAskCancel} onCancel={onCancel} />
          ))}
        </Group>
      ) : null}
    </div>
  );
}

function Group({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-bold text-[#1A1A1A] sm:text-lg">{title}</h2>
      {children.length === 0 ? (
        <p className="text-sm text-[#736D65]">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
      )}
    </section>
  );
}

function Card({
  item,
  confirming,
  busy,
  onAskCancel,
  onCancel,
}: {
  item: PublicReservation;
  confirming: string | null;
  busy: string | null;
  onAskCancel: (id: string | null) => void;
  onCancel: (id: string) => void;
}) {
  const tz = item.restaurant.timezone;
  // The review is saved on the server; keep what was just sent without reloading the list.
  const [savedRating, setSavedRating] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const reviewRating = savedRating ?? item.review?.rating ?? null;
  return (
    <article className="rounded-2xl border border-[#E8E2D7] bg-white p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-[#1A1A1A]">{item.restaurant.name}</h3>
          <p className="mt-0.5 text-xs text-[#7A746B]">
            {formatSlotDate(item.startsAt, tz)} · {formatSlotTime(item.startsAt, tz)}–{formatSlotTime(item.endsAt, tz)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[item.status] ?? ""}`}
        >
          {item.cancelledByRestaurant ? "Cancelled by the restaurant" : (STATUS_LABEL[item.status] ?? item.status)}
        </span>
      </div>
      <p className="mt-2 text-xs text-[#524D48]">
        {item.table.name} · {item.guestCount} {item.guestCount === 1 ? "guest" : "guests"} · Code{" "}
        <span className="font-mono font-semibold">{item.code}</span>
      </p>
      {item.notes ? <p className="mt-1 text-xs italic text-[#736D65]">“{item.notes}”</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/mainpage/explore/${item.restaurant.id}`}
          className="rounded-full border border-[#D8D2C5] px-3.5 py-1.5 text-xs font-medium text-[#423E3A] hover:bg-black/5"
        >
          Open restaurant
        </Link>
        {item.canCancel ? (
          <Link
            href={`/mainpage/explore/${item.restaurant.id}?change=${encodeURIComponent(item.id)}`}
            className="rounded-full border border-[#D8D2C5] px-3.5 py-1.5 text-xs font-medium text-[#423E3A] hover:bg-black/5"
          >
            Change
          </Link>
        ) : null}
        {item.canCancel ? (
          <Link
            href={`/mainpage/explore/${item.restaurant.id}?preorder=${encodeURIComponent(item.id)}`}
            className="rounded-full bg-[#B55234] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9E4328]"
          >
            Pre-order meals
          </Link>
        ) : null}
        {item.canCancel ? (
          confirming === item.id ? (
            <>
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => onCancel(item.id)}
                className="inline-flex items-center gap-1 rounded-full bg-[#B55234] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9E4328] disabled:opacity-60"
              >
                {busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => onAskCancel(null)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-[#6B6661] hover:bg-black/5"
              >
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onAskCancel(item.id)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[#B55234] hover:bg-[#FBEAE5]"
            >
              Cancel reservation
            </button>
          )
        ) : null}
        {item.status === "COMPLETED" && reviewRating === null && !reviewing ? (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="inline-flex items-center gap-1 rounded-full bg-[#B55234] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9E4328]"
          >
            <Star className="h-3 w-3" aria-hidden="true" />
            Leave a review
          </button>
        ) : null}
        {item.status === "COMPLETED" && reviewRating !== null ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#524D48]">
            Your review <RatingStars value={reviewRating} />
          </span>
        ) : null}
      </div>
      {reviewing && reviewRating === null ? (
        <ReviewForm
          reservationId={item.id}
          restaurantName={item.restaurant.name}
          onSaved={(rating) => {
            setSavedRating(rating);
            setReviewing(false);
          }}
          onCancel={() => setReviewing(false)}
        />
      ) : null}
    </article>
  );
}
