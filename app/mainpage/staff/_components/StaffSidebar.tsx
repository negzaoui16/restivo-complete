"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Armchair,
  Bell,
  CalendarDays,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileInitials } from "../../_lib/profile";
import type { StaffSectionId } from "../_lib/types";
import { useStaffChrome } from "../_context/staff-chrome";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "reservations", label: "Reservations", icon: CalendarDays },
  { id: "tables", label: "Tables", icon: Armchair },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const satisfies ReadonlyArray<{ id: StaffSectionId; label: string; icon: typeof Bell }>;

export function StaffSidebar() {
  const { mobileOpen, setMobileOpen, section, setSection } = useStaffChrome();
  const content = <SidebarBody section={section} onSelect={setSection} onClose={() => setMobileOpen(false)} />;

  return (
    <>
      <aside className="hidden h-full w-[215px] shrink-0 flex-col border-r border-[#ECE7DC] bg-[#FAF7F2] select-none lg:flex xl:w-[235px]">
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-10 h-full w-[260px] bg-[#FAF7F2] shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
}

function SidebarBody({
  section,
  onSelect,
  onClose,
}: {
  section: StaffSectionId;
  onSelect: (section: StaffSectionId) => void;
  onClose: () => void;
}) {
  const { user, signOut } = useAuth();
  const { workplace, workplaceReady } = useStaffChrome();
  const router = useRouter();
  const [supportOpen, setSupportOpen] = useState(false);
  const name = user?.firstName || user?.displayName || "Staff";

  const leave = async () => {
    try {
      await signOut();
    } catch {
      // The cookie clear is best-effort; still leave the workspace.
    }
    router.push("/auth/signin");
  };

  return (
    <div className="flex h-full flex-col justify-between bg-[#FAF7F2] px-3 py-5 text-[#1A1A1A] sm:px-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <Link href="/mainpage/staff" className="relative h-7 w-[120px]" onClick={onClose}>
            <Image src="/images/restivo-logo-primary.png" alt="RESTIVO" fill className="object-contain object-left" priority />
          </Link>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#6B6661] hover:bg-black/5 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <VenueCard name={workplace?.name ?? null} city={workplace?.city ?? null} coverUrl={workplace?.coverUrl ?? null} ready={workplaceReady} />

        {workplace ? (
          <nav className="flex flex-col gap-0.5" aria-label="Staff workspace">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors ${
                  active ? "bg-[#FAF0EA] font-bold text-[#B55234]" : "text-[#666059] hover:bg-black/[0.03] hover:text-[#1A1A1A]"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[#B55234]" : "text-[#7B756E]"}`} strokeWidth={active ? 2.3 : 1.9} />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 border-t border-[#ECE7DC] pt-4">
        <button
          type="button"
          onClick={() => setSupportOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-[13px] font-medium text-[#666059] hover:bg-black/[0.03]"
        >
          <HelpCircle className="h-4 w-4 text-[#7B756E]" />
          Help & Support
        </button>
        {supportOpen && <p className="px-3.5 text-[11px] text-[#8C877D]">hello@restivo.app</p>}
        <Link href="/mainpage/profile" onClick={onClose} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-black/[0.03]">
          <StaffAvatar name={name} avatarUrl={user?.avatarUrl} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{name}</span>
            <span className="block text-[11px] text-[#8C877D]">Staff</span>
          </span>
        </Link>
        <button type="button" onClick={() => void leave()} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-[13px] font-medium text-[#C0392B] hover:bg-[#FDEEEC]">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

function VenueCard({
  name,
  city,
  coverUrl,
  ready,
}: {
  name: string | null;
  city: string | null;
  coverUrl: string | null;
  ready: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-[#E9E3D8] bg-white/70 p-2">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2DDD3] bg-[#FAF0EA] text-[11px] font-bold text-[#B55234]">
        {coverUrl?.startsWith("/") ? (
          <Image src={coverUrl} alt="" fill className="object-cover" sizes="36px" />
        ) : (
          (name ?? "—").slice(0, 1)
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold">{!ready ? "Loading…" : name ?? "No restaurant yet"}</p>
        <p className="mt-0.5 truncate text-[11px] text-[#78726A]">
          {name ? (city ?? "On the team") : "Ask to join a restaurant"}
        </p>
      </div>
    </div>
  );
}

function StaffAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <span className="relative h-8 w-8 overflow-hidden rounded-full">
        <Image src={avatarUrl} alt="" fill className="object-cover" sizes="32px" />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B55234] text-[11px] font-bold text-white">
      {profileInitials(null, null, name)}
    </span>
  );
}
