"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { apiListReviews } from "@/lib/reviews/client";
import type { PublicReview, ReviewPage } from "@/lib/reviews/types";
import { RatingStars } from "./RatingStars";

/** Published reviews of a restaurant, newest first, ten at a time. */
export function ReviewsSection({ restaurantId }: { restaurantId: string }) {
  const [first, setFirst] = useState<ReviewPage | null>(null);
  const [more, setMore] = useState<PublicReview[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await apiListReviews(restaurantId, 1);
        if (cancelled) return;
        setFirst(result);
        setMore([]);
        setPage(1);
        setHasMore(result.hasMore);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the reviews.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, attempt]);

  async function showMore() {
    setLoadingMore(true);
    try {
      const result = await apiListReviews(restaurantId, page + 1);
      setMore((current) => [...current, ...result.reviews]);
      setPage(result.page);
      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more reviews.");
    } finally {
      setLoadingMore(false);
    }
  }

  const reviews = [...(first?.reviews ?? []), ...more];

  return (
    <section aria-labelledby="reviews-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reviews-title" className="text-base font-bold text-[#1A1A1A] sm:text-lg">
          Reviews
        </h2>
        {first && first.average !== null ? (
          <p className="flex items-center gap-2 text-sm text-[#524D48]">
            <RatingStars value={first.average} />
            <span className="font-bold">{first.average.toFixed(1)}</span>
            <span className="text-xs text-[#9E988F]">
              {first.count} {first.count === 1 ? "review" : "reviews"}
            </span>
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-[#B55234]">
          {error}{" "}
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-bold underline">
            Try again
          </button>
        </p>
      ) : null}

      {!first && !error ? (
        <p className="flex items-center gap-2 text-xs text-[#736D65]" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Loading reviews...
        </p>
      ) : null}

      {first && reviews.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#E8E2D7] bg-white p-4 text-sm text-[#736D65]">
          <MessageSquareText className="h-5 w-5 shrink-0 text-[#B5ACA0]" aria-hidden="true" />
          No review yet. Guests can review a visit once it is completed.
        </div>
      ) : null}

      <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-2xl border border-[#E8E2D7] bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#1A1A1A]">{review.author}</p>
              <RatingStars value={review.rating} />
            </div>
            {review.comment ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#524D48]">{review.comment}</p> : null}
            <p className="mt-2 text-[11px] text-[#9E988F]">
              {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void showMore()}
          className="rounded-full border border-[#D8D2C5] bg-white px-5 py-2 text-xs font-semibold text-[#423E3A] hover:bg-black/5 disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Show more reviews"}
        </button>
      ) : null}
    </section>
  );
}
