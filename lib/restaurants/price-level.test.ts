import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currencySign, isPriceLevel, priceLevelDescription, priceLevelLabel } from "./price-level.ts";

describe("price level", () => {
  it("accepts only whole numbers from 1 to 4", () => {
    for (const ok of [1, 2, 3, 4]) assert.equal(isPriceLevel(ok), true);
    for (const bad of [0, 5, -1, 2.5, "2", null, undefined, Number.NaN]) assert.equal(isPriceLevel(bad), false);
  });

  it("repeats the currency sign once per level", () => {
    assert.equal(priceLevelLabel(3, "EUR"), "€€€");
    assert.equal(priceLevelLabel(1, "USD"), "$");
    assert.equal(priceLevelLabel(2, "TND"), "DT DT");
    assert.equal(priceLevelLabel(4, "TND"), "DT DT DT DT");
  });

  it("is empty when there is no valid level", () => {
    assert.equal(priceLevelLabel(null, "TND"), "");
    assert.equal(priceLevelLabel(undefined, "EUR"), "");
    assert.equal(priceLevelLabel(7, "EUR"), "");
  });

  it("falls back to the code for an unknown currency, and describes the level", () => {
    assert.equal(currencySign("tnd"), "DT");
    assert.equal(currencySign("???"), "???");
    assert.equal(priceLevelDescription(2), "Price level 2 of 4");
    assert.equal(priceLevelDescription(null), "");
  });
});
