import assert from "node:assert/strict";
import { test } from "node:test";
import { availableOrderActions, orderTransition } from "./transitions.ts";

test("an order moves one step at a time", () => {
  assert.equal(orderTransition("PENDING", "CONFIRMED", null).ok, true);
  assert.equal(orderTransition("CONFIRMED", "PREPARING", null).ok, true);
  assert.equal(orderTransition("PREPARING", "READY", null).ok, true);
  assert.equal(orderTransition("READY", "DELIVERED", null).ok, true);
  assert.equal(orderTransition("PENDING", "PREPARING", null).ok, false);
  assert.equal(orderTransition("READY", "PENDING", null).ok, false);
});

test("cancelling works until delivery", () => {
  for (const from of ["PENDING", "CONFIRMED", "PREPARING", "READY"] as const) {
    assert.equal(orderTransition(from, "CANCELLED", null).ok, true, from);
  }
  assert.equal(orderTransition("DELIVERED", "CANCELLED", null).ok, false);
  assert.equal(orderTransition("CANCELLED", "CANCELLED", null).ok, false);
});

test("a cancelled or missed reservation blocks progress but not cancelling", () => {
  for (const reservation of ["CANCELLED", "NO_SHOW"]) {
    const blocked = orderTransition("PENDING", "CONFIRMED", reservation);
    assert.equal(blocked.ok === false && blocked.code, "RESERVATION_CLOSED");
    assert.equal(orderTransition("PENDING", "CANCELLED", reservation).ok, true);
  }
  assert.equal(orderTransition("PENDING", "CONFIRMED", "SEATED").ok, true);
  assert.equal(orderTransition("PENDING", "CONFIRMED", "COMPLETED").ok, true);
});

test("action buttons list the next step and cancel", () => {
  assert.deepEqual(availableOrderActions("PENDING", "CONFIRMED"), ["CONFIRMED", "CANCELLED"]);
  assert.deepEqual(availableOrderActions("READY", null), ["DELIVERED", "CANCELLED"]);
  assert.deepEqual(availableOrderActions("PENDING", "NO_SHOW"), ["CANCELLED"]);
  assert.deepEqual(availableOrderActions("DELIVERED", null), []);
  assert.deepEqual(availableOrderActions("CANCELLED", null), []);
});
