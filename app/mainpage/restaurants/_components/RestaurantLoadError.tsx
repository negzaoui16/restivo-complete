"use client";

import { AlertTriangle } from "lucide-react";

/** Shown instead of a page when the manager's restaurants could not be loaded. */
export function RestaurantLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF0EA] text-[#B55234]">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-[#736D65]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-[#B55234] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9E4328]"
      >
        Try again
      </button>
    </div>
  );
}
