"use client";

import Image from "next/image";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileInitials } from "../../_lib/profile";
import { useStaffChrome } from "../_context/staff-chrome";

const SECTION_LABEL = {
  overview: "Staff Workspace",
  reservations: "Reservations",
  tables: "Tables",
  orders: "Orders",
  menu: "Menu",
  notifications: "Notifications",
} as const;

export function StaffTopNav() {
  const { user } = useAuth();
  const { setMobileOpen, section, setSection, search, setSearch, workplace } = useStaffChrome();
  const name = user?.firstName || user?.displayName || "Staff";
  const placeName = workplace?.name ?? "Find a restaurant";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-[#ECE7DC] pb-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-xl p-2 text-[#4A4643] hover:bg-black/5 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#736D65]">
          {workplace ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#2E7D32]" /> : null}
          <span className="truncate font-semibold text-[#1A1A1A]">{placeName}</span>
          {workplace ? (
            <>
              <span className="text-[#A39C91]">/</span>
              <span className="truncate">{SECTION_LABEL[section]}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <label className="relative hidden sm:block">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#9E988F]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            className="w-44 rounded-full border border-[#E8E4DA] bg-white/70 py-1.5 pr-3 pl-8 text-xs focus:border-[#B55234] focus:bg-white focus:outline-none md:w-56"
          />
        </label>
        {workplace ? (
          <button
            type="button"
            onClick={() => setSection("notifications")}
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E4DA] bg-white/80"
            aria-label="View notifications"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {workplace ? (
          <span className="hidden items-center gap-1.5 rounded-full border border-[#E8E4DA] bg-white/80 px-2.5 py-1 text-[11px] font-semibold md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D32]" />
            {workplace.name}
            <span className="font-medium text-[#2E7D32]">Open</span>
            <ChevronDown className="h-3 w-3 text-[#8A847C]" />
          </span>
        ) : null}
        <span className="flex items-center gap-2 rounded-full border border-[#E8E4DA] bg-white/70 py-1 pr-2.5 pl-1">
          {user?.avatarUrl ? (
            <span className="relative h-7 w-7 overflow-hidden rounded-full">
              <Image src={user.avatarUrl} alt="" fill className="object-cover" sizes="28px" />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B55234] text-[10px] font-bold text-white">
              {profileInitials(user?.firstName, user?.lastName, user?.displayName)}
            </span>
          )}
          <span className="hidden text-left sm:block">
            <span className="block text-xs leading-tight font-semibold">{name}</span>
            <span className="block text-[10px] leading-tight text-[#8C877D]">Staff</span>
          </span>
        </span>
      </div>
    </header>
  );
}
