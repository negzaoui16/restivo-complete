import { z } from "zod";
import { RestaurantError } from "@/lib/restaurants/errors";

const searchSchema = z.string().trim().max(80, "Search text is too long.");

/** Reads the optional `?q=` parameter of the restaurant list. */
export function parseSearchParam(url: string): string {
  const raw = new URL(url).searchParams.get("q") ?? "";
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new RestaurantError("VALIDATION_ERROR", parsed.error.issues[0]?.message);
  }
  return parsed.data;
}

const cuisineSchema = z.string().trim().max(60, "Cuisine filter is too long.");
const priceSchema = z
  .string()
  .trim()
  .transform((text) => (text === "" ? [] : text.split(",").map((part) => (part.trim() === "" ? Number.NaN : Number(part.trim())))))
  .pipe(z.array(z.number({ error: "Price level is 1 to 4." }).int("Price level is 1 to 4.").min(1, "Price level is 1 to 4.").max(4, "Price level is 1 to 4.")).max(4));

/** Reads `?q=`, `?cuisine=` and `?price=1,2` of the restaurant list. */
export function parseDiscoverQuery(url: string): { q: string; cuisine: string; price: number[] } {
  const params = new URL(url).searchParams;
  const cuisine = cuisineSchema.safeParse(params.get("cuisine") ?? "");
  if (!cuisine.success) throw new RestaurantError("VALIDATION_ERROR", cuisine.error.issues[0]?.message, "cuisine");
  const price = priceSchema.safeParse(params.get("price") ?? "");
  if (!price.success) throw new RestaurantError("VALIDATION_ERROR", price.error.issues[0]?.message, "price");
  return { q: parseSearchParam(url), cuisine: cuisine.data, price: [...new Set(price.data)] };
}
