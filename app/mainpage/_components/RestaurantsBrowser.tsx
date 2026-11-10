"use client";

import { useEffect, useState } from "react";
import { Loader2, SearchX, UtensilsCrossed } from "lucide-react";
import { apiListDiscoverRestaurants } from "@/lib/discover/client";
import type { DiscoverList } from "@/lib/discover/types";
import { PRICE_LEVELS } from "@/lib/restaurants/price-level";
import { useRequireSignIn } from "../_lib/useRequireSignIn";
import { useMainpage } from "./MainpageProvider";
import { DiscoverRestaurantCard } from "./DiscoverRestaurantCard";

const SEARCH_DELAY_MS = 300;

type Load =
  | { state: "loading" }
  | { state: "error"; key: string; message: string }
  | ({ state: "ready"; key: string } & DiscoverList);

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] ${
        active ? "border-[#B55234] bg-[#B55234] text-white" : "border-[#E8E2D7] bg-white text-[#4A443D] hover:bg-[#FAF7F2]"
      }`}
    >
      {children}
    </button>
  );
}

/** Published restaurants from the database, filtered by the shared search box, cuisine and price chips. */
export function RestaurantsBrowser() {
  const { searchQuery } = useMainpage();
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const [result, setResult] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [cuisine, setCuisine] = useState("");
  const [price, setPrice] = useState<number[]>([]);
  // The chips come from the last answer, so they stay visible while a filter narrows the list.
  const [cuisines, setCuisines] = useState<string[]>([]);

  // A result only counts for the search it answered; while a newer search is
  // pending the previous list stays on screen instead of flashing a spinner.
  const key = `${searchQuery}|${cuisine}|${price.join(",")}|${attempt}`;
  const load: Load =
    result.state === "loading" || result.key === key || result.state === "ready"
      ? result
      : { state: "loading" };

  useEffect(() => {
    if (!signedIn) return undefined;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const list = await apiListDiscoverRestaurants(token, searchQuery, { cuisine, price }, controller.signal);
        if (controller.signal.aborted) return;
        setCuisines(list.cuisines);
        setResult({ state: "ready", key, ...list });
      } catch (err) {
        if (controller.signal.aborted) return;
        setResult({
          state: "error",
          key,
          message: err instanceof Error ? err.message : "Could not load restaurants.",
        });
      }
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signedIn, searchQuery, cuisine, price, attempt, key, getFreshAccessToken]);

  const filtering = cuisine !== "" || price.length > 0;
  const togglePrice = (level: number) =>
    setPrice((prev) => (prev.includes(level) ? prev.filter((entry) => entry !== level) : [...prev, level].sort()));

  const filters =
    cuisines.length > 0 || filtering ? (
      <div className="mb-4 flex flex-col gap-2" aria-label="Filters">
        {cuisines.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by cuisine">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#9E988F]">Cuisine</span>
            <Chip active={cuisine === ""} onClick={() => setCuisine("")}>
              All
            </Chip>
            {cuisines.map((entry) => (
              <Chip key={entry} active={cuisine.toLowerCase() === entry.toLowerCase()} onClick={() => setCuisine(entry)}>
                {entry}
              </Chip>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by price">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#9E988F]">Price</span>
          {PRICE_LEVELS.map((level) => (
            <Chip key={level} active={price.includes(level)} onClick={() => togglePrice(level)} label={`Price level ${level} of 4`}>
              {"$".repeat(level)}
            </Chip>
          ))}
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setCuisine("");
                setPrice([]);
              }}
              className="ml-1 text-xs font-semibold text-[#B55234] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    ) : null;

  if (load.state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading restaurants…
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
        <p className="text-sm text-[#B55234]">{load.message}</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="rounded-full border border-[#D8D2C5] px-4 py-1.5 text-xs font-medium text-[#423E3A] hover:bg-black/5"
        >
          Try again
        </button>
      </div>
    );
  }

  if (load.restaurants.length === 0) {
    const searching = searchQuery.trim() !== "" || filtering;
    return (
      <>
        {filters}
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5ECE5] text-[#B55234]">
            {searching ? <SearchX className="h-6 w-6" /> : <UtensilsCrossed className="h-6 w-6" />}
          </div>
          <p className="text-base font-bold text-[#1A1A1A]">
            {searching ? "No restaurant matches your search" : "No restaurant is open for booking yet"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-[#736D65]">
            {searching
              ? "Try another name, city, cuisine or price."
              : "Restaurants appear here as soon as they publish their floor plan."}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {filters}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {load.restaurants.map((restaurant) => (
          <DiscoverRestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </>
  );
}
