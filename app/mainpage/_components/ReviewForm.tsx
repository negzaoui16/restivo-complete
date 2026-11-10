"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { ApiError } from "@/contexts/AuthContext";
import { apiCreateReview } from "@/lib/reviews/client";
import { MAX_COMMENT_LENGTH } from "@/lib/reviews/rules";
import { useRequireSignIn } from "../_lib/useRequireSignIn";

/** Rating (1 to 5) and an optional comment for a completed reservation. */
export function ReviewForm({
  reservationId,
  restaurantName,
  onSaved,
  onCancel,
}: {
  reservationId: string;
  restaurantName: string;
  onSaved: (rating: number) => void;
  onCancel: () => void;
}) {
  const { getFreshAccessToken } = useRequireSignIn();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; comment?: string; form?: string }>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const found: typeof errors = {};
    if (rating < 1) found.rating = "Choose a rating from 1 to 5.";
    if (comment.trim().length > MAX_COMMENT_LENGTH) found.comment = `Keep the comment under ${MAX_COMMENT_LENGTH} characters.`;
    setErrors(found);
    if (found.rating || found.comment) return;

    setBusy(true);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new ApiError("MISSING_TOKEN", "Please sign in again.", 401);
      await apiCreateReview(token, reservationId, { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      onSaved(rating);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your review.";
      if (err instanceof ApiError && err.code === "ALREADY_REVIEWED") onSaved(rating);
      else setErrors({ form: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-3 rounded-xl border border-[#E8E2D7] bg-[#FAF7F2] p-3">
      <fieldset>
        <legend className="text-xs font-semibold text-[#2A2621]">How was {restaurantName}?</legend>
        <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
              onClick={() => {
                setRating(value);
                setErrors((prev) => ({ ...prev, rating: undefined }));
              }}
              className="rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234]"
            >
              <Star className={`h-6 w-6 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-[#C9C2B4]"}`} aria-hidden="true" />
            </button>
          ))}
        </div>
        {errors.rating ? <p className="mt-1 text-xs font-medium text-red-600">{errors.rating}</p> : null}
      </fieldset>

      <div>
        <label className="text-xs font-semibold text-[#2A2621]">
          Comment <span className="font-normal text-[#9E988F]">(optional)</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setErrors((prev) => ({ ...prev, comment: undefined }));
            }}
            className="mt-1 w-full resize-none rounded-xl border border-[#E5DEC9] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A] focus:border-[#B55234] focus:outline-none focus:ring-2 focus:ring-[#B55234]/20"
          />
        </label>
        <p className={`mt-0.5 text-right text-[11px] ${comment.length > MAX_COMMENT_LENGTH ? "font-bold text-red-600" : "text-[#9E988F]"}`}>
          {comment.length}/{MAX_COMMENT_LENGTH}
        </p>
        {errors.comment ? <p className="text-xs font-medium text-red-600">{errors.comment}</p> : null}
      </div>

      {errors.form ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {errors.form}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#B55234] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E4328] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
          Send review
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-3.5 py-2 text-xs font-medium text-[#6B6661] hover:bg-black/5">
          Not now
        </button>
      </div>
    </form>
  );
}
