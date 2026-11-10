import assert from "node:assert/strict";
import { test } from "node:test";
import { computeStats, dayBounds } from "./stats.ts";

const TZ = "Africa/Tunis"; // UTC+1, no DST
const day = dayBounds("2026-10-24", TZ, 0);
const at = (hour: number) => day.startMs + hour * 3_600_000;

test("a day is the local day of the restaurant", () => {
  assert.equal(day.date, "2026-10-24");
  assert.equal(day.startMs, Date.UTC(2026, 9, 23, 23, 0));
  assert.equal(day.endMs - day.startMs, 24 * 3_600_000);
});

test("without a date, now decides the local day", () => {
  const justAfterMidnightLocal = Date.UTC(2026, 9, 23, 23, 30); // 00:30 on the 24th in Tunis
  assert.equal(dayBounds(null, TZ, justAfterMidnightLocal).date, "2026-10-24");
  assert.equal(dayBounds(null, "UTC", justAfterMidnightLocal).date, "2026-10-23");
});

test("reservations and covers skip cancelled ones and other days", () => {
  const stats = computeStats(
    [
      { status: "CONFIRMED", startsAtMs: at(12), guestCount: 4 },
      { status: "SEATED", startsAtMs: at(13), guestCount: 2 },
      { status: "NO_SHOW", startsAtMs: at(14), guestCount: 3 },
      { status: "CANCELLED", startsAtMs: at(15), guestCount: 9 },
      { status: "CONFIRMED", startsAtMs: day.endMs, guestCount: 6 },
      { status: "CONFIRMED", startsAtMs: day.startMs - 1, guestCount: 6 },
    ],
    [],
    day,
  );
  assert.equal(stats.reservationsToday, 3);
  assert.equal(stats.coversToday, 9);
});

test("revenue sums today's non-cancelled orders in exact minor units", () => {
  const stats = computeStats(
    [],
    [
      { status: "DELIVERED", dayMs: at(12), totalMinor: BigInt(12500) },
      { status: "PENDING", dayMs: at(19), totalMinor: BigInt(7250) },
      { status: "CANCELLED", dayMs: at(12), totalMinor: BigInt(99000) },
      { status: "PENDING", dayMs: day.endMs + 1, totalMinor: BigInt(5000) },
    ],
    day,
  );
  assert.equal(stats.revenueTodayMinor, BigInt(19750));
});

test("orders to process: open ones for today or earlier, not future pre-orders", () => {
  const stats = computeStats(
    [],
    [
      { status: "PENDING", dayMs: at(12), totalMinor: BigInt(1) },
      { status: "READY", dayMs: day.startMs - 5 * 86_400_000, totalMinor: BigInt(1) },
      { status: "DELIVERED", dayMs: at(12), totalMinor: BigInt(1) },
      { status: "CANCELLED", dayMs: at(12), totalMinor: BigInt(1) },
      { status: "PENDING", dayMs: day.endMs + 3_600_000, totalMinor: BigInt(1) },
    ],
    day,
  );
  assert.equal(stats.ordersToProcess, 2);
});
