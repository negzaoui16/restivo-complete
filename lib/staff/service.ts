import { db } from "@/lib/db";
import { RestaurantError } from "@/lib/restaurants/errors";
import type { JoinBoard, JoinRestaurant, MyJoinRequest, StaffMembership } from "./types";
import type { JoinRequestBody } from "./validation";

const OPEN_STATUSES = ["ACTIVE", "DRAFT"] as const;

type RestaurantRow = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  status: string;
};

function toRestaurant(row: RestaurantRow): JoinRestaurant {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    description: row.description,
    coverUrl: row.coverUrl ?? row.logoUrl,
  };
}

async function openRestaurants(): Promise<RestaurantRow[]> {
  const groups = await Promise.all(
    OPEN_STATUSES.map((status) => db.orm.public.Restaurant.where({ status }).all())
  );
  return groups.flat().sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadJoinBoard(userId: string): Promise<JoinBoard> {
  const [memberships, requests, restaurants] = await Promise.all([
    db.orm.public.RestaurantMembership.where({ userId, status: "ACTIVE", role: "STAFF" }).all(),
    db.orm.public.RestaurantMembershipRequest.where({ userId, status: "PENDING" }).all(),
    openRestaurants(),
  ]);

  const byId = new Map(restaurants.map((row) => [row.id, row]));
  const membership = await firstMembership(memberships, byId);
  const pending = await pendingRequests(requests, byId);

  return {
    membership,
    requests: pending,
    restaurants: restaurants.map(toRestaurant),
  };
}

async function firstMembership(
  memberships: { restaurantId: string }[],
  known: Map<string, RestaurantRow>
): Promise<StaffMembership | null> {
  const membership = memberships[0];
  if (!membership) return null;

  const restaurant = known.get(membership.restaurantId) ?? (await findRestaurant(membership.restaurantId));
  if (!restaurant) return null;

  return {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    city: restaurant.city,
    coverUrl: restaurant.coverUrl ?? restaurant.logoUrl,
  };
}

async function pendingRequests(
  requests: { id: string; restaurantId: string; message: string | null }[],
  known: Map<string, RestaurantRow>
): Promise<MyJoinRequest[]> {
  const rows: MyJoinRequest[] = [];

  for (const request of requests) {
    const restaurant = known.get(request.restaurantId) ?? (await findRestaurant(request.restaurantId));
    if (!restaurant) continue;
    rows.push({
      id: request.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      status: "PENDING",
      message: request.message,
    });
  }

  return rows;
}

async function findRestaurant(id: string): Promise<RestaurantRow | null> {
  const row = await db.orm.public.Restaurant.where({ id }).first();
  return row ?? null;
}

export async function createJoinRequest(userId: string, input: JoinRequestBody): Promise<MyJoinRequest> {
  const restaurant = await db.orm.public.Restaurant.where({ id: input.restaurantId }).first();
  if (!restaurant || !OPEN_STATUSES.includes(restaurant.status as (typeof OPEN_STATUSES)[number])) {
    throw new RestaurantError("NOT_FOUND", "That restaurant is not open for staff.");
  }

  const membership = await db.orm.public.RestaurantMembership.where({
    userId,
    restaurantId: restaurant.id,
    status: "ACTIVE",
  }).first();
  if (membership) {
    throw new RestaurantError("CONFLICT", "You already work at this restaurant.");
  }

  const existing = await db.orm.public.RestaurantMembershipRequest.where({
    userId,
    restaurantId: restaurant.id,
    status: "PENDING",
  }).first();
  if (existing) {
    throw new RestaurantError("CONFLICT", "You already asked to join this restaurant.");
  }

  const created = await db.transaction(async (tx) => {
    const request = await tx.orm.public.RestaurantMembershipRequest.create({
      userId,
      restaurantId: restaurant.id,
      status: "PENDING",
      message: input.message ?? null,
    });

    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId: restaurant.id,
      action: "CREATE",
      entityType: "RestaurantMembershipRequest",
      entityId: request.id,
      metadata: { status: "PENDING" },
    });

    return request;
  });

  return {
    id: created.id,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    status: "PENDING",
    message: created.message,
  };
}
