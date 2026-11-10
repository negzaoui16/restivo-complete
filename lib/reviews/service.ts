/**
 * Reviews of completed reservations. One per reservation, written by the customer,
 * published at once, summarised per restaurant with one query (no query per restaurant).
 */
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { isPgUniqueViolation } from "@/lib/auth/errors";
import { RestaurantError } from "@/lib/restaurants/errors";
import { ReservationError } from "@/lib/reservations/errors";
import { REVIEW_ISSUE_MESSAGES, reviewIssue, reviewerLabel, summarize, summarizeBy, type RatingSummary } from "./rules";
import type { PublicReview, ReviewPage } from "./types";
import type { CreateReviewBody } from "./validation";

function iso(value: unknown): string {
  return Temporal.Instant.from(String(value)).toString();
}

/** Mean rating and count of every restaurant that has a published review, from one query. */
export async function ratingSummaries(): Promise<Map<string, RatingSummary>> {
  const published = await db.orm.public.Review.where({ status: "PUBLISHED" }).all();
  return summarizeBy(published, (row) => row.restaurantId, (row) => row.rating);
}

export const NO_RATING: RatingSummary = { count: 0, average: null };

export async function createReview(userId: string, reservationId: string, input: CreateReviewBody): Promise<PublicReview> {
  const reservation = await db.orm.public.Reservation.where({ id: reservationId }).first();
  if (!reservation) throw new ReservationError("NOT_FOUND", "Reservation not found.");

  const existing = await db.orm.public.Review.where({ reservationId }).first();
  const issue = reviewIssue({
    reservationStatus: reservation.status,
    customerId: reservation.customerId,
    userId,
    alreadyReviewed: Boolean(existing),
  });
  if (issue === "NOT_OWNER") throw new ReservationError("FORBIDDEN", REVIEW_ISSUE_MESSAGES[issue]);
  if (issue === "NOT_COMPLETED") throw new ReservationError("NOT_REVIEWABLE");
  if (issue === "ALREADY_REVIEWED") throw new ReservationError("ALREADY_REVIEWED");

  try {
    const created = await db.transaction(async (tx) => {
      const row = await tx.orm.public.Review.create({
        customerId: userId,
        restaurantId: reservation.restaurantId,
        reservationId,
        rating: input.rating,
        comment: input.comment ?? null,
        status: "PUBLISHED",
      });
      await tx.orm.public.AuditLog.create({
        userId,
        restaurantId: reservation.restaurantId,
        action: "CREATE",
        entityType: "Review",
        entityId: row.id,
        metadata: { rating: input.rating, reservationId },
      });
      return row;
    });
    const profile = await db.orm.public.Profile.where({ userId }).first();
    return {
      id: created.id,
      rating: created.rating,
      comment: created.comment,
      createdAt: iso(created.createdAt),
      author: reviewerLabel(profile ?? null),
    };
  } catch (err) {
    // Two requests at once: the unique key on the reservation lets only one through.
    if (isPgUniqueViolation(err)) throw new ReservationError("ALREADY_REVIEWED");
    throw err;
  }
}

/** Published reviews of an active restaurant, newest first, one page at a time. */
export async function listReviews(restaurantId: string, page: number, pageSize: number): Promise<ReviewPage> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant || restaurant.status !== "ACTIVE") throw new RestaurantError("NOT_FOUND", "Restaurant not found.");

  const rows = (await db.orm.public.Review.where({ restaurantId, status: "PUBLISHED" }).all()).sort(
    (a, b) => Date.parse(iso(b.createdAt)) - Date.parse(iso(a.createdAt)),
  );
  const { count, average } = summarize(rows.map((row) => row.rating));
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  const names = new Map<string, string>();
  for (const userId of new Set(slice.map((row) => row.customerId))) {
    names.set(userId, reviewerLabel((await db.orm.public.Profile.where({ userId }).first()) ?? null));
  }

  return {
    reviews: slice.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: iso(row.createdAt),
      author: names.get(row.customerId) ?? "Guest",
    })),
    count,
    average,
    page,
    pageSize,
    hasMore: page * pageSize < count,
  };
}
