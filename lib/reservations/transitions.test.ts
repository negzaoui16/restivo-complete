import assert from "node:assert/strict";
import { test } from "node:test";
import { availableReservationActions, reservationTransition, type ReservationClock } from "./transitions.ts";

const START = Date.UTC(2026, 9, 24, 19, 0);
const MIN = 60_000;
const clockAt = (offsetMin: number): ReservationClock => ({
  nowMs: START + offsetMin * MIN,
  startsAtMs: START,
  endsAtMs: START + 90 * MIN,
});

test("seating opens 30 minutes before the slot and closes at its end", () => {
  assert.equal(reservationTransition("CONFIRMED", "SEATED", clockAt(-31)).ok, false);
  assert.equal(reservationTransition("CONFIRMED", "SEATED", clockAt(-30)).ok, true);
  assert.equal(reservationTransition("CONFIRMED", "SEATED", clockAt(90)).ok, true);
  const late = reservationTransition("CONFIRMED", "SEATED", clockAt(91));
  assert.equal(late.ok === false && late.code, "TOO_LATE");
  const early = reservationTransition("CONFIRMED", "SEATED", clockAt(-60));
  assert.equal(early.ok === false && early.code, "TOO_EARLY");
});

test("a no-show needs 15 minutes after the start", () => {
  assert.equal(reservationTransition("CONFIRMED", "NO_SHOW", clockAt(14)).ok, false);
  assert.equal(reservationTransition("CONFIRMED", "NO_SHOW", clockAt(15)).ok, true);
  assert.equal(reservationTransition("CONFIRMED", "NO_SHOW", clockAt(-60)).ok, false);
});

test("only a seated reservation can be completed", () => {
  assert.equal(reservationTransition("SEATED", "COMPLETED", clockAt(120)).ok, true);
  const skip = reservationTransition("CONFIRMED", "COMPLETED", clockAt(60));
  assert.equal(skip.ok === false && skip.code, "INVALID_TRANSITION");
});

test("the manager can cancel before and after the start, but not once seated", () => {
  assert.equal(reservationTransition("CONFIRMED", "CANCELLED", clockAt(-600)).ok, true);
  assert.equal(reservationTransition("CONFIRMED", "CANCELLED", clockAt(30)).ok, true);
  assert.equal(reservationTransition("SEATED", "CANCELLED", clockAt(30)).ok, false);
});

test("final states never move again", () => {
  for (const from of ["COMPLETED", "CANCELLED", "NO_SHOW"] as const) {
    for (const to of ["CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const) {
      assert.equal(reservationTransition(from, to, clockAt(30)).ok, false, `${from} -> ${to}`);
    }
    assert.deepEqual(availableReservationActions(from, clockAt(30)), []);
  }
});

test("action buttons follow the clock", () => {
  assert.deepEqual(availableReservationActions("CONFIRMED", clockAt(-120)), ["CANCELLED"]);
  assert.deepEqual(availableReservationActions("CONFIRMED", clockAt(-10)), ["SEATED", "CANCELLED"]);
  assert.deepEqual(availableReservationActions("CONFIRMED", clockAt(20)), ["SEATED", "NO_SHOW", "CANCELLED"]);
  assert.deepEqual(availableReservationActions("SEATED", clockAt(20)), ["COMPLETED"]);
});

test("an unknown status is refused, not crashed on", () => {
  assert.equal(reservationTransition("WEIRD" as never, "SEATED", clockAt(0)).ok, false);
});
