import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeTotals,
  currencyDecimals,
  formatMinor,
  parseDecimal,
  priceUnit,
  unitDiscount,
  type PromotionInput,
} from "./pricing.ts";

const pct = (id: string, value: string): PromotionInput => ({ id, type: "PERCENTAGE", value });
const fixed = (id: string, value: string): PromotionInput => ({ id, type: "FIXED_AMOUNT", value });

describe("currencyDecimals", () => {
  it("knows the decimals of common currencies", () => {
    assert.equal(currencyDecimals("TND"), 3);
    assert.equal(currencyDecimals("EUR"), 2);
    assert.equal(currencyDecimals("JPY"), 0);
  });

  it("falls back to 2 for an unknown code", () => {
    assert.equal(currencyDecimals("not a currency"), 2);
  });
});

describe("parseDecimal / formatMinor", () => {
  it("scales exactly, without floats", () => {
    assert.equal(parseDecimal("12.5", 3), 12500n);
    assert.equal(parseDecimal("12.500", 3), 12500n);
    assert.equal(parseDecimal("12", 3), 12000n);
    assert.equal(parseDecimal("0.001", 3), 1n);
    assert.equal(parseDecimal("0.1", 3) + parseDecimal("0.2", 3), parseDecimal("0.3", 3));
  });

  it("rounds extra digits half up", () => {
    assert.equal(parseDecimal("1.2345", 3), 1235n);
    assert.equal(parseDecimal("1.2344", 3), 1234n);
    assert.equal(parseDecimal("5.5", 0), 6n);
  });

  it("rejects non-decimal input", () => {
    for (const bad of ["", "abc", "-1", "1e3", "1,5", "1.2.3"]) {
      assert.throws(() => parseDecimal(bad, 3), undefined, bad);
    }
  });

  it("formats back with the currency decimals", () => {
    assert.equal(formatMinor(12500n, 3), "12.500");
    assert.equal(formatMinor(5n, 3), "0.005");
    assert.equal(formatMinor(0n, 3), "0.000");
    assert.equal(formatMinor(1234n, 2), "12.34");
    assert.equal(formatMinor(7n, 0), "7");
  });
});

describe("unitDiscount", () => {
  it("takes a percentage of the unit price (TND)", () => {
    assert.equal(unitDiscount(20000n, pct("p", "15"), 3), 3000n); // 20.000 - 15% = 3.000 off
  });

  it("rounds percentages half up", () => {
    assert.equal(unitDiscount(1005n, pct("p", "50"), 3), 503n); // 502.5 -> 503
    assert.equal(unitDiscount(333n, pct("p", "10"), 3), 33n); // 33.3 -> 33
  });

  it("supports fractional percentages", () => {
    assert.equal(unitDiscount(10000n, pct("p", "12.5"), 3), 1250n);
  });

  it("takes a fixed amount off each unit", () => {
    assert.equal(unitDiscount(20000n, fixed("p", "2.500"), 3), 2500n);
  });

  it("never exceeds the unit price", () => {
    assert.equal(unitDiscount(4000n, fixed("p", "9"), 3), 4000n);
    assert.equal(unitDiscount(4000n, pct("p", "100"), 3), 4000n);
    assert.equal(unitDiscount(4000n, pct("p", "250"), 3), 4000n);
  });
});

describe("priceUnit", () => {
  it("returns no discount without a promotion", () => {
    assert.deepEqual(priceUnit("12.500", [], 3), { unitPrice: 12500n, unitDiscount: 0n, promotionId: null });
  });

  it("applies the best single promotion and never stacks", () => {
    // 20.000: 10% = 2.000, fixed 3.000 -> the fixed one wins, alone.
    const priced = priceUnit("20.000", [pct("a", "10"), fixed("b", "3")], 3);
    assert.equal(priced.promotionId, "b");
    assert.equal(priced.unitDiscount, 3000n);
  });

  it("picks the percentage when it is larger", () => {
    const priced = priceUnit("20.000", [fixed("a", "1"), pct("b", "25")], 3);
    assert.equal(priced.promotionId, "b");
    assert.equal(priced.unitDiscount, 5000n);
  });

  it("breaks ties deterministically on the smaller id", () => {
    const first = priceUnit("10.000", [pct("z", "10"), fixed("a", "1")], 3);
    const second = priceUnit("10.000", [fixed("a", "1"), pct("z", "10")], 3);
    assert.equal(first.promotionId, "a");
    assert.equal(second.promotionId, "a");
  });
});

describe("computeTotals", () => {
  it("computes subtotal, discount and total for a TND order", () => {
    // 2 x Couscous 18.500 with 10% off, 1 x Salade 9.000 without.
    const couscous = priceUnit("18.500", [pct("p", "10")], 3); // 1.850 off per unit
    const salade = priceUnit("9.000", [], 3);
    const totals = computeTotals([
      { ...couscous, quantity: 2 },
      { ...salade, quantity: 1 },
    ]);
    assert.equal(formatMinor(totals.subtotal, 3), "46.000");
    assert.equal(formatMinor(totals.discount, 3), "3.700");
    assert.equal(formatMinor(totals.total, 3), "42.300");
  });

  it("is exact where floats are not", () => {
    const line = priceUnit("0.100", [], 3);
    const totals = computeTotals([{ ...line, quantity: 3 }]);
    assert.equal(formatMinor(totals.total, 3), "0.300");
  });

  it("an empty order totals zero", () => {
    assert.deepEqual(computeTotals([]), { subtotal: 0n, discount: 0n, total: 0n });
  });
});
