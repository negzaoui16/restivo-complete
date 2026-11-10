import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closesNextDay, describeHours, hoursProblem } from "./hours.ts";

const day = (openTime: string | null, closeTime: string | null, isClosed = false) => ({
  dayOfWeek: 1,
  isClosed,
  openTime,
  closeTime,
});

describe("hoursProblem", () => {
  it("accepts a normal day and a day that closes after midnight", () => {
    assert.equal(hoursProblem(day("11:00", "23:00")), null);
    assert.equal(hoursProblem(day("12:00", "03:00")), null);
    assert.equal(hoursProblem(day("18:00", "00:00")), null);
  });

  it("refuses equal times: there is no 24-hour mode", () => {
    const issue = hoursProblem(day("09:00", "09:00"));
    assert.equal(issue?.field, "closeTime");
    assert.match(issue?.message ?? "", /differ/);
    assert.ok(hoursProblem(day("00:00", "00:00")));
  });

  it("ignores the times of a closed day", () => {
    assert.equal(hoursProblem(day(null, null, true)), null);
    assert.equal(hoursProblem(day("09:00", "09:00", true)), null);
  });

  it("blames the missing or malformed field", () => {
    assert.equal(hoursProblem(day(null, "23:00"))?.field, "openTime");
    assert.equal(hoursProblem(day("11:00", null))?.field, "closeTime");
    assert.equal(hoursProblem(day("11h", "23:00"))?.field, "openTime");
    assert.equal(hoursProblem(day("11:00", "24:00"))?.field, "closeTime");
  });
});

describe("closesNextDay and describeHours", () => {
  it("flags only a closing time earlier than the opening", () => {
    assert.equal(closesNextDay("12:00", "03:00"), true);
    assert.equal(closesNextDay("11:00", "23:00"), false);
    assert.equal(closesNextDay("11:00", "11:00"), false);
    assert.equal(closesNextDay(null, "03:00"), false);
  });

  it("writes the schedule for display", () => {
    assert.equal(describeHours(day("11:00", "23:00")), "11:00 - 23:00");
    assert.equal(describeHours(day("12:00:00", "03:00:00")), "12:00 - 03:00 (next day)");
    assert.equal(describeHours(day(null, null, true)), "Closed");
    assert.equal(describeHours(undefined), "Closed");
  });
});
