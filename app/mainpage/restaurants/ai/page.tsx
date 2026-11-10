"use client";

import { RestaurantLoadError } from "../_components/RestaurantLoadError";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { ManagerChat } from "./_components/ManagerChat";

export default function AiManagerPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { currentRestaurant, isLoadingRestaurants, setIsAddRestaurantOpen, loadError, reloadRestaurants } = useRestaurantManager();

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) router.replace("/mainpage");
  }, [isReady, user?.canManageRestaurants, router]);

  if (!isReady || isLoadingRestaurants || !user?.canManageRestaurants) {
    return <p className="py-24 text-center text-sm text-[#7A746B]">Loading…</p>;
  }

  if (loadError) return <RestaurantLoadError message={loadError} onRetry={reloadRestaurants} />;

  if (!currentRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF0EA] text-[#B55234]">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Create a restaurant first</h1>
        <p className="mt-2 max-w-md text-sm text-[#736D65]">
          The assistant belongs to a venue. Add a restaurant, then come back to talk.
        </p>
        <button
          type="button"
          onClick={() => setIsAddRestaurantOpen(true)}
          className="mt-5 rounded-xl bg-[#B55234] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9E4328]"
        >
          Add a restaurant
        </button>
      </div>
    );
  }

  const ownerName =
    user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Owner";

  return (
    <div className="h-full min-h-0 py-4">
      <ManagerChat
        key={currentRestaurant.id}
        restaurantId={currentRestaurant.id}
        restaurantName={currentRestaurant.name}
        ownerName={ownerName}
      />
    </div>
  );
}
