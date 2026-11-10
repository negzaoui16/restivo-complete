import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeLiveTables, liveDisplay, slotTimer, type LiveReservationInput } from "./state.ts";

const NOW = Date.UTC(2026, 10, 3, 18, 0);
const MIN = 60_000;

function res(id: string, status: string, startMin: number, endMin: number, tableId = "t1"): LiveReservationInput {
  return { id, tableId, status, startsAtMs: NOW + startMin * MIN, endsAtMs: NOW + endMin * MIN };
}

function one(reservations: LiveReservationInput[], tableId = "t1") {
  return computeLiveTables(NOW, [tableId], reservations)[0];
}

describe("computeLiveTables", () => {
  it("is FREE with no reservation, and keeps the order of the tables", () => {
    const result = computeLiveTables(NOW, ["b", "a"], []);
    assert.deepEqual(result.map((table) => [table.tableId, table.state]), [["b", "FREE"], ["a", "FREE"]]);
    assert.equal(result[0].current, null);
    assert.equal(result[0].next, null);
  });

  it("is RESERVED_SOON when a confirmed reservation starts in under 30 minutes", () => {
    const table = one([res("r1", "CONFIRMED", 29, 119)]);
    assert.equal(table.state, "RESERVED_SOON");
    assert.equal(table.current?.id, "r1");
  });

  it("is FREE at exactly 30 minutes, with the booking as next", () => {
    const table = one([res("r1", "CONFIRMED", 30, 120)]);
    assert.equal(table.state, "FREE");
    assert.equal(table.next?.id, "r1");
  });

  it("is RESERVED_SOON right on the start time and while the guests are late", () => {
    assert.equal(one([res("r1", "CONFIRMED", 0, 90)]).state, "RESERVED_SOON");
    assert.equal(one([res("r1", "PENDING", -20, 70)]).state, "RESERVED_SOON");
  });

  it("is FREE once an unseated slot has ended", () => {
    assert.equal(one([res("r1", "CONFIRMED", -100, -10)]).state, "FREE");
    assert.equal(one([res("r1", "CONFIRMED", -90, 0)]).state, "FREE"); // ends exactly now
  });

  it("is OCCUPIED while seated, up to and including the end of the slot", () => {
    assert.equal(one([res("r1", "SEATED", -30, 60)]).state, "OCCUPIED");
    assert.equal(one([res("r1", "SEATED", -90, 0)]).state, "OCCUPIED"); // ends exactly now
  });

  it("is OVERDUE once a seated slot is over", () => {
    const table = one([res("r1", "SEATED", -100, -1)]);
    assert.equal(table.state, "OVERDUE");
    assert.equal(table.current?.id, "r1");
  });

  it("shows the following booking of a seated table as next", () => {
    const table = one([res("r1", "SEATED", -30, 60), res("r2", "CONFIRMED", 60, 150)]);
    assert.equal(table.state, "OCCUPIED");
    assert.equal(table.current?.id, "r1");
    assert.equal(table.next?.id, "r2");
  });

  it("handles back-to-back slots on a free table: the first is current, the second next", () => {
    const table = one([res("r2", "CONFIRMED", 90, 180), res("r1", "CONFIRMED", 0, 90)]);
    assert.equal(table.state, "RESERVED_SOON");
    assert.equal(table.current?.id, "r1");
    assert.equal(table.next?.id, "r2");
  });

  it("stays OVERDUE when the next booking is waiting behind it", () => {
    const table = one([res("r1", "SEATED", -95, -5), res("r2", "CONFIRMED", -5, 85)]);
    assert.equal(table.state, "OVERDUE");
    assert.equal(table.next?.id, "r2");
  });

  it("ignores cancelled, no-show and completed reservations", () => {
    const table = one([
      res("r1", "CANCELLED", 10, 100),
      res("r2", "NO_SHOW", -10, 80),
      res("r3", "COMPLETED", -60, 30),
    ]);
    assert.equal(table.state, "FREE");
    assert.equal(table.current, null);
    assert.equal(table.next, null);
  });

  it("does not mix tables", () => {
    const result = computeLiveTables(NOW, ["t1", "t2"], [res("r1", "SEATED", -10, 80, "t2")]);
    assert.deepEqual(result.map((table) => table.state), ["FREE", "OCCUPIED"]);
  });
});

describe("slotTimer", () => {
  const start = NOW - 25 * MIN;
  const end = NOW + 65 * MIN;

  it("counts elapsed and remaining minutes", () => {
    const timer = slotTimer(NOW, start, end);
    assert.equal(timer.elapsedMinutes, 25);
    assert.equal(timer.remainingMinutes, 65);
    assert.equal(timer.startsInMinutes, 0);
  });

  it("rounds the remaining time up and the elapsed time down", () => {
    const timer = slotTimer(NOW + 30_000, start, end);
    assert.equal(timer.elapsedMinutes, 25);
    assert.equal(timer.remainingMinutes, 65);
  });

  it("goes negative once the slot is over", () => {
    assert.equal(slotTimer(end, start, end).remainingMinutes, 0);
    assert.equal(slotTimer(end + 7 * MIN, start, end).remainingMinutes, -7);
  });

  it("counts down to a slot that has not started", () => {
    const timer = slotTimer(NOW, NOW + 12 * MIN, NOW + 102 * MIN);
    assert.equal(timer.startsInMinutes, 12);
    assert.equal(timer.elapsedMinutes, 0);
  });
});

describe("liveDisplay", () => {
  const held = (startMin: number, status = "CONFIRMED") => ({ status, startsAtMs: NOW + startMin * MIN });

  it("keeps 'Reserved soon' before the slot starts", () => {
    assert.deepEqual(liveDisplay("RESERVED_SOON", held(10), NOW), { kind: "RESERVED_SOON", label: "Reserved soon", minutesLate: 0 });
  });

  it("shows 'Waiting · N min late' once the slot has started and nobody is seated", () => {
    assert.equal(liveDisplay("RESERVED_SOON", held(0), NOW).label, "Waiting · 0 min late");
    const late = liveDisplay("RESERVED_SOON", held(-7), NOW);
    assert.equal(late.kind, "WAITING");
    assert.equal(late.label, "Waiting · 7 min late");
    assert.equal(late.minutesLate, 7);
  });

  it("counts whole minutes late, rounded down", () => {
    assert.equal(liveDisplay("RESERVED_SOON", held(-7), NOW + 59_000).label, "Waiting · 7 min late");
    assert.equal(liveDisplay("RESERVED_SOON", held(-7), NOW + 60_000).label, "Waiting · 8 min late");
  });

  it("uses the plain labels for the other states", () => {
    assert.equal(liveDisplay("FREE", null, NOW).label, "Free");
    assert.equal(liveDisplay("OCCUPIED", held(-30, "SEATED"), NOW).label, "Occupied");
    assert.equal(liveDisplay("OVERDUE", held(-100, "SEATED"), NOW).label, "Overdue");
  });
});
