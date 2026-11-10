import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Temporal } from "temporal-polyfill";
import {
  bookingLockKeys,
  canCancel,
  fitsBusinessHours,
  fitsCapacity,
  hasConflict,
  leadTimeIssue,
  makeReservationCode,
  overlaps,
  ownsReservation,
  parseSlot,
  type HoursDay,
  type Slot,
} from "./rules.ts";

const DURATION = 90;
const TUNIS = "Africa/Tunis"; // UTC+1 all year

// Stored: 0 = Sunday. Open Monday to Saturday 11:00-23:00, closed Sunday.
const HOURS: HoursDay[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isClosed: dayOfWeek === 0,
  openTime: dayOfWeek === 0 ? null : "11:00",
  closeTime: dayOfWeek === 0 ? null : "23:00",
}));

function slotAt(date: string, time: string, timeZone = TUNIS): Slot {
  const parsed = parseSlot(date, time, timeZone, DURATION);
  assert.ok(parsed.ok, "slot should parse");
  return parsed.slot;
}

const ms = (iso: string) => Temporal.Instant.from(iso).epochMilliseconds;
const span = (start: string, end: string) => ({ startsAtMs: ms(start), endsAtMs: ms(end) });

describe("parseSlot", () => {
  it("converts restaurant-local time to UTC and adds the slot length", () => {
    const slot = slotAt("2026-11-03", "19:30");
    assert.equal(slot.startsAt.toString(), "2026-11-03T18:30:00Z");
    assert.equal(slot.endsAt.toString(), "2026-11-03T20:00:00Z");
  });

  it("follows daylight saving in the restaurant timezone", () => {
    assert.equal(slotAt("2026-07-01", "20:00", "Europe/Paris").startsAt.toString(), "2026-07-01T18:00:00Z");
    assert.equal(slotAt("2026-12-01", "20:00", "Europe/Paris").startsAt.toString(), "2026-12-01T19:00:00Z");
  });

  it("rejects malformed or impossible dates and times", () => {
    for (const [date, time] of [
      ["2026-02-30", "19:00"],
      ["2026-13-01", "19:00"],
      ["03/11/2026", "19:00"],
      ["2026-11-03", "25:00"],
      ["2026-11-03", "7pm"],
    ]) {
      assert.equal(parseSlot(date, time, TUNIS, DURATION).ok, false, `${date} ${time}`);
    }
  });
});

describe("fitsBusinessHours", () => {
  it("accepts a slot inside the opening hours", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "19:00"), DURATION), true);
  });

  it("accepts a slot that starts at opening and one that ends exactly at closing", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "11:00"), DURATION), true);
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "21:30"), DURATION), true);
  });

  it("rejects a slot that ends after closing time", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "21:31"), DURATION), false);
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "22:30"), DURATION), false);
  });

  it("rejects a slot that starts before opening", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "10:30"), DURATION), false);
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "03:00"), DURATION), false);
  });

  it("rejects a closed day (2026-11-01 is a Sunday)", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-01", "19:00"), DURATION), false);
  });

  it("uses the weekday of the restaurant timezone, not UTC", () => {
    // Monday 2026-11-02 00:30 in Tunis is still Sunday 23:30 UTC, but the day is Monday.
    const early = [{ dayOfWeek: 1, isClosed: false, openTime: "00:00", closeTime: "23:00" }];
    assert.equal(fitsBusinessHours(early, slotAt("2026-11-02", "00:30"), DURATION), true);
  });

  it("rejects a missing day", () => {
    assert.equal(fitsBusinessHours([], slotAt("2026-11-03", "19:00"), DURATION), false);
  });

  it("rejects a day whose closing time equals its opening time", () => {
    const equal = [{ dayOfWeek: 2, isClosed: false, openTime: "09:00", closeTime: "09:00" }];
    assert.equal(fitsBusinessHours(equal, slotAt("2026-11-03", "09:00"), DURATION), false);
    assert.equal(fitsBusinessHours(equal, slotAt("2026-11-03", "12:00"), DURATION), false);
  });
});

describe("fitsBusinessHours, hours past midnight", () => {
  // Sunday 12:00-03:00, Monday closed, Tuesday-Saturday 11:00-23:00 (2026-11-01 is a Sunday).
  const NIGHT: HoursDay[] = [
    { dayOfWeek: 0, isClosed: false, openTime: "12:00", closeTime: "03:00" },
    { dayOfWeek: 1, isClosed: true, openTime: null, closeTime: null },
    ...[2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, isClosed: false, openTime: "11:00", closeTime: "23:00" })),
  ];
  const fits = (date: string, time: string) => fitsBusinessHours(NIGHT, slotAt(date, time), DURATION);

  it("accepts Sunday 22:00 in a restaurant open from 12:00 to 03:00", () => {
    assert.equal(fits("2026-11-01", "22:00"), true);
  });

  it("accepts the edges of the opening day", () => {
    assert.equal(fits("2026-11-01", "12:00"), true);
    assert.equal(fits("2026-11-01", "11:59"), false);
  });

  it("accepts a slot that runs across midnight", () => {
    assert.equal(fits("2026-11-01", "23:30"), true); // ends Monday 01:00
    assert.equal(fits("2026-11-01", "23:59"), true); // ends Monday 01:29
  });

  it("attaches a slot after midnight to the previous day's window", () => {
    assert.equal(fits("2026-11-02", "00:00"), true); // Monday, closed day, but Sunday's window is open
    assert.equal(fits("2026-11-02", "01:00"), true);
  });

  it("accepts a slot ending exactly at the closing time, and refuses one minute more", () => {
    assert.equal(fits("2026-11-02", "01:30"), true); // ends 03:00
    assert.equal(fits("2026-11-02", "01:31"), false);
    assert.equal(fits("2026-11-02", "03:00"), false);
  });

  it("refuses the rest of a closed Monday after the night window ends", () => {
    assert.equal(fits("2026-11-02", "04:00"), false);
    assert.equal(fits("2026-11-02", "19:00"), false);
  });

  it("does not stretch a normal day past midnight", () => {
    assert.equal(fits("2026-11-07", "21:30"), true); // Saturday, ends 23:00 exactly
    assert.equal(fits("2026-11-07", "22:00"), false);
    assert.equal(fits("2026-11-08", "01:00"), false); // Sunday 01:00: Saturday does not close late, Sunday opens at 12:00
  });

  it("lets the next day open normally after a late night", () => {
    const hours: HoursDay[] = [
      { dayOfWeek: 1, isClosed: false, openTime: "18:00", closeTime: "02:00" },
      { dayOfWeek: 2, isClosed: false, openTime: "11:00", closeTime: "23:00" },
    ];
    assert.equal(fitsBusinessHours(hours, slotAt("2026-11-03", "00:30"), DURATION), true); // Tuesday 00:30, Monday's window
    assert.equal(fitsBusinessHours(hours, slotAt("2026-11-03", "01:00"), DURATION), false); // ends 02:30
    assert.equal(fitsBusinessHours(hours, slotAt("2026-11-03", "11:00"), DURATION), true); // Tuesday's own window
  });

  it("follows the clock change of another time zone instead of wall-clock arithmetic", () => {
    // Paris: Saturday 22:00 to Sunday 03:00, and the clocks jump from 02:00 to 03:00 on 2026-03-29.
    const hours: HoursDay[] = [{ dayOfWeek: 6, isClosed: false, openTime: "22:00", closeTime: "03:00" }];
    const paris = (iso: string): Slot => {
      const startsAt = Temporal.Instant.from(iso);
      return { startsAt, endsAt: startsAt, local: startsAt.toZonedDateTimeISO("Europe/Paris") };
    };
    const start = "2026-03-29T00:30:00Z"; // 01:30 CET, before the jump
    // 30 minutes end at 03:00 CEST, the closing time: fits.
    assert.equal(fitsBusinessHours(hours, paris(start), 30), true);
    // 90 minutes end at 04:00 CEST: wall-clock arithmetic (01:30 + 90 = 03:00) would wrongly accept it.
    assert.equal(fitsBusinessHours(hours, paris(start), 90), false);
  });

  it("counts the repeated hour when the clocks go back", () => {
    // Paris: Saturday 22:00 to Sunday 03:00; on 2026-10-25 the clocks go back from 03:00 to 02:00.
    const hours: HoursDay[] = [{ dayOfWeek: 6, isClosed: false, openTime: "22:00", closeTime: "03:00" }];
    const slot = (iso: string): Slot => {
      const startsAt = Temporal.Instant.from(iso);
      return { startsAt, endsAt: startsAt, local: startsAt.toZonedDateTimeISO("Europe/Paris") };
    };
    // The window really ends at 02:00Z (03:00 CET), one hour later than on a normal night.
    assert.equal(fitsBusinessHours(hours, slot("2026-10-25T00:30:00Z"), 90), true); // 02:30 CEST, ends 02:00Z
    assert.equal(fitsBusinessHours(hours, slot("2026-10-25T01:30:00Z"), 30), true); // second 02:30 (CET), ends 02:00Z
    assert.equal(fitsBusinessHours(hours, slot("2026-10-25T01:30:00Z"), 31), false);
  });
});

describe("leadTimeIssue", () => {
  const now = Temporal.Instant.from("2026-11-03T10:00:00Z");
  const at = (iso: string): Slot => ({
    startsAt: Temporal.Instant.from(iso),
    endsAt: Temporal.Instant.from(iso),
    local: Temporal.Instant.from(iso).toZonedDateTimeISO("UTC"),
  });

  it("rejects the past and anything under 30 minutes away", () => {
    assert.equal(leadTimeIssue(at("2026-11-02T10:00:00Z"), now, 30, 60), "TOO_SOON");
    assert.equal(leadTimeIssue(at("2026-11-03T10:29:00Z"), now, 30, 60), "TOO_SOON");
  });

  it("accepts exactly 30 minutes ahead", () => {
    assert.equal(leadTimeIssue(at("2026-11-03T10:30:00Z"), now, 30, 60), null);
  });

  it("accepts exactly 60 days ahead and rejects beyond", () => {
    assert.equal(leadTimeIssue(at("2027-01-02T10:00:00Z"), now, 30, 60), null);
    assert.equal(leadTimeIssue(at("2027-01-02T10:01:00Z"), now, 30, 60), "TOO_FAR");
  });
});

describe("fitsCapacity", () => {
  it("accepts guests up to the table capacity", () => {
    assert.equal(fitsCapacity(4, 4), true);
    assert.equal(fitsCapacity(1, 4), true);
  });

  it("rejects more guests than seats, and invalid counts", () => {
    assert.equal(fitsCapacity(5, 4), false);
    assert.equal(fitsCapacity(0, 4), false);
    assert.equal(fitsCapacity(2.5, 4), false);
  });

  it("honours an optional minimum", () => {
    assert.equal(fitsCapacity(1, 6, 2), false);
    assert.equal(fitsCapacity(2, 6, 2), true);
  });
});

describe("overlaps / hasConflict", () => {
  const booked = span("2026-11-03T18:30:00Z", "2026-11-03T20:00:00Z");

  it("detects the same slot, a partial overlap and containment", () => {
    assert.equal(overlaps(booked, booked), true);
    assert.equal(overlaps(booked, span("2026-11-03T19:30:00Z", "2026-11-03T21:00:00Z")), true);
    assert.equal(overlaps(booked, span("2026-11-03T17:30:00Z", "2026-11-03T18:31:00Z")), true);
    assert.equal(overlaps(booked, span("2026-11-03T18:45:00Z", "2026-11-03T19:15:00Z")), true);
  });

  it("allows back-to-back slots", () => {
    assert.equal(overlaps(booked, span("2026-11-03T20:00:00Z", "2026-11-03T21:30:00Z")), false);
    assert.equal(overlaps(booked, span("2026-11-03T17:00:00Z", "2026-11-03T18:30:00Z")), false);
  });

  it("allows a different day", () => {
    assert.equal(overlaps(booked, span("2026-11-04T18:30:00Z", "2026-11-04T20:00:00Z")), false);
  });

  it("hasConflict is false for an empty list and true when any entry clashes", () => {
    assert.equal(hasConflict([], booked), false);
    assert.equal(hasConflict([span("2026-11-03T08:00:00Z", "2026-11-03T09:30:00Z"), booked], booked), true);
  });
});

describe("canCancel", () => {
  const cancellable = ["PENDING", "CONFIRMED"];
  const now = ms("2026-11-03T10:00:00Z");

  it("allows an upcoming PENDING or CONFIRMED reservation", () => {
    assert.equal(canCancel("CONFIRMED", ms("2026-11-03T18:30:00Z"), now, cancellable), true);
    assert.equal(canCancel("PENDING", ms("2026-11-03T18:30:00Z"), now, cancellable), true);
  });

  it("refuses a reservation whose start has passed", () => {
    assert.equal(canCancel("CONFIRMED", ms("2026-11-03T09:00:00Z"), now, cancellable), false);
    assert.equal(canCancel("CONFIRMED", now, now, cancellable), false);
  });

  it("refuses statuses that are already settled", () => {
    for (const status of ["SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"]) {
      assert.equal(canCancel(status, ms("2026-11-03T18:30:00Z"), now, cancellable), false, status);
    }
  });
});

describe("ownsReservation", () => {
  it("only the customer who booked has access", () => {
    assert.equal(ownsReservation("user-a", "user-a"), true);
    assert.equal(ownsReservation("user-b", "user-a"), false);
  });
});

describe("makeReservationCode", () => {
  it("builds RST-XXXXXX from the readable alphabet", () => {
    const code = makeReservationCode((max) => max - 1);
    assert.match(code, /^RST-[A-HJKMNP-Z2-9]{6}$/);
  });

  it("never emits look-alike characters", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const code = makeReservationCode((max) => (seed * 7 + max) % max);
      assert.doesNotMatch(code.slice(4), /[01OIL]/);
    }
  });
});

describe("bookingLockKeys", () => {
  it("lists the keys in one fixed order, whichever table is current or next", () => {
    const forward = bookingLockKeys("r1", "tA", "tB");
    const backward = bookingLockKeys("r2", "tB", "tA");
    assert.deepEqual(
      forward.filter((key) => key.startsWith("reservation-table:")),
      backward.filter((key) => key.startsWith("reservation-table:")),
    );
    assert.deepEqual(forward, [...forward].sort());
  });

  it("takes a single table lock when the table does not change", () => {
    assert.deepEqual(bookingLockKeys("r1", "tA", "tA"), ["reservation-table:tA", "reservation:r1"]);
  });
});
