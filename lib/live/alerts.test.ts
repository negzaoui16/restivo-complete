import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alertKey, dueAlerts, type AlertReservation, type AlertTable } from "./alerts.ts";

const NOW = Date.UTC(2026, 10, 3, 18, 0);
const MIN = 60_000;

function res(id: string, status: string, startMin: number, endMin = startMin + 90, name = "Sarah"): AlertReservation {
  return { id, status, startsAtMs: NOW + startMin * MIN, endsAtMs: NOW + endMin * MIN, customerName: name, guestCount: 4 };
}

function table(state: AlertTable["state"], current: AlertReservation | null, next: AlertReservation | null = null): AlertTable {
  return { id: "t1", name: "T14", state, current, next };
}

const kinds = (tables: AlertTable[], now = NOW) => dueAlerts(now, tables).map((alert) => alert.kind);

describe("ARRIVING", () => {
  it("is due within 15 minutes of the start, bounds included", () => {
    assert.deepEqual(kinds([table("RESERVED_SOON", res("r1", "CONFIRMED", 15))]), ["ARRIVING"]);
    assert.deepEqual(kinds([table("RESERVED_SOON", res("r1", "CONFIRMED", 0))]), ["ARRIVING"]);
  });

  it("is not due 16 minutes ahead", () => {
    assert.deepEqual(kinds([table("RESERVED_SOON", res("r1", "CONFIRMED", 16))]), []);
  });

  it("covers the booking that follows a seated party", () => {
    const seated = res("r1", "SEATED", -60, 30);
    assert.deepEqual(kinds([table("OCCUPIED", seated, res("r2", "CONFIRMED", 10))]), ["ARRIVING"]);
  });

  it("ignores guests who are already seated", () => {
    assert.deepEqual(kinds([table("OCCUPIED", res("r1", "SEATED", 5))]), []);
  });

  it("says who, how many, where and when", () => {
    const [alert] = dueAlerts(NOW, [table("RESERVED_SOON", res("r1", "CONFIRMED", 12))]);
    assert.equal(alert.key, "arriving:r1");
    assert.equal(alert.message, "Sarah (4 guests) is due in 12 min at T14.");
  });
});

describe("NO_SHOW_POSSIBLE", () => {
  it("is due 15 minutes after the start while the slot is open", () => {
    assert.deepEqual(kinds([table("RESERVED_SOON", res("r1", "CONFIRMED", -15))]), ["NO_SHOW_POSSIBLE"]);
    assert.deepEqual(kinds([table("RESERVED_SOON", res("r1", "PENDING", -40))]), ["NO_SHOW_POSSIBLE"]);
  });

  it("is not due at 14 minutes late", () => {
    assert.deepEqual(kinds([table("RESERVED_SOON", res("r1", "CONFIRMED", -14))]), []);
  });

  it("is not due once the slot is over", () => {
    assert.deepEqual(kinds([table("FREE", res("r1", "CONFIRMED", -100, 0))]), []);
  });
});

describe("OVERRUN", () => {
  it("is due when a seated party is past its slot and another reservation follows", () => {
    const seated = res("r1", "SEATED", -100, -10);
    const alerts = dueAlerts(NOW, [table("OVERDUE", seated, res("r2", "CONFIRMED", 20, 110, "Yassine"))]);
    const overrun = alerts.find((alert) => alert.kind === "OVERRUN");
    assert.equal(overrun?.key, "overrun:r1");
    assert.equal(overrun?.message, "T14 is 10 min past its slot and Yassine is due in 20 min.");
  });

  it("says the next guests are waiting once their time has come", () => {
    const seated = res("r1", "SEATED", -100, -10);
    const [overrun] = dueAlerts(NOW, [table("OVERDUE", seated, res("r2", "CONFIRMED", -5, 85, "Yassine"))]).filter((a) => a.kind === "OVERRUN");
    assert.equal(overrun.message, "T14 is 10 min past its slot and Yassine is waiting.");
  });

  it("is not due when nothing follows, or when the party is still within its slot", () => {
    assert.deepEqual(kinds([table("OVERDUE", res("r1", "SEATED", -100, -10))]), []);
    assert.deepEqual(kinds([table("OCCUPIED", res("r1", "SEATED", -60, 30), res("r2", "CONFIRMED", 30))]), []);
  });
});

describe("keys", () => {
  it("are stable between calls, so a stored key stops a repeat", () => {
    const tables = [table("RESERVED_SOON", res("r1", "CONFIRMED", 10))];
    assert.deepEqual(dueAlerts(NOW, tables).map((a) => a.key), dueAlerts(NOW + 5 * MIN, tables).map((a) => a.key));
    assert.equal(alertKey("NO_SHOW_POSSIBLE", "r9"), "no_show_possible:r9");
  });

  it("differ per kind for the same reservation", () => {
    const early = dueAlerts(NOW, [table("RESERVED_SOON", res("r1", "CONFIRMED", 10))])[0].key;
    const late = dueAlerts(NOW, [table("RESERVED_SOON", res("r1", "CONFIRMED", -20))])[0].key;
    assert.notEqual(early, late);
  });
});
