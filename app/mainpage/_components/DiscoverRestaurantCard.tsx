"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { DiscoverRestaurantSummary } from "@/lib/discover/types";
import { priceLevelDescription, priceLevelLabel } from "@/lib/restaurants/price-level";
import { FavoriteButton } from "./FavoriteButton";
import { RatingBadge } from "./RatingStars";

export function DiscoverRestaurantCard({
  restaurant,
  onFavoriteChange,
}: {
  restaurant: DiscoverRestaurantSummary;
  /** Told when the heart changes, e.g. to drop the card from the Favorites page. */
  onFavoriteChange?: (restaurantId: string, isFavorite: boolean) => void;
}) {
  // A cover or logo link can be dead; fall back to the initial instead of a broken image.
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const price = priceLevelLabel(restaurant.priceLevel, restaurant.currency);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E8E2D7] bg-white shadow-2xs transition-all duration-300 hover:shadow-md">
      <div className="relative h-40 w-full overflow-hidden bg-[#ECE7DC]">
        {restaurant.coverUrl && !coverFailed ? (
          // Cover URLs come from arbitrary hosts, so next/image cannot optimise them.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverUrl}
            alt=""
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-extrabold text-[#B55234]/40">
            {restaurant.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        {restaurant.logoUrl && !logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.logoUrl}
            alt=""
            onError={() => setLogoFailed(true)}
            className="absolute bottom-2 left-2 h-11 w-11 rounded-xl border-2 border-white bg-white object-cover shadow-sm"
          />
        ) : null}
      </div>

      <FavoriteButton
        className="absolute right-2 top-2 z-10"
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        isFavorite={restaurant.isFavorite}
        onChange={(value) => onFavoriteChange?.(restaurant.id, value)}
      />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold text-[#1A1A1A] transition-colors group-hover:text-[#B55234]">
            {/* The whole card is the link (stretched), the heart stays above it. */}
            <Link
              href={`/mainpage/explore/${restaurant.id}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234]"
            >
              {restaurant.name}
            </Link>
          </h3>
          {price ? (
            <span
              className="shrink-0 text-xs font-bold text-[#B55234]"
              aria-label={priceLevelDescription(restaurant.priceLevel)}
              title={priceLevelDescription(restaurant.priceLevel)}
            >
              {price}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#7A746B]">
          {restaurant.cuisine ? <span className="font-medium text-[#524D48]">{restaurant.cuisine}</span> : null}
          {restaurant.city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#9E988F]" aria-hidden="true" />
              {restaurant.city}
            </span>
          ) : null}
          <RatingBadge average={restaurant.averageRating} count={restaurant.reviewCount} />
        </p>
        {restaurant.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6B6661]">{restaurant.description}</p>
        ) : null}
        <span className="mt-4 inline-flex w-fit rounded-full bg-[#B55234] px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs">
          View restaurant
        </span>
      </div>
    </div>
  );
}
