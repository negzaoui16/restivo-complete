"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { ApiError } from "@/contexts/AuthContext";
import type { DiscoverRestaurantDetail } from "@/lib/discover/types";
import { cartLines, estimateCart, type Cart } from "@/lib/orders/cart";
import { apiCreateOrder, apiGetMenu } from "@/lib/orders/client";
import { MAX_LINE_QUANTITY } from "@/lib/orders/constants";
import type { DiscoverMenu, PublicOrder } from "@/lib/orders/types";
import { apiCheckout, apiGetAvailability, apiListMyReservations } from "@/lib/reservations/client";
import { formatSlotDate, formatSlotTime } from "@/lib/reservations/format";
import type { PublicReservation } from "@/lib/reservations/types";
import { useRequireSignIn } from "../_lib/useRequireSignIn";
import { BookingPanel, type BookingSelection } from "./BookingPanel";
import { ChangeReservationFlow } from "./ChangeReservationFlow";
import { MenuBookDialog } from "./book/MenuBookDialog";
import { ARModal } from "../restaurants/menu/_components/ARModal";
import type { MenuItemView } from "@/lib/orders/types";
import {
  saveMenuToLocalCache,
  getCachedMenu,
  precacheAllMenu3DModels,
  useNetworkStatus,
} from "@/lib/offline/offline-manager";

type Step = "plan" | "review" | "done";
type BookMode = "browse" | "order";

type MenuLoad =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: DiscoverMenu };

// Refusals that mean "this table / this slot can no longer be booked": go back to the plan.
const PLAN_CODES = new Set(["SLOT_TAKEN", "TABLE_TOO_SMALL", "TOO_SOON", "TOO_FAR", "OUTSIDE_HOURS", "NOT_FOUND"]);
// Refusals about the dishes: the menu changed under the cart.
const MENU_CODES = new Set(["ITEM_UNAVAILABLE", "ITEM_NOT_FOUND", "MENU_UNAVAILABLE"]);

const LEAVE_MESSAGE = "You have dishes in your order that are not confirmed yet. Leave this page and lose them?";

const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-[#B55234] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#9E4328] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D8D2C5] bg-white px-5 py-2.5 text-xs font-semibold text-[#423E3A] transition-all hover:bg-black/5 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] disabled:cursor-not-allowed disabled:opacity-50";

function prettyDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Booking journey: plan → menu book (order) → review → confirmation.
 *
 * Nothing is saved before the final confirmation: the chosen table, the slot and
 * the cart live in this component only. Confirming sends ONE request that creates
 * the reservation and the pre-order in one server transaction.
 *
 * With `?preorder=<reservationId>` (the "Pre-order meals" button of the
 * Reservations page) the book opens for that existing reservation and confirming
 * adds a pre-order to it.
 */
export function ReservationFlow({ restaurant }: { restaurant: DiscoverRestaurantDetail }) {
  // With ?change=<reservationId> (the "Change" button of the Reservations page) the plan opens
  // for that reservation instead of starting a new booking.
  const changeId = useSearchParams().get("change");
  return changeId ? (
    <ChangeReservationFlow key={changeId} restaurant={restaurant} reservationId={changeId} />
  ) : (
    <BookingJourney restaurant={restaurant} />
  );
}

function BookingJourney({ restaurant }: { restaurant: DiscoverRestaurantDetail }) {
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const preorderId = useSearchParams().get("preorder");

  const [step, setStep] = useState<Step>("plan");
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [existing, setExisting] = useState<PublicReservation | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [orderNotes, setOrderNotes] = useState("");
  const [menu, setMenu] = useState<MenuLoad>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [bookNotice, setBookNotice] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState<{ id: number; message: string } | null>(null);
  const [done, setDone] = useState<{ reservation: PublicReservation; order: PublicOrder | null; added: boolean } | null>(null);
  const [bookMode, setBookMode] = useState<BookMode | null>(null);
  const [bookStart, setBookStart] = useState<"cover" | "order">("cover");
  const [autoDismissed, setAutoDismissed] = useState(false);
  const [selectedARItem, setSelectedARItem] = useState<MenuItemView | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Si hors-ligne, charger immédiatement le cache local
      if (typeof window !== "undefined" && !navigator.onLine) {
        const cached = getCachedMenu(restaurant.id);
        if (cached && !cancelled) {
          setMenu({
            state: "ready",
            data: {
              menu: cached,
              currency: restaurant.currency ?? "TND",
              decimals: 3,
            },
          });
          return;
        }
      }

      try {
        const token = await getFreshAccessToken();
        if (!token) {
          const cached = getCachedMenu(restaurant.id);
          if (cached && !cancelled) {
            setMenu({
              state: "ready",
              data: {
                menu: cached,
                currency: restaurant.currency ?? "TND",
                decimals: 3,
              },
            });
          }
          return;
        }
        const data = await apiGetMenu(token, restaurant.id);
        if (!cancelled) {
          setMenu({ state: "ready", data });
          if (data?.menu) {
            saveMenuToLocalCache(restaurant.id, data.menu);
            precacheAllMenu3DModels(data.menu);
          }
        }
      } catch (err) {
        if (!cancelled) {
          const cached = getCachedMenu(restaurant.id);
          if (cached) {
            setMenu({
              state: "ready",
              data: {
                menu: cached,
                currency: restaurant.currency ?? "TND",
                decimals: 3,
              },
            });
          } else {
            setMenu({
              state: "error",
              message:
                err instanceof Error ? err.message : "Could not load the menu.",
            });
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, restaurant.id, attempt, getFreshAccessToken]);

  // "Pre-order meals": find the reservation named in the link; it must be the customer's, here, and still upcoming.
  useEffect(() => {
    if (!signedIn || !preorderId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const all = await apiListMyReservations(token);
        if (cancelled) return;
        const found = all.find((item) => item.id === preorderId && item.restaurant.id === restaurant.id && item.canCancel);
        setExisting(found ?? null);
        if (!found) setProblem("That reservation can no longer take a pre-order. You can book a new table below.");
      } catch (err) {
        if (!cancelled) setProblem(err instanceof Error ? err.message : "Could not load your reservation.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, preorderId, restaurant.id, getFreshAccessToken]);

  const menuData = menu.state === "ready" ? menu.data : null;
  const readableMenu = menuData?.menu && menuData.menu.categories.length > 0 ? menuData.menu : null;
  const allDishes = useMemo(() => {
    return readableMenu?.categories.flatMap((c) => c.items) ?? [];
  }, [readableMenu]);
  const dishes3D = useMemo(() => {
    return allDishes.filter((d) => Boolean(d.model3dUrl));
  }, [allDishes]);
  const currency = menuData?.currency ?? restaurant.currency ?? "";
  const decimals = menuData?.decimals ?? 3;
  const lines = useMemo(() => cartLines(menuData?.menu ?? null, cart), [menuData, cart]);
  const estimate = useMemo(() => estimateCart(lines, decimals), [lines, decimals]);

  // A pre-order link opens the book by itself, once, until the customer closes it.
  const openMode: BookMode | null = bookMode ?? (existing && !autoDismissed && step === "plan" && readableMenu ? "order" : null);

  // Leaving with unconfirmed dishes (reload, close, in-app link) asks first.
  const dirty = estimate.count > 0 && step !== "done";
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.defaultPrevented) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function change(menuItemId: string, delta: number) {
    setCart((current) => ({
      ...current,
      [menuItemId]: Math.min(MAX_LINE_QUANTITY, Math.max(0, (current[menuItemId] ?? 0) + delta)),
    }));
  }

  function openBook(mode: BookMode, start: "cover" | "order" = "cover") {
    setBookNotice(null);
    setBookStart(start);
    setBookMode(mode);
  }

  function closeBook() {
    setBookMode(null);
    setAutoDismissed(true);
  }

  function backToPlan(message: string) {
    setPlanNotice((current) => ({ id: (current?.id ?? 0) + 1, message }));
    setProblem(null);
    setBookMode(null);
    setAutoDismissed(true);
    setStep("plan");
  }

  async function submit(withOrder: boolean, sel: BookingSelection | null = selection) {
    setBusy(true);
    setProblem(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new ApiError("MISSING_TOKEN", "Please sign in again.", 401);
      const items = lines.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity }));
      const notes = orderNotes.trim() ? { notes: orderNotes.trim() } : {};
      if (existing) {
        const order = await apiCreateOrder(token, { reservationId: existing.id, ...notes, items });
        setDone({ reservation: existing, order, added: true });
      } else if (sel) {
        const result = await apiCheckout(token, {
          reservation: {
            restaurantId: restaurant.id,
            tableId: sel.tableId,
            date: sel.date,
            time: sel.time,
            guestCount: sel.guests,
            ...(sel.notes ? { notes: sel.notes } : {}),
          },
          ...(withOrder && items.length > 0 ? { order: { ...notes, items } } : {}),
        });
        setDone({ ...result, added: false });
      } else {
        return;
      }
      setCart({});
      setOrderNotes("");
      setSelection(null);
      setExisting(null);
      setStep("done");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      const message = err instanceof Error ? err.message : "Could not confirm the reservation.";
      if (existing && code === "RESERVATION_NOT_ORDERABLE") {
        setExisting(null);
        backToPlan(`${message} Your order is kept; book a table to use it.`);
      } else if (PLAN_CODES.has(code)) {
        backToPlan(lines.length > 0 ? `${message} Your order is kept.` : message);
      } else if (MENU_CODES.has(code)) {
        setAttempt((value) => value + 1); // read the menu again
        setBookNotice(`${message} Please check your order.`);
        setStep("plan");
        setBookStart("order");
        setBookMode("order");
      } else {
        setProblem(message);
      }
    } finally {
      setBusy(false);
    }
  }

  /** Re-checks the table just before the review so a lost table is reported early. */
  async function goToReview(sel: BookingSelection | null) {
    setBusy(true);
    setProblem(null);
    try {
      if (sel) {
        const token = await getFreshAccessToken();
        if (token) {
          const availability = await apiGetAvailability(token, restaurant.id, {
            date: sel.date,
            time: sel.time,
            guests: sel.guests,
          });
          const state = availability.tables.find((entry) => entry.tableId === sel.tableId)?.state;
          if (state !== "free") {
            backToPlan("This table was just taken. Pick another table, your order is kept.");
            return;
          }
        }
      }
    } catch {
      // The server checks again when the reservation is confirmed.
    } finally {
      setBusy(false);
    }
    setBookMode(null);
    setAutoDismissed(true);
    setStep("review");
  }

  function startExplore(sel: BookingSelection) {
    setSelection(sel);
    setExisting(null);
    if (!readableMenu) {
      setProblem(
        menu.state === "loading"
          ? "The menu is still loading. Try again in a moment."
          : "The menu is not available right now. You can still confirm your reservation.",
      );
      return;
    }
    setProblem(null);
    openBook("order");
  }

  function confirmWithoutMenu(sel: BookingSelection) {
    setSelection(sel);
    setExisting(null);
    if (lines.length > 0) {
      void goToReview(sel);
    } else {
      void submit(false, sel); // empty cart: book straight away, no pre-order
    }
  }

  const summary = existing
    ? [
        `${existing.table.name} · ${formatSlotDate(existing.startsAt, existing.restaurant.timezone)} at ${formatSlotTime(existing.startsAt, existing.restaurant.timezone)}`,
        `Reservation ${existing.code}`,
      ]
    : selection
      ? [`${selection.tableName} · ${prettyDate(selection.date)} at ${selection.time}`, `${selection.guests} ${selection.guests === 1 ? "guest" : "guests"}`]
      : [];

  const canResume = estimate.count > 0 && Boolean(existing || selection) && readableMenu !== null;

  return (
    <div className="space-y-8">
      <div hidden={step !== "plan"} className="space-y-8">
        {existing ? (
          <div className="rounded-2xl border border-[#C6E6CD] bg-[#F1F8F2] p-4 text-sm text-[#1A1A1A]" role="status">
            <p className="font-bold">Pre-order for your reservation {existing.code}</p>
            <p className="mt-0.5 text-xs text-[#524D48]">
              {existing.table.name} · {formatSlotDate(existing.startsAt, existing.restaurant.timezone)} at{" "}
              {formatSlotTime(existing.startsAt, existing.restaurant.timezone)} · {existing.guestCount}{" "}
              {existing.guestCount === 1 ? "guest" : "guests"}
            </p>
            <button type="button" disabled={!readableMenu} onClick={() => openBook("order")} className={`${primaryButton} mt-3`}>
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Open the menu to pre-order
            </button>
          </div>
        ) : null}

        {problem && step === "plan" ? (
          <p className="text-xs font-medium text-[#B55234]" role="alert">
            {problem}
          </p>
        ) : null}

        <section
          id="menu"
          aria-labelledby="menu-card-title"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8D9CF] bg-[#FBF5F0] p-4"
        >
          <div className="min-w-0">
            <h2 id="menu-card-title" className="text-base font-bold text-[#1A1A1A] sm:text-lg">
              Menu
            </h2>
            {menu.state === "loading" ? (
              <p className="flex items-center gap-1.5 text-xs text-[#736D65]" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading menu…
              </p>
            ) : menu.state === "error" ? (
              <p className="text-xs text-[#B55234]" role="alert">
                {menu.message}
              </p>
            ) : !menuData?.menu ? (
              <p className="text-xs text-[#736D65]">This restaurant has not published its menu yet.</p>
            ) : !readableMenu ? (
              <p className="text-xs text-[#736D65]">No dish is available right now.</p>
            ) : (
              <p className="text-xs text-[#736D65]">Browse the dishes of {restaurant.name}, no reservation needed.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {menu.state === "error" ? (
              <button type="button" onClick={() => setAttempt((value) => value + 1)} className={secondaryButton}>
                Try again
              </button>
            ) : null}
            {canResume ? (
              <button type="button" onClick={() => openBook("order", "order")} className={primaryButton}>
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                Resume your order ({estimate.count})
              </button>
            ) : null}
            {readableMenu ? (
              <button type="button" onClick={() => openBook(existing ? "order" : "browse")} className={canResume ? secondaryButton : primaryButton}>
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Open the menu
              </button>
            ) : null}
          </div>

          {dishes3D.length > 0 ? (
            <div className="w-full mt-2 pt-3 border-t border-[#E8D9CF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  📱 Plats en Réalité Augmentée ({dishes3D.length})
                </span>
                <span className="text-[11px] text-[#736D65]">Cliquez sur un plat pour lancer la 3D / AR :</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dishes3D.map((dish) => (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => setSelectedARItem(dish)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-50 hover:border-purple-400 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>🧊</span>
                    <span>{dish.name}</span>
                    <span className="text-[10px] text-purple-400">AR</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <BookingPanel
          restaurant={restaurant}
          busy={busy}
          notice={planNotice}
          onExplore={startExplore}
          onConfirm={confirmWithoutMenu}
        />
      </div>

      {openMode && readableMenu ? (
        <MenuBookDialog
          menu={readableMenu}
          currency={currency}
          decimals={decimals}
          restaurantName={restaurant.name}
          mode={openMode}
          cart={cart}
          onChange={change}
          orderHint="Choose a table on the plan to order."
          summary={summary}
          notice={bookNotice}
          startOn={bookStart}
          onContinue={() => void goToReview(existing ? null : selection)}
          onClose={closeBook}
          onOpenAR={(dish) => setSelectedARItem(dish)}
        />
      ) : null}

      {step === "review" && (existing || selection) ? (
        <section aria-labelledby="flow-review-title" className="space-y-4">
          <h2 id="flow-review-title" className="text-base font-bold text-[#1A1A1A] sm:text-lg">
            {existing ? "Review your pre-order" : "Review your reservation"}
          </h2>
          <div className="space-y-3 rounded-2xl border border-[#E8E2D7] bg-white p-5">
            <p className="text-lg font-extrabold tracking-tight text-[#1A1A1A]">{restaurant.name}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[#524D48] sm:grid-cols-4">
              <div>
                <dt className="text-[#736D65]">Date</dt>
                <dd className="font-semibold">
                  {existing
                    ? formatSlotDate(existing.startsAt, existing.restaurant.timezone)
                    : selection
                      ? prettyDate(selection.date)
                      : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[#736D65]">Time</dt>
                <dd className="font-semibold">
                  {existing
                    ? formatSlotTime(existing.startsAt, existing.restaurant.timezone)
                    : selection?.time}
                </dd>
              </div>
              <div>
                <dt className="text-[#736D65]">Table</dt>
                <dd className="font-semibold">{existing ? existing.table.name : selection?.tableName}</dd>
              </div>
              <div>
                <dt className="text-[#736D65]">Guests</dt>
                <dd className="font-semibold">{existing ? existing.guestCount : selection?.guests}</dd>
              </div>
            </dl>

            <div className="border-t border-[#F2ECE4] pt-3">
              {lines.length === 0 ? (
                <p className="text-xs text-[#736D65]">No pre-order. You can order at the restaurant.</p>
              ) : (
                <>
                  <ul className="space-y-1 text-xs text-[#524D48]">
                    {lines.map(({ item, quantity }) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span>
                          {quantity} × {item.name}
                          {item.promotionLabel ? <span className="ml-1.5 text-[#B55234]">{item.promotionLabel}</span> : null}
                        </span>
                        <span className="tabular-nums">{item.salePrice}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-3 space-y-0.5 border-t border-[#F2ECE4] pt-2 text-xs text-[#524D48]">
                    {estimate.hasDiscount ? (
                      <>
                        <div className="flex justify-between">
                          <dt>Subtotal</dt>
                          <dd className="tabular-nums">
                            {estimate.subtotal} {currency}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Promotions</dt>
                          <dd className="tabular-nums">
                            -{estimate.discount} {currency}
                          </dd>
                        </div>
                      </>
                    ) : null}
                    <div className="flex justify-between text-sm font-bold text-[#1A1A1A]">
                      <dt>Estimated total</dt>
                      <dd className="tabular-nums">
                        {estimate.total} {currency}
                      </dd>
                    </div>
                  </dl>
                  <p className="pt-1 text-[11px] text-[#736D65]">The final price is calculated by the restaurant system when you confirm.</p>
                  <label className="mt-3 block text-xs font-semibold text-[#524D48]">
                    Notes for the kitchen <span className="font-normal text-[#736D65]">(optional)</span>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={orderNotes}
                      onChange={(event) => setOrderNotes(event.target.value)}
                      className="mt-1 w-full resize-none rounded-xl border border-[#E5DEC9] bg-white px-3 py-2 text-sm focus:border-[#B55234] focus:outline-none focus:ring-2 focus:ring-[#B55234]/20"
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {problem ? (
            <p className="text-xs font-medium text-[#B55234]" role="alert">
              {problem}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || (Boolean(existing) && lines.length === 0)}
              onClick={() => void submit(true)}
              className={primaryButton}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {existing ? "Confirm pre-order" : "Confirm reservation"}
            </button>
            <button type="button" disabled={busy} onClick={() => openBook("order", "order")} className={secondaryButton}>
              Back to the menu
            </button>
            {!existing ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep("plan");
                  setAutoDismissed(true);
                }}
                className={secondaryButton}
              >
                Change table
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "done" && done ? (
        <section aria-labelledby="flow-done-title" className="rounded-2xl border border-[#C6E6CD] bg-[#F1F8F2] p-6 text-center" role="status">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#227B3A]" aria-hidden="true" />
          <h2 id="flow-done-title" className="mt-3 text-xl font-extrabold tracking-tight text-[#1A1A1A]">
            {done.added ? "Pre-order sent" : "Reservation confirmed"}
          </h2>
          <p className="mt-1 font-mono text-lg font-bold text-[#B55234]">{done.reservation.code}</p>
          <p className="mt-2 text-sm text-[#524D48]">
            {done.reservation.restaurant.name} · {done.reservation.table.name} · {done.reservation.guestCount}{" "}
            {done.reservation.guestCount === 1 ? "guest" : "guests"}
          </p>
          <p className="text-sm text-[#524D48]">
            {formatSlotDate(done.reservation.startsAt, done.reservation.restaurant.timezone)} at{" "}
            {formatSlotTime(done.reservation.startsAt, done.reservation.restaurant.timezone)}
          </p>
          {done.order ? (
            <p className="mt-2 text-sm text-[#524D48]">
              Pre-order: {done.order.items.reduce((sum, item) => sum + item.quantity, 0)} dishes ·{" "}
              <span className="font-bold">
                {done.order.total} {done.order.currency}
              </span>
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/mainpage/reservations" className={primaryButton}>
              View my reservations
            </Link>
            {done.order ? (
              <Link href="/mainpage/orders" className={secondaryButton}>
                View my orders
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setDone(null);
                setStep("plan");
              }}
              className={secondaryButton}
            >
              Book another table
            </button>
          </div>
        </section>
      ) : null}
      {selectedARItem?.model3dUrl ? (
        <ARModal
          isOpen={true}
          onClose={() => setSelectedARItem(null)}
          itemName={selectedARItem.name}
          modelUrl={selectedARItem.model3dUrl}
          imageUrl={selectedARItem.imageUrl}
          description={selectedARItem.description}
        />
      ) : null}
    </div>
  );
}
