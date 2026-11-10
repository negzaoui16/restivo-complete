import { Star } from "lucide-react";

/** Read-only stars for a rating from 1 to 5 (halves are rounded to the nearest star). */
export function RatingStars({ value, className = "h-3.5 w-3.5" }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`${className} ${star <= filled ? "fill-amber-400 text-amber-400" : "text-[#D8D2C5]"}`}
        />
      ))}
    </span>
  );
}

/** "4.5 (12)" or nothing when there is no review yet. */
export function RatingBadge({ average, count }: { average: number | null; count: number }) {
  if (average === null || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#524D48]">
      <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span>{average.toFixed(1)}</span>
      <span className="font-normal text-[#9E988F]">({count})</span>
    </span>
  );
}
