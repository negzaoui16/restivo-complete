"use client";

import { useId, useState } from "react";
import { ImageOff } from "lucide-react";
import { CUISINE_SUGGESTIONS, PRICE_LEVELS, priceLevelLabel } from "@/lib/restaurants/price-level";

const INPUT =
  "w-full bg-white rounded-xl border border-[#DFD8CC] px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1A1A] placeholder:text-[#9E988F] focus:outline-none focus:border-[#B55234] focus:ring-2 focus:ring-[#B55234]/15 transition-all";
const LABEL = "block text-[11px] font-bold text-[#2A2621] uppercase tracking-wider mb-1.5";

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-medium text-red-600">{message}</p> : null;
}

/** Free-text cuisine with suggestions; any value is accepted. */
export function CuisineField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const listId = useId();
  return (
    <div>
      <label className={LABEL}>Cuisine</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={listId}
        maxLength={60}
        placeholder="e.g. Tunisian"
        aria-invalid={error ? true : undefined}
        className={INPUT}
      />
      <datalist id={listId}>
        {CUISINE_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <ErrorText message={error} />
    </div>
  );
}

/** Price level 1 to 4 shown with the currency sign; choosing the active one again clears it. */
export function PriceLevelField({
  value,
  currency,
  onChange,
  error,
}: {
  value: number | null;
  currency: string;
  onChange: (value: number | null) => void;
  error?: string;
}) {
  return (
    <div>
      <span className={LABEL}>Price level</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Price level">
        {PRICE_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={value === level}
            aria-label={`Price level ${level} of 4`}
            onClick={() => onChange(value === level ? null : level)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              value === level
                ? "border-[#B55234] bg-[#B55234] text-white"
                : "border-[#DFD8CC] bg-white text-[#4A443D] hover:bg-[#FAF7F2]"
            }`}
          >
            {priceLevelLabel(level, currency)}
          </button>
        ))}
      </div>
      <ErrorText message={error} />
    </div>
  );
}

/** A link to an image, with a live preview and a graceful fallback when it cannot be loaded. */
export function ImageUrlField({
  label,
  value,
  onChange,
  error,
  placeholder = "https://...",
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  /** Wide preview (cover) instead of a square one (logo). */
  wide?: boolean;
}) {
  // Remember which link failed, so editing the link tries again without an effect.
  const [failed, setFailed] = useState<string | null>(null);
  const link = value.trim();
  const broken = link !== "" && failed === link;

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-start gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8E2D7] bg-[#F5F0E8] text-[#A39C91] ${
            wide ? "h-16 w-28" : "h-16 w-16"
          }`}
        >
          {link !== "" && !broken ? (
            // The link comes from an arbitrary host, so next/image cannot optimise it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={link} alt="" className="h-full w-full object-cover" onError={() => setFailed(link)} />
          ) : (
            <span className="flex flex-col items-center gap-0.5 text-center text-[10px] leading-tight">
              <ImageOff className="h-4 w-4" aria-hidden="true" />
              {broken ? "Cannot load" : "No image"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            inputMode="url"
            maxLength={400}
            placeholder={placeholder}
            aria-invalid={error || broken ? true : undefined}
            className={INPUT}
          />
          {broken && !error && <p className="mt-1 text-xs text-amber-700">This link does not show an image. Check it.</p>}
          <ErrorText message={error} />
        </div>
      </div>
    </div>
  );
}
