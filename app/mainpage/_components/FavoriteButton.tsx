"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useRequireSignIn } from "../_lib/useRequireSignIn";
import { apiAddFavorite, apiRemoveFavorite } from "@/lib/favorites/client";

/**
 * Heart toggle. It changes at once and goes back, with a short message, if the server
 * refuses. Safe inside a link: the click does not follow it.
 */
export function FavoriteButton({
  restaurantId,
  restaurantName,
  isFavorite,
  onChange,
  className = "",
}: {
  restaurantId: string;
  restaurantName: string;
  isFavorite: boolean;
  /** Told the new value once the server accepted it. */
  onChange?: (isFavorite: boolean) => void;
  className?: string;
}) {
  const { getFreshAccessToken } = useRequireSignIn();
  const [value, setValue] = useState(isFavorite);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Follow the parent when it reloads the list.
  const [seen, setSeen] = useState(isFavorite);
  if (seen !== isFavorite) {
    setSeen(isFavorite);
    setValue(isFavorite);
  }

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const next = !value;
    setValue(next);
    setBusy(true);
    setProblem(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Please sign in again.");
      if (next) await apiAddFavorite(token, restaurantId);
      else await apiRemoveFavorite(token, restaurantId);
      onChange?.(next);
    } catch (err) {
      setValue(!next);
      setProblem(err instanceof Error ? err.message : "Could not update your favorites.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={value}
        aria-label={value ? `Remove ${restaurantName} from your favorites` : `Add ${restaurantName} to your favorites`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#B55234] shadow-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] active:scale-95"
      >
        <Heart className={`h-4.5 w-4.5 ${value ? "fill-[#B55234]" : ""}`} aria-hidden="true" />
      </button>
      {problem ? (
        <span role="alert" className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg bg-white p-2 text-[11px] font-medium text-[#B55234] shadow-md">
          {problem}
        </span>
      ) : null}
    </span>
  );
}
