"use client";

import { RestaurantLoadError } from "./_components/RestaurantLoadError";
import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  PlusCircle,
  Armchair,
  Settings,
  Users2,
  ShoppingBag,
  Coins,
  ChevronDown,
  Plus,
  Store,
} from "lucide-react";
import { StatCard } from "./_components/StatCard";
import { PublishRestaurantButton } from "./_components/PublishRestaurantButton";
import { FloorPlanView } from "./_components/FloorPlanView";
import { ReservationsWidget } from "./_components/ReservationsWidget";
import { LiveOrdersWidget } from "./_components/LiveOrdersWidget";
import { EnhancePromoCard } from "./_components/EnhancePromoCard";
import { RecentActivityWidget } from "./_components/RecentActivityWidget";
import { RestaurantQuickModals } from "./_components/RestaurantQuickModals";
import { useRestaurantManager } from "./_context/RestaurantManagerContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiManagerStats } from "@/lib/manager/client";
import { formatSlotDate, localDateInDays } from "@/lib/reservations/format";
import { useManagerQuery } from "./_lib/use-manager-query";
import { useRouter } from "next/navigation";

export default function RestaurantDashboardPage() {
  const {
    currentRestaurant,
    setIsAddRestaurantOpen,
    openRestaurantProfile,
    restaurantStatus,
    setRestaurantStatus,
    isLoadingRestaurants,
    loadError,
    reloadRestaurants,
  } = useRestaurantManager();

  const { user, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) router.replace("/mainpage");
  }, [isReady, user?.canManageRestaurants, router]);

  // Quick Action Modal states
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [menuItemModalOpen, setMenuItemModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [floorPlanModalOpen, setFloorPlanModalOpen] = useState(false);

  // Status & Date dropdown toggle
  const [statusDateDropdownOpen, setStatusDateDropdownOpen] = useState(false);
  // Day shown by the stat cards and the reservations list: -1 yesterday, 0 today, 1 tomorrow.
  const [dayOffset, setDayOffset] = useState(0);
  const timezone = currentRestaurant?.timezone ?? "UTC";
  const restaurantId = currentRestaurant?.id ?? null;
  const date = localDateInDays(timezone, dayOffset);
  const dayName = (offset: number) => (offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : "Yesterday");
  const dayLabel = (offset: number) =>
    `${dayName(offset)} · ${formatSlotDate(`${localDateInDays(timezone, offset)}T12:00:00Z`, "UTC")}`;

  const statsFetcher = useMemo(
    () => (restaurantId ? (token: string) => apiManagerStats(token, restaurantId, date) : null),
    [restaurantId, date],
  );
  const stats = useManagerQuery(statsFetcher);

  const userName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "there";

  if (!isReady || isLoadingRestaurants) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#7A746B]">
        Loading your restaurants…
      </div>
    );
  }

  if (loadError) return <RestaurantLoadError message={loadError} onRetry={reloadRestaurants} />;

  if (!currentRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center mb-4">
          <Store className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Create your first restaurant</h1>
        <p className="text-sm text-[#736D65] mt-2 max-w-md">
          Owners and managers start here. Add a venue, set hours, and we&apos;ll create the first
          floor for your table map.
        </p>
        <button
          onClick={() => setIsAddRestaurantOpen(true)}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white text-sm font-bold"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add a restaurant
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-1 select-none animate-in fade-in duration-300">
      {/* ─── Header: Welcome, Status/Date, & Action Buttons ─── */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-[#736D65] mt-1 font-normal">
            Here&apos;s what&apos;s happening at{" "}
            <button
              type="button"
              onClick={() => openRestaurantProfile(currentRestaurant)}
              className="font-bold text-[#1A1A1A] hover:text-[#B55234] underline decoration-dotted underline-offset-2 transition-colors cursor-pointer"
              title="Click to view Restaurant Profile"
            >
              {currentRestaurant.name}
            </button>{" "}
            today.
          </p>

          {/* Status & Date Bar Pill */}
          <div className="mt-3 relative inline-block">
            <button
              onClick={() => setStatusDateDropdownOpen(!statusDateDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white border border-[#E8E2D7] text-xs text-[#2A2621] transition-all shadow-2xs group"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  restaurantStatus === "Open"
                    ? "bg-[#2E7D32]"
                    : restaurantStatus === "Break"
                    ? "bg-[#E65100]"
                    : "bg-[#D32F2F]"
                }`}
              />
              <span className="font-semibold">{restaurantStatus}</span>
              <span className="text-[#B5ACA0]">|</span>
              <span className="text-[#666059]">{dayLabel(dayOffset)}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#8A847C] transition-transform duration-200 ${
                  statusDateDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {statusDateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-2xl border border-[#E5DEC9] shadow-xl p-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C857B] px-2 py-1">
                  Service State
                </div>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {(["Open", "Break", "Closed"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setRestaurantStatus(st);
                        setStatusDateDropdownOpen(false);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                        restaurantStatus === st
                          ? "bg-[#FAF0EA] text-[#B55234]"
                          : "hover:bg-[#FAF7F2] text-[#4A443D]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#ECE7DC] pt-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C857B] px-2 py-1">
                    Select Date View
                  </div>
                  {[0, 1, -1].map((offset) => (
                    <button
                      key={offset}
                      onClick={() => {
                        setDayOffset(offset);
                        setStatusDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        dayOffset === offset
                          ? "font-bold text-[#B55234] bg-[#FAF0EA]/60"
                          : "text-[#3D3A36] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      {dayLabel(offset)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Row matching screenshot + requested "Add a restaurant" */}
        <div className="flex items-start flex-wrap gap-2 sm:gap-2.5">
          <PublishRestaurantButton />

          {/* Add reservation */}
          <button
            onClick={() => setReservationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#DFD8CC] hover:border-[#D0C5B5] text-xs font-semibold text-[#1A1A1A] transition-all shadow-2xs group"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#736D65] group-hover:text-[#B55234] transition-colors" />
            <span>Add reservation</span>
          </button>

          {/* Add menu item */}
          <button
            onClick={() => setMenuItemModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#DFD8CC] hover:border-[#D0C5B5] text-xs font-semibold text-[#1A1A1A] transition-all shadow-2xs group"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#736D65] group-hover:text-[#B55234] transition-colors" />
            <span>Add menu item</span>
          </button>

          {/* Add table */}
          <button
            onClick={() => setTableModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#DFD8CC] hover:border-[#D0C5B5] text-xs font-semibold text-[#1A1A1A] transition-all shadow-2xs group"
          >
            <Armchair className="w-3.5 h-3.5 text-[#736D65] group-hover:text-[#B55234] transition-colors" />
            <span>Add table</span>
          </button>

          {/* Manage restaurant */}
          <button
            onClick={() => setManageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#DFD8CC] hover:border-[#D0C5B5] text-xs font-semibold text-[#1A1A1A] transition-all shadow-2xs group"
          >
            <Settings className="w-3.5 h-3.5 text-[#736D65] group-hover:text-[#B55234] transition-colors" />
            <span>Manage restaurant</span>
          </button>

          {/* Button to Add a Restaurant (specifically requested by user!) */}
          <button
            onClick={() => setIsAddRestaurantOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B55234] hover:bg-[#9E4328] active:scale-95 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Add a restaurant</span>
          </button>
        </div>
      </section>

      {/* ─── Statistic cards: real numbers for the chosen day ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
        {stats.error && !stats.data ? (
          <p role="alert" className="sm:col-span-2 lg:col-span-4 rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-4 py-3 text-sm text-[#B55234]">
            {stats.error}{" "}
            <button type="button" onClick={stats.refresh} className="font-bold underline">
              Try again
            </button>
          </p>
        ) : (
          <>
            <StatCard
              icon={<CalendarDays className="w-4 h-4" />}
              title={`${dayName(dayOffset)}'s reservations`}
              value={stats.data?.reservationsToday ?? 0}
              valueText={stats.data ? undefined : "..."}
              subText="Cancelled ones excluded"
            />
            <StatCard
              icon={<Users2 className="w-4 h-4" />}
              title="Covers"
              value={stats.data?.coversToday ?? 0}
              valueText={stats.data ? undefined : "..."}
              subText="Guests expected"
            />
            <StatCard
              icon={<ShoppingBag className="w-4 h-4" />}
              title="Orders to process"
              value={stats.data?.ordersToProcess ?? 0}
              valueText={stats.data ? undefined : "..."}
              subText="Open pre-orders"
            />
            <StatCard
              icon={<Coins className="w-4 h-4" />}
              title="Revenue"
              value={0}
              valueText={stats.data ? `${stats.data.revenueToday} ${stats.data.currency}` : "..."}
              subText="Orders not cancelled"
            />
          </>
        )}
      </section>

      {/* ─── Main Two-Column Layout (Left: Floor Plan & Activity | Right: Reservations, Orders, Promo) ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Approx 60-65%): Floor Plan + Recent Activity */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
          {/* Restaurant Overview (Architectural Floor Plan Canvas) */}
          <FloorPlanView onOpenFullModal={() => setFloorPlanModalOpen(true)} />

          {/* Recent Activity Cards (4 in a row) */}
          <RecentActivityWidget
            restaurantId={currentRestaurant.id}
            timezone={timezone}
            onViewAll={() => router.push("/mainpage/restaurants/reservations")}
          />
        </div>

        {/* Right Column (Approx 35-40%): Reservations, Live Orders, Enhance Banner */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          {/* Today's Reservations Table */}
          <ReservationsWidget
            restaurantId={currentRestaurant.id}
            date={date}
            title={`${dayName(dayOffset)}'s reservations`}
            onAddReservation={() => setReservationModalOpen(true)}
            onViewAll={() => router.push("/mainpage/restaurants/reservations")}
          />

          {/* Live Orders List */}
          <LiveOrdersWidget
            restaurantId={currentRestaurant.id}
            onViewAll={() => router.push("/mainpage/restaurants/reservations?tab=orders")}
            onSelectOrder={() => router.push("/mainpage/restaurants/reservations?tab=orders")}
          />

          {/* Enhance Your Restaurant Promo Banner */}
          <EnhancePromoCard
            onExplore={() => setFloorPlanModalOpen(true)}
          />
        </div>
      </section>

      {/* ─── Interactive Quick Action Modals ─── */}
      <RestaurantQuickModals
        reservationOpen={reservationModalOpen}
        setReservationOpen={setReservationModalOpen}
        menuItemOpen={menuItemModalOpen}
        setMenuItemOpen={setMenuItemModalOpen}
        tableOpen={tableModalOpen}
        setTableOpen={setTableModalOpen}
        manageOpen={manageModalOpen}
        setManageOpen={setManageModalOpen}
        floorPlanOpen={floorPlanModalOpen}
        setFloorPlanOpen={setFloorPlanModalOpen}
      />
    </div>
  );
}
