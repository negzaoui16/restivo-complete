import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPrice, normalizePrice, priceMinor } from "./pricing.ts";

const ok = (input: string | number, currency = "TND") => {
  const result = normalizePrice(input, currency);
  assert.equal(result.ok, true, `${input} should be valid`);
  return result.ok ? result.value : "";
};

test("TND prices are padded to 3 decimals", () => {
  assert.equal(ok("18.5"), "18.500");
  assert.equal(ok("18"), "18.000");
  assert.equal(ok("0.005"), "0.005");
  assert.equal(ok("18,5"), "18.500");
});

test("numbers from older callers are accepted", () => {
  assert.equal(ok(18.5), "18.500");
  assert.equal(ok(12), "12.000");
});

test("other currencies use their own decimals", () => {
  assert.equal(ok("9.9", "EUR"), "9.90");
  assert.equal(ok("500", "JPY"), "500");
});

test("too many decimals are refused, never rounded", () => {
  assert.equal(normalizePrice("18.5555", "TND").ok, false);
  assert.equal(normalizePrice("9.999", "EUR").ok, false);
  assert.equal(normalizePrice("1.5", "JPY").ok, false);
});

test("malformed, negative and huge values are refused", () => {
  for (const bad of ["", "abc", "-1", "1e3", "1.", ".5", "12 5", "999999999"]) {
    assert.equal(normalizePrice(bad, "TND").ok, false, bad);
  }
  assert.equal(normalizePrice(-3, "TND").ok, false);
  assert.equal(normalizePrice(Number.NaN, "TND").ok, false);
  assert.equal(normalizePrice(1e21, "TND").ok, false);
});

test("float noise cannot leak into the stored value", () => {
  assert.equal(normalizePrice(0.1 + 0.2, "TND").ok, false);
  assert.equal(ok(1.005), "1.005");
});

test("formatPrice pads stored values and keeps unknown text", () => {
  assert.equal(formatPrice("18.5", "TND"), "18.500");
  assert.equal(formatPrice("18.500", "TND"), "18.500");
  assert.equal(formatPrice("n/a", "TND"), "n/a");
});

test("priceMinor gives integers for filters", () => {
  assert.equal(priceMinor("15.000", "TND"), BigInt(15000));
  assert.equal(priceMinor("30.001", "TND") > priceMinor("30", "TND"), true);
});
