/**
 * Customer-side restaurant search, kept free of imports so node:test can run
 * it directly. Customers filter by name or city only.
 */

export type Searchable = {
  name: string;
  city: string | null;
};

export type Filterable = {
  cuisine: string | null;
  priceLevel: number | null;
};

export type DiscoverFilters = {
  /** Free text; matches when the restaurant cuisine contains it. */
  cuisine?: string;
  /** Accepted price levels (1 to 4); empty or absent accepts any. */
  price?: number[];
};

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

/** Empty filter matches everything. Case and accents are ignored; a restaurant without a cuisine never matches a cuisine filter. */
export function matchesFilters(restaurant: Filterable, filters: DiscoverFilters): boolean {
  const needle = normalize(filters.cuisine ?? "");
  if (needle !== "" && !normalize(restaurant.cuisine ?? "").includes(needle)) return false;
  if (filters.price && filters.price.length > 0) {
    if (restaurant.priceLevel === null || !filters.price.includes(restaurant.priceLevel)) return false;
  }
  return true;
}

/** The distinct cuisines of a list, one spelling per accent- and case-insensitive value, sorted. */
export function distinctCuisines(cuisines: (string | null)[]): string[] {
  const seen = new Map<string, string>();
  for (const cuisine of cuisines) {
    const label = cuisine?.trim();
    if (label && !seen.has(normalize(label))) seen.set(normalize(label), label);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Empty query matches everything. Accents and case are ignored. */
export function matchesQuery(restaurant: Searchable, query: string | undefined): boolean {
  const needle = normalize(query ?? "");
  if (needle === "") return true;
  return (
    normalize(restaurant.name).includes(needle) ||
    normalize(restaurant.city ?? "").includes(needle)
  );
}
