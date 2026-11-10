"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { RestaurantLoadError } from "../_components/RestaurantLoadError";
import { OrdersBoard } from "../_components/manage/OrdersBoard";
import { ReservationsBoard } from "../_components/manage/ReservationsBoard";

type Tab = "reservations" | "orders";

const TABS: { id: Tab; label: string }[] = [
  { id: "reservations", label: "Reservations" },
  { id: "orders", label: "Orders" },
];

function ReservationsAndOrders() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, isReady } = useAuth();
  const { currentRestaurant, isLoadingRestaurants, setIsAddRestaurantOpen, loadError, reloadRestaurants } =
    useRestaurantManager();
  const tab: Tab = params.get("tab") === "orders" ? "orders" : "reservations";

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
          Reservations and orders belong to a venue. Add a restaurant, then come back.
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
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">Reservations &amp; orders</h1>
        <p className="mt-1 text-xs text-[#736D65] sm:text-sm">
          {currentRestaurant.name} · the list refreshes by itself every 30 seconds.
        </p>
      </section>

      <div role="tablist" aria-label="Section" className="flex gap-1 border-b border-[#ECE7DC]">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            role="tab"
            aria-selected={tab === entry.id}
            href={entry.id === "reservations" ? pathname : `${pathname}?tab=${entry.id}`}
            replace
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === entry.id
                ? "border-[#B55234] text-[#B55234]"
                : "border-transparent text-[#736D65] hover:text-[#1A1A1A]"
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      {tab === "reservations" ? (
        <ReservationsBoard key={currentRestaurant.id} restaurantId={currentRestaurant.id} />
      ) : (
        <OrdersBoard key={currentRestaurant.id} restaurantId={currentRestaurant.id} />
      )}
    </div>
  );
}

export default function ReservationsAndOrdersPage() {
  return (
    <Suspense fallback={null}>
      <ReservationsAndOrders />
    </Suspense>
  );
}
