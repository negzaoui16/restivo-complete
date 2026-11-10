"use client";

import { NotificationBell } from "../../_components/NotificationBell";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  Search,
  HelpCircle,
  ChevronDown,
  Home,
  Plus,
  Store,
  LogOut,
} from "lucide-react";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { LiveAlertsPulse } from "./live/LiveAlertsPulse";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";

export function RestaurantTopNav() {
  const {
    currentRestaurant,
    mobileMenuOpen,
    setMobileMenuOpen,
    searchQuery,
    setSearchQuery,
    setIsAddRestaurantOpen,
    openRestaurantProfile,
  } = useRestaurantManager();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const sectionLabel = pathname?.startsWith("/mainpage/restaurants/menu")
    ? "Menu"
    : pathname?.startsWith("/mainpage/restaurants/tables")
      ? "Tables"
      : pathname?.startsWith("/mainpage/restaurants/staff")
        ? "Staff"
        : pathname?.startsWith("/mainpage/restaurants/ai")
          ? "AI Manager"
          : "Overview";

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const userName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Account";
  const userAvatar = user?.avatarUrl || null;

  return (
    <header className="flex items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#ECE7DC]">
      {/* Left Breadcrumb & Mobile Menu Toggle */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-[#4A4643] hover:text-[#1A1A1A] hover:bg-black/5"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb matching image: "🏠 Maison Olive / Overview" */}
        <div className="flex items-center gap-2 text-xs sm:text-[13px] text-[#736D65] font-medium">
          <button
            onClick={() => openRestaurantProfile(currentRestaurant)}
            className="flex items-center gap-1.5 hover:text-[#B55234] transition-colors"
            title="Click to view Restaurant Profile"
          >
            <Home className="w-3.5 h-3.5 text-[#B55234]" />
            <span className="font-semibold text-[#1A1A1A] hover:underline underline-offset-2">
              {currentRestaurant?.name ?? "Your restaurant"}
            </span>
          </button>
          <span className="text-[#A39C91]">/</span>
          <span className="text-[#736D65]">{sectionLabel}</span>
        </div>
      </div>

      {/* Right Controls: Search, Bell, Help, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search input pill */}
        <div className="relative hidden sm:block w-44 md:w-56">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E988F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-white/70 hover:bg-white focus:bg-white text-xs text-[#1A1A1A] placeholder-[#9E988F] pl-8.5 pr-3 py-1.5 rounded-full border border-[#E8E4DA] focus:border-[#B55234] focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <LiveAlertsPulse restaurantId={currentRestaurant?.id ?? null} />
        <NotificationBell />

        {/* Help icon button */}
        <button
          onClick={() => alert("Restivo Restaurant Manager v2.4\nFast support: help@restivo.app")}
          className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-[#E8E4DA] flex items-center justify-center text-[#4A4643] hover:text-[#1A1A1A] transition-all shadow-2xs"
          aria-label="Help"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* User pill */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/70 hover:bg-white border border-[#E8E4DA] transition-all shadow-2xs"
          >
            <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-[#D8D2C5]">
              {userAvatar ? (
                <Image src={userAvatar} alt={userName} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[#FAF0EA] text-[10px] font-bold text-[#B55234]">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-[#24211E] hidden sm:inline">
              {userName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#7A746B] transition-transform duration-200 ${
                profileDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-[#E5DEC9] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-[#ECE7DC] mb-1">
                <p className="text-xs font-bold text-[#1A1A1A] truncate">{userName}</p>
                <p className="text-[10px] text-[#7A746B]">Restaurant Administrator</p>
              </div>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  openRestaurantProfile(currentRestaurant);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#1A1A1A] hover:bg-[#FAF7F2] font-semibold text-left"
              >
                <Store className="w-3.5 h-3.5 text-[#B55234]" />
                <span>Restaurant Profile</span>
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setIsAddRestaurantOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#B55234] hover:bg-[#FAF0EA] font-semibold text-left"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add restaurant</span>
              </button>

              <Link
                href="/mainpage/profile"
                onClick={() => setProfileDropdownOpen(false)}
                className="block px-3 py-1.5 rounded-lg text-xs text-[#3D3A36] hover:bg-[#FAF7F2]"
              >
                Account Profile
              </Link>

              <Link
                href="/mainpage"
                onClick={() => setProfileDropdownOpen(false)}
                className="block px-3 py-1.5 rounded-lg text-xs text-[#3D3A36] hover:bg-[#FAF7F2]"
              >
                Customer Diner App
              </Link>

              <div className="my-1 border-t border-[#ECE7DC]" />

              <button
                type="button"
                onClick={async () => {
                  setProfileDropdownOpen(false);
                  await signOut();
                  router.replace("/auth/signin");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 bg-red-50/70 hover:bg-red-100 font-bold border border-red-200/70 text-left transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
