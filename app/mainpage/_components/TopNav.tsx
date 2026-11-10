"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ChevronDown, Menu } from "lucide-react";
import { useMainpage } from "./MainpageProvider";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { profileInitials } from "../_lib/profile";

export function TopNav() {
  const { searchQuery, setSearchQuery, openMobileMenu } = useMainpage();
  const { user } = useAuth();

  const profileName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Guest";
  const initials = profileInitials(user?.firstName, user?.lastName, user?.displayName);

  return (
    <header className="flex items-center justify-between gap-3 sm:gap-4 pb-4">
      {/* Mobile Hamburger + Search */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <button
          onClick={openMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#4A4643] hover:text-[#1A1A1A] hover:bg-black/5"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Top search bar pill */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E988F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or city"
            className="w-full bg-[#FAF7F2]/60 hover:bg-white focus:bg-white text-xs sm:text-[13px] text-[#1A1A1A] placeholder-[#9E988F] pl-9.5 pr-4 py-2 rounded-full border border-[#E8E4DA] focus:border-[#B55234] focus:outline-none transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Right controls: Location + Bell + Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <NotificationBell />

        {/* User Profile Pill */}
        <Link
          href="/mainpage/profile"
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/80 transition-colors group"
        >
          {user?.avatarUrl ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-[#E2DDD3]">
              <Image
                src={user.avatarUrl}
                alt={profileName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B55234] text-[10px] font-bold tracking-wide text-white ring-1 ring-[#E2DDD3]">
              {initials}
            </div>
          )}
          <span className="hidden sm:inline text-xs font-semibold text-[#24211E]">
            {profileName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#7A746B] group-hover:text-[#1A1A1A] transition-colors" />
        </Link>
      </div>
    </header>
  );
}
