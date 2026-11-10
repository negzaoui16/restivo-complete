import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reviewIssue, reviewerLabel, summarize, summarizeBy } from "./rules.ts";

const base = { reservationStatus: "COMPLETED", customerId: "c1", userId: "c1", alreadyReviewed: false };

describe("reviewIssue", () => {
  it("accepts the owner of a completed reservation with no review yet", () => {
    assert.equal(reviewIssue(base), null);
  });

  it("refuses every reservation that is not completed", () => {
    for (const reservationStatus of ["PENDING", "CONFIRMED", "SEATED", "CANCELLED", "NO_SHOW"]) {
      assert.equal(reviewIssue({ ...base, reservationStatus }), "NOT_COMPLETED", reservationStatus);
    }
  });

  it("refuses someone else's reservation first, then a second review", () => {
    assert.equal(reviewIssue({ ...base, userId: "c2" }), "NOT_OWNER");
    assert.equal(reviewIssue({ ...base, userId: "c2", reservationStatus: "PENDING" }), "NOT_OWNER");
    assert.equal(reviewIssue({ ...base, alreadyReviewed: true }), "ALREADY_REVIEWED");
  });
});

describe("summarize", () => {
  it("has no average without ratings", () => {
    assert.deepEqual(summarize([]), { count: 0, average: null });
  });

  it("averages to one decimal", () => {
    assert.deepEqual(summarize([5, 4]), { count: 2, average: 4.5 });
    assert.deepEqual(summarize([5, 5, 4]), { count: 3, average: 4.7 });
    assert.deepEqual(summarize([1]), { count: 1, average: 1 });
    assert.deepEqual(summarize([3, 4, 4]), { count: 3, average: 3.7 });
  });

  it("groups by restaurant in one pass", () => {
    const rows = [
      { restaurantId: "a", rating: 5 },
      { restaurantId: "b", rating: 2 },
      { restaurantId: "a", rating: 4 },
    ];
    const grouped = summarizeBy(rows, (row) => row.restaurantId, (row) => row.rating);
    assert.deepEqual(grouped.get("a"), { count: 2, average: 4.5 });
    assert.deepEqual(grouped.get("b"), { count: 1, average: 2 });
    assert.equal(grouped.get("c"), undefined);
  });
});

describe("reviewerLabel", () => {
  it("shows the first name and the initial of the last name", () => {
    assert.equal(reviewerLabel({ firstName: "Sarah", lastName: "ben ali" }), "Sarah B.");
  });

  it("falls back to the first name, the display name, then Guest", () => {
    assert.equal(reviewerLabel({ firstName: "Sarah" }), "Sarah");
    assert.equal(reviewerLabel({ displayName: "Sami Ben Ali" }), "Sami");
    assert.equal(reviewerLabel({ firstName: " ", lastName: " ", displayName: " " }), "Guest");
    assert.equal(reviewerLabel(null), "Guest");
  });
});
