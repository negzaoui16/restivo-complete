import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStaffOrderTarget,
  isStaffReservationTarget,
  staffAccessVerdict,
  staffOrderActions,
  staffReservationActions,
} from "./service-rules.ts";

describe("staffAccessVerdict", () => {
  it("lets an active STAFF member of the restaurant in", () => {
    assert.equal(staffAccessVerdict({ role: "STAFF", status: "ACTIVE" }), "OK");
  });

  it("refuses someone with no membership here (another restaurant, or none)", () => {
    assert.equal(staffAccessVerdict(null), "NOT_A_MEMBER");
  });

  it("refuses an inactive membership, whatever the role", () => {
    assert.equal(staffAccessVerdict({ role: "STAFF", status: "SUSPENDED" }), "INACTIVE");
    assert.equal(staffAccessVerdict({ role: "STAFF", status: "PENDING" }), "INACTIVE");
  });

  it("keeps owners and managers on their own routes", () => {
    assert.equal(staffAccessVerdict({ role: "MANAGER", status: "ACTIVE" }), "NOT_STAFF");
    assert.equal(staffAccessVerdict({ role: "OWNER", status: "ACTIVE" }), "NOT_STAFF");
  });
});

describe("staff moves", () => {
  it("allows only Seat and Complete on reservations", () => {
    assert.equal(isStaffReservationTarget("SEATED"), true);
    assert.equal(isStaffReservationTarget("COMPLETED"), true);
    for (const status of ["CANCELLED", "NO_SHOW", "CONFIRMED", "PENDING"]) assert.equal(isStaffReservationTarget(status), false);
  });

  it("allows only the kitchen steps on orders", () => {
    for (const status of ["PREPARING", "READY", "DELIVERED"]) assert.equal(isStaffOrderTarget(status), true);
    for (const status of ["CANCELLED", "CONFIRMED", "PENDING"]) assert.equal(isStaffOrderTarget(status), false);
  });

  it("filters the buttons a transition offers", () => {
    assert.deepEqual(staffReservationActions(["SEATED", "NO_SHOW", "CANCELLED"]), ["SEATED"]);
    assert.deepEqual(staffReservationActions(["COMPLETED"]), ["COMPLETED"]);
    assert.deepEqual(staffOrderActions(["READY", "CANCELLED"]), ["READY"]);
    assert.deepEqual(staffOrderActions(["CANCELLED"]), []);
  });
});
