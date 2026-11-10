import assert from "node:assert/strict";
import { test } from "node:test";
import { publishBlocker, statusChange } from "./publish.ts";

test("a restaurant without floors cannot be published", () => {
  assert.equal(publishBlocker([]), "NO_ACTIVE_FLOOR");
});

test("inactive floors do not count, even when they hold tables", () => {
  assert.equal(publishBlocker([{ isActive: false, activeTableCount: 12 }]), "NO_ACTIVE_FLOOR");
});

test("an active floor with no table cannot be published", () => {
  assert.equal(publishBlocker([{ isActive: true, activeTableCount: 0 }]), "NO_TABLE");
});

test("tables on an inactive floor do not unlock publication", () => {
  assert.equal(
    publishBlocker([
      { isActive: true, activeTableCount: 0 },
      { isActive: false, activeTableCount: 5 },
    ]),
    "NO_TABLE"
  );
});

test("one active floor with one table is enough", () => {
  assert.equal(
    publishBlocker([
      { isActive: true, activeTableCount: 0 },
      { isActive: true, activeTableCount: 1 },
    ]),
    null
  );
});

test("only DRAFT and ACTIVE restaurants can switch", () => {
  assert.equal(statusChange("DRAFT", "ACTIVE"), "ok");
  assert.equal(statusChange("ACTIVE", "DRAFT"), "ok");
  assert.equal(statusChange("ACTIVE", "ACTIVE"), "same");
  assert.equal(statusChange("DRAFT", "DRAFT"), "same");
  assert.equal(statusChange("SUSPENDED", "ACTIVE"), "locked");
  assert.equal(statusChange("ARCHIVED", "DRAFT"), "locked");
});
