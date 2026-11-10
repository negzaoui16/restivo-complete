"use client";

import { MapPin, Phone } from "lucide-react";
import { RestivoGlyph } from "@/app/mainpage/_components/RestivoGlyph";
import type { ManagedRestaurant } from "../../_context/RestaurantManagerContext";
import { restaurantInitials } from "../_lib/preview";

export function MenuPreviewIdentity({
  restaurant,
  menuName,
  menuDescription,
  isPublished,
  accentColor = "#B55234",
  bannerUrl,
  isClientView = false,
}: {
  restaurant: ManagedRestaurant;
  menuName: string;
  menuDescription: string | null;
  isPublished: boolean;
  accentColor?: string;
  bannerUrl?: string;
  isClientView?: boolean;
}) {
  return (
    <header className="text-center px-2">
      {bannerUrl && (
        <div className="mb-6 -mx-5 sm:-mx-10 -mt-10 sm:-mt-12 relative h-40 sm:h-52 rounded-t-[28px] overflow-hidden border-b border-[#E8E2D7]">
          <img src={bannerUrl} alt={menuName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
      )}

      <div className="flex justify-center mb-5">
        {restaurant.logoUrl ? (
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#E8E2D7] bg-white shadow-sm">
            <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className="w-20 h-20 rounded-2xl text-white flex items-center justify-center text-2xl font-extrabold tracking-tight shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            {restaurantInitials(restaurant.name)}
          </div>
        )}
      </div>

      <p
        className="text-[10px] font-bold uppercase tracking-[0.28em]"
        style={{ color: accentColor }}
      >
        {isClientView ? "Menu officiel" : isPublished ? "Table menu" : "Draft preview"}
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
        {restaurant.name}
      </h1>
      {(!isClientView || (menuName && menuName.toLowerCase() !== `${restaurant.name.toLowerCase()} menu`)) && (
        <p className="mt-1 text-sm font-medium text-[#736D65]">{menuName}</p>
      )}

      {(restaurant.description || menuDescription) && (
        <p className="mt-4 mx-auto max-w-md text-sm leading-relaxed text-[#5E5850]">
          {menuDescription || restaurant.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#7A746B]">
        {restaurant.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#B55234]" />
            {restaurant.location}
          </span>
        )}
        {restaurant.phone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#B55234]" />
            {restaurant.phone}
          </span>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="h-px w-12 bg-[#E0D8CC]" />
        <RestivoGlyph className="w-5 h-5" color="#B55234" />
        <div className="h-px w-12 bg-[#E0D8CC]" />
      </div>
    </header>
  );
}
