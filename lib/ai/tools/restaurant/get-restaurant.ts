import { db } from "@/lib/db";
import { noArgs } from "../args";
import { defineTool } from "../types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getRestaurant = defineTool({
  name: "get_restaurant",
  description: "Read this restaurant: name, status, address, contact, currency, timezone, and weekly hours.",
  parameters: noArgs.parameters,
  schema: noArgs.schema,
  run: readRestaurant,
});

async function readRestaurant(restaurantId: string, _args: Record<string, never>) {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant) return { found: false };

  const hours = await db.orm.public.BusinessHours.where({ restaurantId }).all();

  return {
    found: true,
    name: restaurant.name,
    status: restaurant.status,
    description: restaurant.description,
    phone: restaurant.phone,
    email: restaurant.email,
    website: restaurant.website,
    address: restaurant.address,
    city: restaurant.city,
    country: restaurant.country,
    currency: restaurant.currency,
    timezone: restaurant.timezone,
    hours: hours
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((day) => ({
        day: DAYS[day.dayOfWeek] ?? String(day.dayOfWeek),
        closed: day.isClosed,
        open: day.isClosed ? null : day.openTime,
        close: day.isClosed ? null : day.closeTime,
      })),
  };
}
