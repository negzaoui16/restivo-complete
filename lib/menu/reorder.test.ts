import assert from "node:assert/strict";
import { test } from "node:test";
import { moveRow, sortedRows } from "./reorder.ts";

const rows = [
  { id: "a", sortOrder: 0 },
  { id: "b", sortOrder: 1 },
  { id: "c", sortOrder: 2 },
];

test("moving down swaps with the next row", () => {
  assert.deepEqual(moveRow(rows, "a", "down"), [
    { id: "b", sortOrder: 0 },
    { id: "a", sortOrder: 1 },
  ]);
});

test("moving up swaps with the previous row", () => {
  assert.deepEqual(moveRow(rows, "c", "up"), [
    { id: "c", sortOrder: 1 },
    { id: "b", sortOrder: 2 },
  ]);
});

test("edges and unknown ids do nothing", () => {
  assert.equal(moveRow(rows, "a", "up"), null);
  assert.equal(moveRow(rows, "c", "down"), null);
  assert.equal(moveRow(rows, "zzz", "up"), null);
  assert.equal(moveRow([], "a", "up"), null);
});

test("gaps are closed when a row moves", () => {
  const gappy = [
    { id: "a", sortOrder: 3 },
    { id: "b", sortOrder: 7 },
  ];
  assert.deepEqual(moveRow(gappy, "b", "up"), [
    { id: "b", sortOrder: 0 },
    { id: "a", sortOrder: 1 },
  ]);
});

test("ties are broken by id so the move is deterministic", () => {
  const tied = [
    { id: "b", sortOrder: 0 },
    { id: "a", sortOrder: 0 },
    { id: "c", sortOrder: 0 },
  ];
  assert.deepEqual(sortedRows(tied).map((row) => row.id), ["a", "b", "c"]);
  assert.deepEqual(moveRow(tied, "c", "up"), [
    { id: "c", sortOrder: 1 },
    { id: "b", sortOrder: 2 },
  ]);
});
