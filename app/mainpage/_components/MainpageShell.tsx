"use client";

/**
 * Persistent app chrome for /mainpage/*.
 *
 * The outer card, sidebar and top nav mount once in the layout. Only
 * `{children}` (the page body) is replaced on navigation.
 */
import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { RestaurantSidebar } from "../restaurants/_components/RestaurantSidebar";
import { RestaurantTopNav } from "../restaurants/_components/RestaurantTopNav";
import { RestaurantManagerProvider } from "../restaurants/_context/RestaurantManagerContext";
import { AddRestaurantModal } from "../restaurants/_components/AddRestaurantModal";
import { RestaurantProfileModal } from "../restaurants/_components/RestaurantProfileModal";
import { StaffSidebar } from "../staff/_components/StaffSidebar";
import { StaffTopNav } from "../staff/_components/StaffTopNav";
import { StaffChromeProvider } from "../staff/_context/staff-chrome";

export function MainpageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRestaurantRoute = pathname?.startsWith("/mainpage/restaurants");
  const isStaffRoute = pathname?.startsWith("/mainpage/staff");

  const content = (
    <div className="relative min-h-screen w-full font-sans antialiased text-[#1A1A1A]">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/VisualIdentity/microPattern.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "880px auto",
          backgroundColor: "#FAF7F2",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[#FAF7F2]/40 backdrop-blur-[0.5px] pointer-events-none" />

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-1.5 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-[1440px] bg-[#FAF7F2] rounded-3xl md:rounded-[32px] border border-[#E8E2D7] shadow-2xl flex overflow-hidden h-[96vh] sm:h-[min(92vh,920px)] xl:h-[min(94vh,960px)] min-h-[640px]">
          {isStaffRoute ? <StaffSidebar /> : isRestaurantRoute ? <RestaurantSidebar /> : <Sidebar />}

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="shrink-0 px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
              {isStaffRoute ? <StaffTopNav /> : isRestaurantRoute ? <RestaurantTopNav /> : <TopNav />}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 lg:px-8 pb-5 sm:pb-6">
              {children}
            </div>
          </div>
        </div>
      </div>
      {isRestaurantRoute && (
        <>
          <AddRestaurantModal />
          <RestaurantProfileModal />
        </>
      )}
    </div>
  );

  if (isStaffRoute) return <StaffChromeProvider>{content}</StaffChromeProvider>;
  if (isRestaurantRoute) return <RestaurantManagerProvider>{content}</RestaurantManagerProvider>;

  return content;
}
