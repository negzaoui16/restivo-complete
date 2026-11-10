/**
 * Review rules as pure functions (no imports, so node:test runs them).
 *
 * A customer reviews a reservation that is COMPLETED, their own, once. A review is
 * published at once: HIDDEN is kept for a later moderation step and PENDING is not used.
 */

export const MAX_COMMENT_LENGTH = 1000;

export type ReviewIssue = "NOT_OWNER" | "NOT_COMPLETED" | "ALREADY_REVIEWED";

export const REVIEW_ISSUE_MESSAGES: Record<ReviewIssue, string> = {
  NOT_OWNER: "This reservation belongs to another customer.",
  NOT_COMPLETED: "You can review a reservation once the restaurant has marked it as completed.",
  ALREADY_REVIEWED: "You already reviewed this reservation.",
};

export function reviewIssue(input: {
  reservationStatus: string;
  customerId: string;
  userId: string;
  alreadyReviewed: boolean;
}): ReviewIssue | null {
  if (input.customerId !== input.userId) return "NOT_OWNER";
  if (input.reservationStatus !== "COMPLETED") return "NOT_COMPLETED";
  if (input.alreadyReviewed) return "ALREADY_REVIEWED";
  return null;
}

export type RatingSummary = { count: number; average: number | null };

/** Number of ratings and their mean rounded to one decimal; no ratings means no average. */
export function summarize(ratings: number[]): RatingSummary {
  if (ratings.length === 0) return { count: 0, average: null };
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return { count: ratings.length, average: Math.round((total / ratings.length) * 10) / 10 };
}

/** Ratings grouped by restaurant, one pass: { restaurantId -> summary }. */
export function summarizeBy<T>(rows: T[], keyOf: (row: T) => string, ratingOf: (row: T) => number): Map<string, RatingSummary> {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = groups.get(key);
    if (list) list.push(ratingOf(row));
    else groups.set(key, [ratingOf(row)]);
  }
  return new Map([...groups].map(([key, ratings]) => [key, summarize(ratings)]));
}

/** "Sarah B." - the first name and the initial of the last name, never the full name. */
export function reviewerLabel(
  profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null,
): string {
  const first = profile?.firstName?.trim();
  const last = profile?.lastName?.trim();
  if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`;
  if (first) return first;
  const display = profile?.displayName?.trim();
  if (display) return display.split(/\s+/)[0] ?? "Guest";
  return "Guest";
}
