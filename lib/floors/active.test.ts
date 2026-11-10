import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deactivationBlocker, holdsTable } from "./active.ts";

const NOW = Date.UTC(2026, 10, 3, 18, 0);
const HOUR = 3_600_000;

describe("holdsTable", () => {
  it("counts upcoming and in-progress reservations that are still alive", () => {
    assert.equal(holdsTable("CONFIRMED", NOW + 5 * HOUR, NOW), true);
    assert.equal(holdsTable("PENDING", NOW + 5 * HOUR, NOW), true);
    assert.equal(holdsTable("SEATED", NOW + HOUR, NOW), true); // in progress
  });

  it("ignores finished, cancelled, missed and past reservations", () => {
    assert.equal(holdsTable("COMPLETED", NOW + HOUR, NOW), false);
    assert.equal(holdsTable("CANCELLED", NOW + 5 * HOUR, NOW), false);
    assert.equal(holdsTable("NO_SHOW", NOW + 5 * HOUR, NOW), false);
    assert.equal(holdsTable("CONFIRMED", NOW - HOUR, NOW), false);
    assert.equal(holdsTable("CONFIRMED", NOW, NOW), false); // ends exactly now
  });
});

describe("deactivationBlocker", () => {
  const base = { restaurantStatus: "ACTIVE", holdingReservations: 0, othersKeepItPublishable: true };

  it("allows switching off a floor nobody needs", () => {
    assert.equal(deactivationBlocker(base), null);
  });

  it("refuses while a reservation holds one of its tables", () => {
    assert.equal(deactivationBlocker({ ...base, holdingReservations: 1 }), "HAS_RESERVATIONS");
    assert.equal(deactivationBlocker({ ...base, restaurantStatus: "DRAFT", holdingReservations: 3 }), "HAS_RESERVATIONS");
  });

  it("refuses the last floor of a published restaurant", () => {
    assert.equal(deactivationBlocker({ ...base, othersKeepItPublishable: false }), "LAST_ACTIVE_FLOOR");
  });

  it("lets a draft restaurant switch off its last floor", () => {
    assert.equal(deactivationBlocker({ ...base, restaurantStatus: "DRAFT", othersKeepItPublishable: false }), null);
  });

  it("reports the reservations first when both apply", () => {
    assert.equal(
      deactivationBlocker({ restaurantStatus: "ACTIVE", holdingReservations: 2, othersKeepItPublishable: false }),
      "HAS_RESERVATIONS",
    );
  });
});
