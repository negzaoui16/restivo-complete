import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { isPgUniqueViolation } from "@/lib/auth/errors";
import { RestaurantError } from "@/lib/restaurants/errors";
import {
  PUBLISH_BLOCKER_MESSAGES,
  publishBlocker,
  statusChange,
  type PublishableStatus,
  type PublishFloor,
} from "./publish";
import { slugCandidate, slugifyRestaurantName } from "./slug";
import { toPublicRestaurant, type PublicRestaurant } from "./serialize";
import type { CreateRestaurantBody, UpdateHoursBody, UpdateRestaurantBody } from "./validation";

const SLUG_ATTEMPTS = 12;

async function allocateSlug(
  name: string,
  slugTaken: (slug: string) => Promise<unknown>
): Promise<string> {
  const base = slugifyRestaurantName(name);

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const slug = slugCandidate(base, attempt);
    const existing = await slugTaken(slug);
    if (!existing) return slug;
  }

  throw new RestaurantError("SLUG_TAKEN");
}

export async function createRestaurantForOwner(
  userId: string,
  input: CreateRestaurantBody
): Promise<PublicRestaurant> {
  try {
    const restaurant = await db.transaction(async (tx) => {
      const slug = await allocateSlug(input.name, (candidate) =>
        tx.orm.public.Restaurant.where({ slug: candidate }).first()
      );

      const created = await tx.orm.public.Restaurant.create({
        ownerId: userId,
        name: input.name,
        slug,
        description: input.description ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        website: input.website ?? null,
        cuisine: input.cuisine ?? null,
        priceLevel: input.priceLevel ?? null,
        logoUrl: input.logoUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        postalCode: input.postalCode ?? null,
        currency: input.currency,
        timezone: input.timezone,
        status: "DRAFT",
      });

      await tx.orm.public.RestaurantMembership.create({
        userId,
        restaurantId: created.id,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: Temporal.Now.instant(),
      });

      for (const day of input.hours) {
        await tx.orm.public.BusinessHours.create({
          restaurantId: created.id,
          dayOfWeek: day.dayOfWeek,
          isClosed: day.isClosed,
          openTime: day.isClosed ? null : (day.openTime ?? null),
          closeTime: day.isClosed ? null : (day.closeTime ?? null),
        });
      }

      await tx.orm.public.Floor.create({
        restaurantId: created.id,
        name: input.floor.name,
        level: 0,
        width: String(input.floor.width),
        height: String(input.floor.height),
        sortOrder: 0,
        isActive: true,
      });

      await tx.orm.public.AuditLog.create({
        userId,
        restaurantId: created.id,
        action: "CREATE",
        entityType: "Restaurant",
        entityId: created.id,
        metadata: { name: created.name, slug: created.slug },
      });

      return created;
    });

    return toPublicRestaurant(restaurant, {
      role: "OWNER",
      floorsCount: 1,
    });
  } catch (err) {
    if (isPgUniqueViolation(err)) throw new RestaurantError("SLUG_TAKEN");
    throw err;
  }
}

/**
 * Publishes (ACTIVE) or unpublishes (DRAFT) a restaurant. Publishing requires
 * an active floor that holds at least one active table. The check, the update
 * and the audit entry share one transaction.
 */
export async function setRestaurantStatus(
  userId: string,
  restaurantId: string,
  next: PublishableStatus
): Promise<{ id: string; status: PublishableStatus }> {
  return db.transaction(async (tx) => {
    const restaurant = await tx.orm.public.Restaurant.where({ id: restaurantId }).first();
    if (!restaurant) throw new RestaurantError("NOT_FOUND", "Restaurant not found.");

    const change = statusChange(restaurant.status, next);
    if (change === "locked") {
      throw new RestaurantError(
        "CONFLICT",
        "This restaurant is suspended or archived. Its visibility cannot be changed here."
      );
    }
    if (change === "same") return { id: restaurant.id, status: next };

    if (next === "ACTIVE") {
      const floors = await tx.orm.public.Floor.where({ restaurantId }).all();
      const summary: PublishFloor[] = [];
      for (const floor of floors) {
        const tables = await tx.orm.public.Table.where({ floorId: floor.id, isActive: true }).all();
        summary.push({ isActive: floor.isActive, activeTableCount: tables.length });
      }
      const blocker = publishBlocker(summary);
      if (blocker) throw new RestaurantError("NOT_PUBLISHABLE", PUBLISH_BLOCKER_MESSAGES[blocker]);
    }

    await tx.orm.public.Restaurant.where({ id: restaurantId }).update({ status: next });
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId,
      action: "STATUS_CHANGE",
      entityType: "Restaurant",
      entityId: restaurantId,
      metadata: { from: restaurant.status, to: next },
    });

    return { id: restaurant.id, status: next };
  });
}

export async function listManagedRestaurants(userId: string): Promise<PublicRestaurant[]> {
  const [owned, memberships] = await Promise.all([
    db.orm.public.Restaurant.where({ ownerId: userId }).all(),
    db.orm.public.RestaurantMembership.where({ userId, status: "ACTIVE" }).all(),
  ]);

  const roleByRestaurantId = new Map<string, "OWNER" | "MANAGER">();

  for (const row of owned) {
    roleByRestaurantId.set(row.id, "OWNER");
  }

  for (const membership of memberships) {
    if (membership.role !== "OWNER" && membership.role !== "MANAGER") continue;
    const existing = roleByRestaurantId.get(membership.restaurantId);
    if (membership.role === "OWNER" || !existing) {
      roleByRestaurantId.set(membership.restaurantId, membership.role);
    }
  }

  const restaurants = [...owned];
  const ownedIds = new Set(owned.map((row) => row.id));

  for (const membership of memberships) {
    if (!roleByRestaurantId.has(membership.restaurantId)) continue;
    if (ownedIds.has(membership.restaurantId)) continue;
    const row = await db.orm.public.Restaurant.where({
      id: membership.restaurantId,
    }).first();
    if (row) restaurants.push(row);
  }

  const result: PublicRestaurant[] = [];

  for (const restaurant of restaurants) {
    const role = roleByRestaurantId.get(restaurant.id);
    if (!role) continue;
    const floors = await db.orm.public.Floor.where({
      restaurantId: restaurant.id,
    }).all();
    result.push(
      toPublicRestaurant(restaurant, {
        role,
        floorsCount: floors.length,
      })
    );
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

const PROFILE_FIELDS = [
  "name",
  "description",
  "address",
  "city",
  "country",
  "postalCode",
  "website",
  "phone",
  "email",
  "cuisine",
  "priceLevel",
  "logoUrl",
  "coverUrl",
] as const;

/**
 * Edits the profile. Only the keys present in `input` are touched; an empty value
 * clears an optional field. The slug is left alone so shared links keep working.
 * The audit entry lists the names of the changed fields, never their values
 * (phone and email are personal data).
 */
export async function updateRestaurantProfile(
  userId: string,
  restaurantId: string,
  role: "OWNER" | "MANAGER",
  input: UpdateRestaurantBody
): Promise<PublicRestaurant> {
  const updated = await db.transaction(async (tx) => {
    const current = await tx.orm.public.Restaurant.where({ id: restaurantId }).first();
    if (!current) throw new RestaurantError("NOT_FOUND", "Restaurant not found.");

    const changes: Record<string, string | number | null> = {};
    for (const field of PROFILE_FIELDS) {
      const next = input[field];
      if (next !== undefined && next !== current[field]) changes[field] = next;
    }
    if (changes.name === null) throw new RestaurantError("VALIDATION_ERROR", "Restaurant name is required.", "name");
    const changed = Object.keys(changes);
    if (changed.length === 0) return current;

    const row = await tx.orm.public.Restaurant.where({ id: restaurantId }).update(changes);
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId,
      action: "UPDATE",
      entityType: "Restaurant",
      entityId: restaurantId,
      metadata: { fields: changed },
    });
    return row ?? { ...current, ...changes };
  });

  const floors = await db.orm.public.Floor.where({ restaurantId }).all();
  return toPublicRestaurant(updated, { role, floorsCount: floors.length });
}

export type PublicHoursDay = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

function hhmm(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

/** The 7 weekly days, Sunday (0) to Saturday (6); a missing day reads as closed. */
export async function getBusinessHours(restaurantId: string): Promise<PublicHoursDay[]> {
  const rows = await db.orm.public.BusinessHours.where({ restaurantId }).all();
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const row = rows.find((entry) => entry.dayOfWeek === dayOfWeek);
    return row && !row.isClosed
      ? { dayOfWeek, isClosed: false, openTime: hhmm(row.openTime), closeTime: hhmm(row.closeTime) }
      : { dayOfWeek, isClosed: true, openTime: null, closeTime: null };
  });
}

/** Replaces the 7 days in one transaction and logs which weekdays changed. */
export async function updateBusinessHours(
  userId: string,
  restaurantId: string,
  input: UpdateHoursBody
): Promise<PublicHoursDay[]> {
  const before = await getBusinessHours(restaurantId);
  const next = [...input.hours]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isClosed: day.isClosed,
      openTime: day.isClosed ? null : day.openTime,
      closeTime: day.isClosed ? null : day.closeTime,
    }));
  const changedDays = next
    .filter((day, index) => JSON.stringify(day) !== JSON.stringify(before[index]))
    .map((day) => day.dayOfWeek);

  await db.transaction(async (tx) => {
    for (const day of next) {
      const existing = await tx.orm.public.BusinessHours.where({ restaurantId, dayOfWeek: day.dayOfWeek }).first();
      if (existing) {
        await tx.orm.public.BusinessHours.where({ id: existing.id }).update({
          isClosed: day.isClosed,
          openTime: day.openTime,
          closeTime: day.closeTime,
        });
      } else {
        await tx.orm.public.BusinessHours.create({ restaurantId, ...day });
      }
    }
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId,
      action: "UPDATE",
      entityType: "BusinessHours",
      entityId: restaurantId,
      metadata: { fields: ["hours"], days: changedDays },
    });
  });

  return getBusinessHours(restaurantId);
}
