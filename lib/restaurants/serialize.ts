export type PublicRestaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  coverUrl: string | null;
  cuisine: string | null;
  /** 1 (cheap) to 4 (expensive). */
  priceLevel: number | null;
  role: "OWNER" | "MANAGER";
  floorsCount: number;
  tablesCount: number;
  capacity: number;
  createdAt: string | null;
};

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: PublicRestaurant["status"];
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  coverUrl: string | null;
  cuisine: string | null;
  priceLevel: number | null;
  createdAt: { toString?: () => string } | string | null;
};

function instantToString(value: RestaurantRow["createdAt"]): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toString?.() ?? null;
}

export function toPublicRestaurant(
  restaurant: RestaurantRow,
  extras: {
    role: "OWNER" | "MANAGER";
    floorsCount: number;
    tablesCount?: number;
    capacity?: number;
  }
): PublicRestaurant {
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    status: restaurant.status,
    phone: restaurant.phone,
    email: restaurant.email,
    website: restaurant.website,
    address: restaurant.address,
    city: restaurant.city,
    country: restaurant.country,
    postalCode: restaurant.postalCode,
    currency: restaurant.currency,
    timezone: restaurant.timezone,
    logoUrl: restaurant.logoUrl,
    coverUrl: restaurant.coverUrl,
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    role: extras.role,
    floorsCount: extras.floorsCount,
    tablesCount: extras.tablesCount ?? 0,
    capacity: extras.capacity ?? 0,
    createdAt: instantToString(restaurant.createdAt),
  };
}
