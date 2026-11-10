/**
 * Booking rules as pure functions, so node:test can run them directly.
 *
 * Every policy value (slot length, lead time, horizon) is a parameter: callers
 * pass the constants from `./constants`. This file only imports the Temporal
 * polyfill and nothing from the app.
 *
 * Opening hours may run past midnight (12:00 to 03:00): the window belongs to
 * the day it opens on, and a slot after midnight is matched to the previous
 * day's window. Closing equal to opening is not a valid day (no 24-hour mode).
 * Everything is computed as instants in the restaurant time zone, so a clock
 * change inside a window is handled by the zone rules, not by hard-coded offsets.
 */
import { Temporal } from "temporal-polyfill";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

// ─── Slot ─────────────────────────────────────────────────────────────────────

export type Slot = {
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  /** Start in the restaurant timezone, for hours checks and display. */
  local: Temporal.ZonedDateTime;
};

export type SlotParse = { ok: true; slot: Slot } | { ok: false; message: string };

/** Turns the restaurant-local `date` ("YYYY-MM-DD") and `time` ("HH:MM") into a UTC slot. */
export function parseSlot(date: string, time: string, timeZone: string, durationMinutes: number): SlotParse {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Choose a valid date." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, message: "Choose a valid time." };

  try {
    const local = Temporal.PlainDate.from(date, { overflow: "reject" }).toZonedDateTime({
      timeZone,
      plainTime: Temporal.PlainTime.from(time),
    });
    return {
      ok: true,
      slot: {
        startsAt: local.toInstant(),
        endsAt: local.add({ minutes: durationMinutes }).toInstant(),
        local,
      },
    };
  } catch {
    return { ok: false, message: "Choose a valid date and time." };
  }
}

// ─── Opening hours ────────────────────────────────────────────────────────────

export type HoursDay = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

function timeOf(time: string | null): Temporal.PlainTime | null {
  const match = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null;
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Temporal.PlainTime.from({ hour: Number(match[1]), minute: Number(match[2]) });
}

/**
 * True when the whole slot (start to end) lies inside one opening window. The
 * windows that can hold it open on the slot's local date, or on the day before
 * when that day closes after midnight.
 */
export function fitsBusinessHours(hours: HoursDay[], slot: Slot, durationMinutes: number): boolean {
  const timeZone = slot.local.timeZoneId;
  const startMs = slot.startsAt.epochMilliseconds;
  const endMs = startMs + durationMinutes * MS_PER_MINUTE;
  const slotDate = slot.local.toPlainDate();

  for (const offset of [0, -1]) {
    const opening = slotDate.add({ days: offset });
    // Temporal: 1 = Monday ... 7 = Sunday. Stored: 0 = Sunday ... 6 = Saturday.
    const entry = hours.find((candidate) => candidate.dayOfWeek === opening.dayOfWeek % 7);
    if (!entry || entry.isClosed) continue;

    const open = timeOf(entry.openTime);
    const close = timeOf(entry.closeTime);
    if (!open || !close) continue;
    const order = Temporal.PlainTime.compare(close, open);
    if (order === 0) continue; // equal times are not a valid day
    const overnight = order < 0;
    if (offset === -1 && !overnight) continue;

    const windowStart = opening.toZonedDateTime({ timeZone, plainTime: open }).epochMilliseconds;
    const windowEnd = opening
      .add({ days: overnight ? 1 : 0 })
      .toZonedDateTime({ timeZone, plainTime: close }).epochMilliseconds;
    if (startMs >= windowStart && endMs <= windowEnd) return true;
  }
  return false;
}

// ─── Lead time and horizon ────────────────────────────────────────────────────

export type LeadIssue = "TOO_SOON" | "TOO_FAR";

export function leadTimeIssue(
  slot: Slot,
  now: Temporal.Instant,
  minLeadMinutes: number,
  maxDaysAhead: number,
): LeadIssue | null {
  const start = slot.startsAt.epochMilliseconds;
  if (start < now.epochMilliseconds + minLeadMinutes * MS_PER_MINUTE) return "TOO_SOON";
  if (start > now.epochMilliseconds + maxDaysAhead * MS_PER_DAY) return "TOO_FAR";
  return null;
}

// ─── Capacity and overlap ─────────────────────────────────────────────────────

export function fitsCapacity(guests: number, capacity: number, minCapacity?: number | null): boolean {
  if (!Number.isInteger(guests) || guests < 1) return false;
  if (guests > capacity) return false;
  return minCapacity == null || guests >= minCapacity;
}

export type Interval = { startsAtMs: number; endsAtMs: number };

/** Half-open intervals: a slot ending at 20:00 does not clash with one starting at 20:00. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAtMs < b.endsAtMs && a.endsAtMs > b.startsAtMs;
}

export function hasConflict(existing: Interval[], candidate: Interval): boolean {
  return existing.some((interval) => overlaps(interval, candidate));
}

// ─── Cancellation and access ──────────────────────────────────────────────────

/** A customer can cancel an active reservation only while it is still ahead. */
export function canCancel(
  status: string,
  startsAtMs: number,
  nowMs: number,
  cancellable: readonly string[],
): boolean {
  return cancellable.includes(status) && startsAtMs > nowMs;
}

/** Reservations are private to the customer who made them. */
export function ownsReservation(userId: string, customerId: string): boolean {
  return userId === customerId;
}

// ─── Reservation code ─────────────────────────────────────────────────────────

// No 0/O or 1/I/L, to stay readable when read aloud.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** `random` returns an integer in [0, max); injectable for tests. */
export function makeReservationCode(random: (max: number) => number): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) suffix += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return `RST-${suffix}`;
}

// ─── Locks when a reservation changes ─────────────────────────────────────────

/**
 * The advisory-lock keys to take when a reservation changes table or time, in one fixed
 * order (sorted, without duplicates). Two changes that touch the same pair of tables
 * then queue instead of waiting on each other.
 */
export function bookingLockKeys(reservationId: string, currentTableId: string, nextTableId: string): string[] {
  return [
    ...new Set([`reservation:${reservationId}`, `reservation-table:${currentTableId}`, `reservation-table:${nextTableId}`]),
  ].sort();
}
