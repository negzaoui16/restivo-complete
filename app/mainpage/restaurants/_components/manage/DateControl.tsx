"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

function shift(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Previous / next day, a date picker and a "Today" shortcut. `date` is YYYY-MM-DD. */
export function DateControl({
  date,
  isToday,
  onChange,
}: {
  date: string;
  isToday: boolean;
  /** `null` means "today" (the server decides, in the restaurant time zone). */
  onChange: (date: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(shift(date, -1))}
        aria-label="Previous day"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E2D7] bg-white hover:bg-[#FAF7F2]"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <input
        type="date"
        value={date}
        aria-label="Date"
        onChange={(event) => onChange(event.target.value || null)}
        className="h-8 rounded-lg border border-[#E8E2D7] bg-white px-2 text-xs font-semibold text-[#1A1A1A]"
      />
      <button
        type="button"
        onClick={() => onChange(shift(date, 1))}
        aria-label="Next day"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E2D7] bg-white hover:bg-[#FAF7F2]"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={isToday}
        onClick={() => onChange(null)}
        className="h-8 rounded-lg border border-[#E8E2D7] bg-white px-3 text-xs font-semibold hover:bg-[#FAF7F2] disabled:opacity-40"
      >
        Today
      </button>
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            value === option.value
              ? "border-[#B55234] bg-[#B55234] text-white"
              : "border-[#E8E2D7] bg-white text-[#4A443D] hover:bg-[#FAF7F2]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
