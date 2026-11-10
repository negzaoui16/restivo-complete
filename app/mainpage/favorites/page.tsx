"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { apiListFavorites } from "@/lib/favorites/client";
import type { DiscoverRestaurantSummary } from "@/lib/discover/types";
import { DiscoverRestaurantCard } from "../_components/DiscoverRestaurantCard";
import { useRequireSignIn } from "../_lib/useRequireSignIn";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; restaurants: DiscoverRestaurantSummary[] };

export default function FavoritesPage() {
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signedIn) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const restaurants = await apiListFavorites(token, controller.signal);
        if (!controller.signal.aborted) setLoad({ state: "ready", restaurants });
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoad({ state: "error", message: err instanceof Error ? err.message : "Could not load your favorites." });
      }
    })();
    return () => controller.abort();
  }, [signedIn, attempt, getFreshAccessToken]);

  return (
    <>
      <section className="mt-3">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1A1A1A] sm:text-3xl">Favorites</h1>
        <p className="mt-1 text-sm text-[#736D65]">The restaurants you saved, one tap away.</p>
      </section>

      {load.state === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your favorites...
        </div>
      ) : load.state === "error" ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
          <p className="text-sm text-[#B55234]">{load.message}</p>
          <button
            type="button"
            onClick={() => {
              setLoad({ state: "loading" });
              setAttempt((value) => value + 1);
            }}
            className="rounded-full border border-[#D8D2C5] px-4 py-1.5 text-xs font-medium text-[#423E3A] hover:bg-black/5"
          >
            Try again
          </button>
        </div>
      ) : load.restaurants.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center sm:py-24">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5ECE5] text-[#B55234]">
            <Heart className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-extrabold text-[#1A1A1A]">No favorite yet</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#736D65]">
            Tap the heart on a restaurant to keep it here and get back to it in one tap.
          </p>
          <Link
            href="/mainpage"
            className="mt-5 rounded-full bg-[#B55234] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#9E4328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234]"
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {load.restaurants.map((restaurant) => (
            <DiscoverRestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onFavoriteChange={(id, isFavorite) => {
                if (!isFavorite) {
                  setLoad((current) =>
                    current.state === "ready"
                      ? { state: "ready", restaurants: current.restaurants.filter((item) => item.id !== id) }
                      : current,
                  );
                }
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
