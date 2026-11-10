"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { RestaurantLoadError } from "../_components/RestaurantLoadError";
import { LiveFloorPlan } from "../_components/live/LiveFloorPlan";

export default function LiveFloorPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { currentRestaurant, isLoadingRestaurants, setIsAddRestaurantOpen, loadError, reloadRestaurants } =
    useRestaurantManager();

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) router.replace("/mainpage");
  }, [isReady, user?.canManageRestaurants, router]);

  if (!isReady || isLoadingRestaurants) {
    return <div className="flex items-center justify-center py-24 text-sm text-[#7A746B]">Loading...</div>;
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
          The live floor belongs to a venue. Add a restaurant, then come back.
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

  return (
    <div className="flex flex-col gap-5 py-1">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">Live floor</h1>
        <p className="mt-1 text-xs text-[#736D65] sm:text-sm">
          {currentRestaurant.name} · the plan refreshes by itself every 20 seconds.
        </p>
      </section>
      <LiveFloorPlan key={currentRestaurant.id} restaurantId={currentRestaurant.id} />
    </div>
  );
}
