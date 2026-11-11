"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  Radio,
  BookOpen,
  Armchair,
  Users2,
  Sparkles,
  BarChart3,
  HelpCircle,
  LogOut,
  ChevronDown,
  Plus,
  Check,
  Store,
  X,
  ArrowRight,
  PanelLeftClose,
} from "lucide-react";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";

const RESTAURANTS_ROOT = "/mainpage/restaurants";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: RESTAURANTS_ROOT },
  { id: "reservations", label: "Reservations & orders", icon: CalendarDays, href: `${RESTAURANTS_ROOT}/reservations` },
  { id: "live", label: "Live floor", icon: Radio, href: `${RESTAURANTS_ROOT}/live` },
  { id: "menu", label: "Menu", icon: BookOpen, href: `${RESTAURANTS_ROOT}/menu` },
  { id: "tables", label: "Tables", icon: Armchair, href: `${RESTAURANTS_ROOT}/tables` },
  { id: "staff", label: "Staff", icon: Users2, href: `${RESTAURANTS_ROOT}/staff` },
  { id: "ai", label: "AI Manager", icon: Sparkles, href: `${RESTAURANTS_ROOT}/ai` },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: `${RESTAURANTS_ROOT}/analytics` },
] as const;

function isNavActive(
  pathname: string,
  item: (typeof NAV_ITEMS)[number],
  activeNavTab: string
): boolean {
  if ("href" in item && item.href) {
    if (item.id === "overview") return pathname === RESTAURANTS_ROOT;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === RESTAURANTS_ROOT && activeNavTab === item.id;
}

export function RestaurantSidebar() {
  const {
    restaurants,
    currentRestaurant,
    setCurrentRestaurant,
    setIsAddRestaurantOpen,
    openRestaurantProfile,
    activeNavTab,
    setActiveNavTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    sidebarVisible,
    toggleSidebar,
  } = useRestaurantManager();

  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Ignore
    }
    router.push("/auth/signin");
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between py-5 px-3 sm:px-4 bg-[#FAF7F2] select-none text-[#1A1A1A] overflow-y-auto overflow-x-hidden">
      {/* Top Part */}
      <div className="flex flex-col gap-4">
        {/* Brand & Mobile Close / Desktop Collapse */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <Link
            href="/mainpage"
            className="flex items-center gap-2.5 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="relative h-7 w-auto">
              <Image
                src="/images/restivo-logo-primary.png"
                alt="RESTIVO"
                width={120}
                height={28}
                priority
                className="h-7 w-auto object-contain transition-transform group-hover:scale-102"
              />
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-lg text-[#6B6661] hover:text-[#1A1A1A] hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
              title="Slide / collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#6B6661] hover:text-[#1A1A1A] hover:bg-black/5"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Restaurant Switcher & Profile Card */}
        <div className="relative">
          <div className="w-full flex items-center justify-between gap-1 p-1.5 rounded-2xl bg-white/70 hover:bg-white border border-[#E9E3D8] hover:border-[#DED5C7] shadow-2xs transition-all group">
            {/* Click restaurant name/info to open its Restaurant Profile */}
            <button
              type="button"
              onClick={() => openRestaurantProfile(currentRestaurant)}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 text-left rounded-xl hover:bg-[#FAF7F2] transition-colors"
              title="Click to view Restaurant Profile"
            >
              <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-[#E2DDD3] shadow-2xs">
                {currentRestaurant ? (
                  <Image
                    src={currentRestaurant.image || "/images/restaurant-ambient.jpg"}
                    alt={currentRestaurant.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#FAF0EA] flex items-center justify-center">
                    <Store className="w-4 h-4 text-[#B55234]" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-[#1A1A1A] truncate block group-hover:text-[#B55234] transition-colors">
                    {currentRestaurant?.name ?? "Add a restaurant"}
                  </span>
                  <span className="text-[10px] text-[#B55234] opacity-70 group-hover:opacity-100 transition-opacity">
                    ↗
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-[#78726A] truncate">
                    {currentRestaurant?.location ?? "No venue yet"}
                  </span>
                  {currentRestaurant && (
                    <span className="inline-block px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-[#FAF0EA] text-[#B55234] border border-[#F3DFD4]">
                      {currentRestaurant.role}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Chevron button to open venue switcher dropdown */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 text-[#8A847C] hover:text-[#1A1A1A] transition-colors"
              title="Switch restaurant"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Restaurant Switcher Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-[#E5DEC9] shadow-xl p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8C857B] flex items-center justify-between">
                <span>Managed Venues</span>
                <span className="text-[9px] text-[#B55234] font-medium">Click name to switch</span>
              </div>

              <div className="flex flex-col gap-1 my-1 max-h-52 overflow-y-auto">
                {restaurants.map((rest) => {
                  const isSelected = rest.id === currentRestaurant?.id;
                  return (
                    <div
                      key={rest.id}
                      className={`w-full flex items-center justify-between p-1.5 rounded-xl text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-[#FAF0EA] text-[#B55234] font-semibold"
                          : "hover:bg-[#FAF7F2] text-[#2C2926]"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setCurrentRestaurant(rest);
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                      >
                        <div className="relative w-6 h-6 rounded-lg overflow-hidden shrink-0">
                          <Image
                            src={rest.image || "/images/restaurant-ambient.jpg"}
                            alt={rest.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <p className="truncate font-medium">{rest.name}</p>
                          <p className="text-[10px] text-[#7A746B]">{rest.city}</p>
                        </div>
                      </button>

                      {/* Dedicated button to view every restaurant's profile */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(false);
                            openRestaurantProfile(rest);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-white hover:bg-[#FAF0EA] text-[10px] font-bold text-[#736D65] hover:text-[#B55234] border border-[#E5DEC9] transition-colors"
                          title={`View ${rest.name} Profile`}
                        >
                          Profile
                        </button>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#B55234]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-1.5 border-t border-[#EDE7DC] flex flex-col gap-1">
                {currentRestaurant && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      openRestaurantProfile(currentRestaurant);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E5DEC9] text-[#1A1A1A] text-xs font-semibold transition-colors"
                  >
                    <span>View {currentRestaurant.name} Profile</span>
                    <span className="text-[#B55234]">↗</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsAddRestaurantOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#FAF0EA] hover:bg-[#F5E5DC] text-[#B55234] text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add a restaurant</span>
                </button>

                <Link
                  href="/mainpage"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[#7A746B] hover:text-[#1A1A1A] transition-colors"
                >
                  <span>Switch to Diner View</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-0.5 mt-1" aria-label="Restaurant Management Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(pathname, item, activeNavTab);
            const className = `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all text-left ${
              isActive
                ? "bg-[#FAF0EA] text-[#B55234] font-bold shadow-2xs"
                : "text-[#666059] hover:text-[#1A1A1A] hover:bg-black/[0.03]"
            }`;

            const content = (
              <>
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-[#B55234]" : "text-[#7B756E]"
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.9}
                />
                <span>{item.label}</span>
              </>
            );

            if ("href" in item && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={true}
                  onClick={() => {
                    setActiveNavTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={className}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveNavTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Part: Help, Ahmed Profile, Logout */}
      <div className="flex flex-col gap-2 pt-4 border-t border-[#ECE7DC]">
        {/* Help & Support */}
        <button
          onClick={() => alert("Support desk: hello@restivo.app | +216 71 000 000")}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium text-[#666059] hover:text-[#1A1A1A] hover:bg-black/[0.03] transition-colors text-left"
        >
          <HelpCircle className="w-4 h-4 text-[#7B756E]" strokeWidth={1.9} />
          <span>Help & Support</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium text-[#C0392B] hover:bg-[#FDEEEC] transition-colors text-left"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.9} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Slidable / Collapsible) */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-[#ECE7DC] bg-[#FAF7F2] select-none h-full transition-all duration-300 ease-in-out ${
          sidebarVisible
            ? "w-[215px] xl:w-[235px] opacity-100 translate-x-0"
            : "w-0 -translate-x-full opacity-0 pointer-events-none border-r-0 overflow-hidden"
        }`}
      >
        <div className="w-[215px] xl:w-[235px] h-full shrink-0">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile / Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[260px] sm:w-[280px] bg-[#FAF7F2] shadow-2xl z-10 animate-in slide-in-from-left duration-200 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
