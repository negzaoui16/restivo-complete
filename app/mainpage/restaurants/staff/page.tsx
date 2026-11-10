"use client";

import { RestaurantLoadError } from "../_components/RestaurantLoadError";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { matchesRoster } from "./_lib/roster";
import { useRestaurantRoster } from "./_lib/use-roster";
import { RequestList } from "./_components/RequestList";
import { TeamTable } from "./_components/TeamTable";

export default function RestaurantStaffPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { currentRestaurant, isLoadingRestaurants, setIsAddRestaurantOpen, loadError, reloadRestaurants } = useRestaurantManager();
  const roster = useRestaurantRoster(currentRestaurant?.id);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) router.replace("/mainpage");
  }, [isReady, user?.canManageRestaurants, router]);

  if (!isReady || isLoadingRestaurants) {
    return <p className="py-24 text-center text-sm text-[#7A746B]">Loading staff…</p>;
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
          Staff belong to a venue. Add a restaurant, then come back to review who wants to join.
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

  const needle = query.trim();
  const members = roster.members.filter((member) => matchesRoster(member.name, needle));
  const requests = roster.requests.filter((request) =>
    matchesRoster(`${request.name} ${request.message ?? ""}`, needle)
  );

  return (
    <div className="flex flex-col gap-5 py-1">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">Staff</h1>
          <p className="mt-1 text-sm text-[#736D65]">
            People at {currentRestaurant.name}
            {currentRestaurant.city ? ` · ${currentRestaurant.city}` : ""}, and those who asked to join.
          </p>
        </div>
        <label className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8C877D]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search staff"
            className="w-full rounded-xl border border-[#E5DFD3] bg-white py-2 pr-3 pl-9 text-sm focus:border-[#B55234] focus:outline-none sm:w-56"
          />
        </label>
      </header>

      {roster.error ? <p className="text-sm font-medium text-[#B55234]">{roster.error}</p> : null}

      {!roster.loaded ? (
        <p className="py-16 text-center text-sm text-[#7A746B]">Loading staff…</p>
      ) : (
        <>
          <TeamTable
            members={members}
            canManageTeam={currentRestaurant.role === "Owner"}
            pendingId={roster.pendingId}
            onChangeRole={roster.changeRole}
            empty={needle ? "No staff match that search." : "No staff at this restaurant yet."}
          />
          <RequestList
            requests={requests}
            empty={needle ? "No requests match that search." : "No one is waiting to join."}
            pendingId={roster.pendingId}
            onAccept={roster.accept}
            onDecline={roster.decline}
          />
        </>
      )}
    </div>
  );
}
