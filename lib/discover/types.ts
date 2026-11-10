import type { FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";

/** What a customer sees in the restaurant list. No owner or contact internals. */
export type DiscoverRestaurantSummary = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  cuisine: string | null;
  /** 1 (cheap) to 4 (expensive), or null when the restaurant did not set one. */
  priceLevel: number | null;
  currency: string;
  /** Mean of the published reviews to one decimal, null with none. */
  averageRating: number | null;
  reviewCount: number;
  /** Whether the signed-in customer marked this restaurant. */
  isFavorite: boolean;
};

export type DiscoverList = {
  restaurants: DiscoverRestaurantSummary[];
  /** Cuisines found among the published restaurants, for the filter chips. */
  cuisines: string[];
};

export type DiscoverHours = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export type DiscoverTable = {
  id: string;
  floorId: string;
  name: string;
  capacity: number;
};

export type DiscoverFloor = {
  id: string;
  name: string;
  width: number;
  height: number;
  objects: FloorObject[];
};

export type DiscoverRestaurantDetail = DiscoverRestaurantSummary & {
  address: string | null;
  phone: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  hours: DiscoverHours[];
  floors: DiscoverFloor[];
  tables: DiscoverTable[];
};
