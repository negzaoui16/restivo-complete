"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Layers, Loader2, UtensilsCrossed } from "lucide-react";
import type { DiscoverRestaurantDetail } from "@/lib/discover/types";
import { MAX_DAYS_AHEAD, MAX_GUESTS } from "@/lib/reservations/constants";
import { apiGetAvailability } from "@/lib/reservations/client";
import { localDateInDays } from "@/lib/reservations/format";
import type { Availability } from "@/lib/reservations/types";
import { useRequireSignIn } from "../_lib/useRequireSignIn";
import { FloorPlanReadOnly, type TableState } from "./FloorPlanReadOnly";
import { FloorPlanReadOnly3D } from "./floor-3d/FloorPlanReadOnly3D";

type Loaded = { key: string; availability: Availability } | { key: string; error: string };

/** What the customer picked on the plan. Nothing is saved until they confirm. */
export type BookingSelection = {
  tableId: string;
  tableName: string;
  capacity: number;
  date: string;
  time: string;
  guests: number;
  notes: string;
};

/**
 * Floor plan with a date/time/party form: pick a free table, then either
 * explore the menu or confirm the reservation. The panel only reports the
 * selection; the parent owns what happens next.
 *
 * `notice` tells the panel that the chosen table was lost (taken by someone
 * else, slot no longer valid): the table is deselected, availability is read
 * again and the message is shown. The form values are kept.
 */
export function BookingPanel({
  restaurant,
  onExplore,
  onConfirm,
  busy = false,
  notice = null,
  initial,
  change,
}: {
  restaurant: DiscoverRestaurantDetail;
  onExplore?: (selection: BookingSelection) => void;
  onConfirm?: (selection: BookingSelection) => void;
  busy?: boolean;
  notice?: { id: number; message: string } | null;
  /** Starting values: the current reservation when it is being changed. */
  initial?: { tableId: string; date: string; time: string; guests: number; notes: string };
  /**
   * Changing an existing reservation: its own slot does not count as taken, and the two
   * booking buttons become one "Save changes".
   */
  change?: { reservationId: string; onSave: (selection: BookingSelection) => void; error?: string | null };
}) {
  const { getFreshAccessToken } = useRequireSignIn();
  const [floorId, setFloorId] = useState(restaurant.floors[0]?.id ?? null);
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tableId, setTableId] = useState<string | null>(initial?.tableId ?? null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [refresh, setRefresh] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [seenNotice, setSeenNotice] = useState(0);

  if (notice && notice.id !== seenNotice) {
    setSeenNotice(notice.id);
    setTableId(null);
    setRefresh((value) => value + 1);
    setProblem(notice.message);
  }

  const excludeId = change?.reservationId;
  const timezone = restaurant.timezone;
  const minDate = useMemo(() => localDateInDays(timezone, 0), [timezone]);
  const maxDate = useMemo(() => localDateInDays(timezone, MAX_DAYS_AHEAD), [timezone]);

  const ready = date !== "" && time !== "" && Number.isInteger(guests) && guests >= 1 && guests <= MAX_GUESTS;
  const key = `${date}|${time}|${guests}|${refresh}`;

  useEffect(() => {
    if (!ready) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const availability = await apiGetAvailability(
          token,
          restaurant.id,
          { date, time, guests, ...(excludeId ? { exclude: excludeId } : {}) },
          controller.signal,
        );
        if (!controller.signal.aborted) setLoaded({ key, availability });
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoaded({ key, error: err instanceof Error ? err.message : "Could not check availability." });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ready, date, time, guests, key, restaurant.id, excludeId, getFreshAccessToken]);

  const current = ready && loaded && loaded.key === key ? loaded : null;
  const availability = current && "availability" in current ? current.availability : null;
  const checking = ready && current === null;
  const loadError = current && "error" in current ? current.error : null;

  const states: Record<string, TableState> | undefined = useMemo(() => {
    if (!availability) return undefined;
    return Object.fromEntries(availability.tables.map((entry) => [entry.tableId, entry.state]));
  }, [availability]);

  const floor = restaurant.floors.find((item) => item.id === floorId) ?? restaurant.floors[0];
  const selected = tableId && states?.[tableId] === "free" ? restaurant.tables.find((t) => t.id === tableId) : undefined;
  const freeCount = availability ? availability.tables.filter((entry) => entry.state === "free").length : 0;

  const selection: BookingSelection | null = selected
    ? { tableId: selected.id, tableName: selected.name, capacity: selected.capacity, date, time, guests, notes: notes.trim() }
    : null;

  const fieldClass =
    "w-full rounded-xl border border-[#E5DEC9] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#B55234] focus:outline-none focus:ring-2 focus:ring-[#B55234]/20";

  return (
    <section aria-labelledby="plan-title" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="plan-title" className="text-base font-bold text-[#1A1A1A] sm:text-lg">
          {change ? "Change your reservation" : "Book a table"}
        </h2>
        {restaurant.floors.length > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Floors">
            {restaurant.floors.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === floor?.id}
                onClick={() => setFloorId(item.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  item.id === floor?.id
                    ? "bg-[#B55234] text-white"
                    : "border border-[#D8D2C5] text-[#423E3A] hover:bg-black/5"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-[#E8E2D7] bg-white p-4 sm:grid-cols-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="text-xs font-semibold text-[#524D48]">
          Date
          <input
            type="date"
            required
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="text-xs font-semibold text-[#524D48]">
          Time
          <input
            type="time"
            required
            step={900}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="text-xs font-semibold text-[#524D48]">
          Guests
          <input
            type="number"
            required
            min={1}
            max={MAX_GUESTS}
            value={Number.isNaN(guests) ? "" : guests}
            onChange={(event) => setGuests(event.target.valueAsNumber)}
            className={`${fieldClass} mt-1`}
          />
        </label>

        <label className="text-xs font-semibold text-[#524D48] sm:col-span-3">
          Notes <span className="font-normal text-[#9E988F]">(optional)</span>
          <textarea
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${fieldClass} mt-1 resize-none`}
          />
        </label>

        <div className="sm:col-span-3" aria-live="polite">
          {!ready ? (
            <p className="text-xs text-[#736D65]">Pick a date, a time and your party size to see the free tables.</p>
          ) : checking ? (
            <p className="flex items-center gap-1.5 text-xs text-[#736D65]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking tables…
            </p>
          ) : loadError ? (
            <p className="text-xs font-medium text-[#B55234]" role="alert">
              {loadError}
            </p>
          ) : availability?.issue ? (
            <p className="text-xs font-medium text-[#B55234]" role="alert">
              {availability.issue.message}
            </p>
          ) : availability ? (
            <p className="text-xs text-[#524D48]">
              {freeCount === 0
                ? "No table is free for this time and party size. Try another time."
                : `${freeCount} ${freeCount === 1 ? "table is" : "tables are"} free. Your table is held for ${availability.slot.durationMinutes} minutes. Pick one on the plan.`}
            </p>
          ) : null}
        </div>

        {selection ? (
          <div className="rounded-2xl border border-[#E8D9CF] bg-[#FBF5F0] p-4 sm:col-span-3" aria-live="polite">
            <p className="text-sm font-bold text-[#1A1A1A]">Your table</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#524D48] sm:grid-cols-4">
              <div>
                <dt className="text-[#9E988F]">Table</dt>
                <dd className="font-semibold">{selection.tableName}</dd>
              </div>
              <div>
                <dt className="text-[#9E988F]">Date</dt>
                <dd className="font-semibold">{selection.date}</dd>
              </div>
              <div>
                <dt className="text-[#9E988F]">Time</dt>
                <dd className="font-semibold">{selection.time}</dd>
              </div>
              <div>
                <dt className="text-[#9E988F]">Guests</dt>
                <dd className="font-semibold">{selection.guests}</dd>
              </div>
            </dl>
            {change ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => change.onSave(selection)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#B55234] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#9E4328] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  Save changes
                </button>
                {change.error ? (
                  <p className="text-xs font-medium text-[#B55234]" role="alert">
                    {change.error}
                  </p>
                ) : null}
              </div>
            ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onExplore?.(selection)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#B55234] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#9E4328] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
                Explore the menu
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm?.(selection)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D2C5] bg-white px-5 py-2.5 text-xs font-semibold text-[#423E3A] transition-all hover:bg-black/5 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Confirm reservation
              </button>
            </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#9E988F] sm:col-span-3">Select a free table on the plan.</p>
        )}

        {problem ? (
          <p className="text-xs font-medium text-[#B55234] sm:col-span-3" role="alert">
            {problem}
          </p>
        ) : null}
      </form>

      {floor ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#524D48]">
              Floor: <span className="font-bold text-[#1A1A1A]">{floor.name}</span>
            </span>
            <div className="inline-flex items-center rounded-lg border border-[#E5DFD3] bg-[#F5F2EB] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("2d")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "2d" ? "bg-white text-[#B55234] shadow-xs" : "text-[#6B665E] hover:text-[#3A3530]"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                2D Plan
              </button>
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "3d" ? "bg-white text-[#B55234] shadow-xs" : "text-[#6B665E] hover:text-[#3A3530]"
                }`}
              >
                <Box className="h-3.5 w-3.5" />
                3D View
              </button>
            </div>
          </div>

          {viewMode === "2d" ? (
            <FloorPlanReadOnly
              key={floor.id}
              width={floor.width}
              height={floor.height}
              objects={floor.objects}
              tableStates={states}
              selectedTableId={selected?.id ?? null}
              onSelectTable={(id) => {
                setProblem(null);
                setTableId(id);
              }}
            />
          ) : (
            <FloorPlanReadOnly3D
              key={`3d-${floor.id}`}
              width={floor.width}
              height={floor.height}
              objects={floor.objects}
              tableStates={states}
              selectedTableId={selected?.id ?? null}
              onSelectTable={(id) => {
                setProblem(null);
                setTableId(id);
              }}
            />
          )}
        </div>
      ) : null}

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#736D65]">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border-2 border-dashed border-[#2E7D32]/60 align-middle" />
          Available
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border-2 border-dashed border-[#B55234] bg-[#B55234]/10 align-middle" />
          Selected
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#3A3530]/30 align-middle" />
          Booked or too small
        </span>
      </p>
    </section>
  );
}
