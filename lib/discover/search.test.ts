import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distinctCuisines, matchesFilters, matchesQuery } from "./search.ts";

const olive = { name: "Maison Olive", city: "La Marsa" };
const cafe = { name: "Café Sidi", city: null };

describe("matchesQuery", () => {
  it("matches everything when the query is empty or blank", () => {
    assert.equal(matchesQuery(olive, undefined), true);
    assert.equal(matchesQuery(olive, ""), true);
    assert.equal(matchesQuery(olive, "   "), true);
  });

  it("matches on name, ignoring case", () => {
    assert.equal(matchesQuery(olive, "OLIVE"), true);
    assert.equal(matchesQuery(olive, "maison o"), true);
  });

  it("matches on city", () => {
    assert.equal(matchesQuery(olive, "marsa"), true);
  });

  it("ignores accents in both directions", () => {
    assert.equal(matchesQuery(cafe, "cafe"), true);
    assert.equal(matchesQuery({ name: "Cafe Sidi", city: null }, "café"), true);
  });

  it("does not match unrelated text, and tolerates a missing city", () => {
    assert.equal(matchesQuery(olive, "pizza"), false);
    assert.equal(matchesQuery(cafe, "tunis"), false);
  });
});

describe("matchesFilters", () => {
  const tunisian = { cuisine: "Tunisian & Mediterranean", priceLevel: 2 };
  const unknown = { cuisine: null, priceLevel: null };

  it("matches everything without a filter", () => {
    assert.equal(matchesFilters(tunisian, {}), true);
    assert.equal(matchesFilters(unknown, {}), true);
    assert.equal(matchesFilters(unknown, { cuisine: "  ", price: [] }), true);
  });

  it("filters by cuisine, ignoring case and accents, on part of the text", () => {
    assert.equal(matchesFilters(tunisian, { cuisine: "tunisian" }), true);
    assert.equal(matchesFilters(tunisian, { cuisine: "MEDITERRANEAN" }), true);
    assert.equal(matchesFilters({ cuisine: "Café & Bakery", priceLevel: 1 }, { cuisine: "cafe" }), true);
    assert.equal(matchesFilters(tunisian, { cuisine: "italian" }), false);
    assert.equal(matchesFilters(unknown, { cuisine: "tunisian" }), false);
  });

  it("filters by one or several price levels", () => {
    assert.equal(matchesFilters(tunisian, { price: [2] }), true);
    assert.equal(matchesFilters(tunisian, { price: [1, 2] }), true);
    assert.equal(matchesFilters(tunisian, { price: [3, 4] }), false);
    assert.equal(matchesFilters(unknown, { price: [1, 2, 3, 4] }), false);
  });

  it("combines cuisine and price", () => {
    assert.equal(matchesFilters(tunisian, { cuisine: "tunisian", price: [2] }), true);
    assert.equal(matchesFilters(tunisian, { cuisine: "tunisian", price: [4] }), false);
    assert.equal(matchesFilters(tunisian, { cuisine: "pizza", price: [2] }), false);
  });
});

describe("distinctCuisines", () => {
  it("keeps one sorted spelling per cuisine and skips empty values", () => {
    assert.deepEqual(
      distinctCuisines(["Tunisian", "tunisian", "Café", "cafe", null, " ", "Italian"]),
      ["Café", "Italian", "Tunisian"],
    );
  });
});
