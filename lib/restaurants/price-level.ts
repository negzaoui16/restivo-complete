/**
 * Price level (1 = cheap ... 4 = expensive) and cuisine helpers, as pure functions.
 * No imports, so node:test runs it.
 */

export const PRICE_LEVELS = [1, 2, 3, 4] as const;

/** Shown as suggestions only: the cuisine itself is free text. */
export const CUISINE_SUGGESTIONS = [
  "Tunisian",
  "Mediterranean",
  "Seafood",
  "Italian",
  "French",
  "Lebanese",
  "Asian",
  "Grill",
  "Pizza",
  "Cafe & Bakery",
  "Fast food",
  "Vegetarian",
] as const;

/** Short currency sign: "DT" for the Tunisian dinar, the usual narrow symbol elsewhere. */
export function currencySign(currency: string): string {
  if (currency.toUpperCase() === "TND") return "DT";
  try {
    const parts = new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/** True for a whole number from 1 to 4. */
export function isPriceLevel(value: unknown): value is 1 | 2 | 3 | 4 {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4;
}

/**
 * "$$" style label: the sign repeated once per level ("€€€", "DT DT"). Empty when
 * the level is missing or invalid, so callers can simply not render it.
 */
export function priceLevelLabel(level: number | null | undefined, currency: string): string {
  if (!isPriceLevel(level)) return "";
  const sign = currencySign(currency);
  return Array.from({ length: level }, () => sign).join(sign.length > 1 ? " " : "");
}

/** Accessible description of the level, e.g. "Price level 2 of 4". */
export function priceLevelDescription(level: number | null | undefined): string {
  return isPriceLevel(level) ? `Price level ${level} of 4` : "";
}
