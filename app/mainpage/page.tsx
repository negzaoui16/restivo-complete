"use client";

import { useAuth } from "@/contexts/AuthContext";
import { NextReservationCard } from "./_components/NextReservationCard";
import { RestaurantsBrowser } from "./_components/RestaurantsBrowser";

export default function MainHomePage() {
  const { user } = useAuth();
  const firstName = user?.firstName || user?.displayName || "";

  return (
    <>
      <section className="mt-3">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1A1A1A] sm:text-3xl lg:text-[34px]">
          Welcome{firstName ? "," : ""} <span className="text-[#B55234]">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-[#736D65]">
          Pick a restaurant, choose your table and book it. Use the search bar above to filter by name or city.
        </p>
      </section>

      <NextReservationCard />

      <h2 className="mt-6 mb-3.5 text-base font-bold text-[#1A1A1A] sm:text-lg">Restaurants</h2>
      <RestaurantsBrowser />
    </>
  );
}
