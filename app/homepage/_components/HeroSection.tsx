"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FLOORS } from "../_data";

// ─── Floating Widget: Floor Selector ─────────────────────────────────────────

interface FloorSelectorProps {
  selectedFloor: string;
  onSelect: (name: string) => void;
}

function FloorSelectorWidget({ selectedFloor, onSelect }: FloorSelectorProps) {
  return (
    <div className="absolute top-4 right-4 sm:top-8 sm:right-6 z-20 bg-white/92 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)] border border-white/80 w-38 sm:w-48 transition-all">
      <div className="flex items-center gap-2 mb-2.5 text-zinc-700 font-semibold text-xs sm:text-[13px]">
        <svg
          className="w-3.5 h-3.5 text-[#B55234]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span>Restaurant Floor</span>
      </div>
      <div className="space-y-1">
        {FLOORS.map((floor) => {
          const isActive = selectedFloor === floor.name;
          return (
            <button
              key={floor.name}
              type="button"
              onClick={() => onSelect(floor.name)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#FAF2ED] text-[#B55234] font-semibold"
                  : "text-zinc-600 hover:bg-black/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${floor.color}`} />
                <span>{floor.name}</span>
              </div>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#B55234]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Floating Widget: Table Popover ──────────────────────────────────────────

interface TablePopoverProps {
  isReserved: boolean;
  onToggle: () => void;
}

function TablePopoverWidget({ isReserved, onToggle }: TablePopoverProps) {
  return (
    <div className="absolute top-[48%] left-[28%] sm:left-[32%] -translate-y-1/2 z-20 bg-white rounded-2xl p-3 sm:p-4 shadow-[0_16px_36px_rgba(0,0,0,0.18)] border border-black/5 w-42 sm:w-52 transition-all">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-zinc-900 text-sm sm:text-base">Table 12</span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          <span>4</span>
        </span>
      </div>

      <p className="text-[11px] sm:text-xs text-zinc-500 flex items-center gap-1.5 mb-3">
        <span
          className={`w-1.5 h-1.5 rounded-full ${isReserved ? "bg-amber-500" : "bg-emerald-500"}`}
        />
        <span>{isReserved ? "Reserved for 19:30" : "Available • Near window"}</span>
      </p>

      <button
        type="button"
        onClick={onToggle}
        className={`w-full py-1.5 sm:py-2 px-3 rounded-full text-xs font-semibold transition-all shadow-sm cursor-pointer ${
          isReserved
            ? "bg-zinc-800 text-white hover:bg-black"
            : "bg-[#B55234] hover:bg-[#9E4328] text-white active:scale-95"
        }`}
      >
        {isReserved ? "Cancel Booking" : "Reserve"}
      </button>
    </div>
  );
}

// ─── Floating Widget: 3D / 2D View Toggle ────────────────────────────────────

type ViewMode = "3D" | "2D";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeToggleWidget({ viewMode, onChange }: ViewModeToggleProps) {
  return (
    <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center gap-2 bg-white/92 backdrop-blur-md rounded-full p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-white/80">
      {(["3D", "2D"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            viewMode === mode
              ? "bg-[#B55234] text-white shadow-sm"
              : "text-zinc-600 hover:text-black"
          }`}
        >
          {mode}
        </button>
      ))}
      <button
        type="button"
        title="Fullscreen view"
        onClick={() => alert("Toggle 3D Floorplan Fullscreen Mode")}
        className="p-1.5 rounded-full text-zinc-500 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

export function HeroSection() {
  const [selectedFloor, setSelectedFloor] = useState("Main Floor");
  const [viewMode, setViewMode] = useState<ViewMode>("3D");
  const [table12Reserved, setTable12Reserved] = useState(false);

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-8 sm:pt-14 pb-16 lg:pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left: Headline & Value Proposition */}
        <div className="lg:col-span-5 flex flex-col items-start pr-0 lg:pr-4">
          <span className="text-[#B55234] font-bold text-[12px] sm:text-[13px] tracking-[0.18em] uppercase mb-4">
            THE RESTAURANT OPERATING SYSTEM
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-extrabold tracking-[-0.03em] text-[#161413] leading-[1.08] mb-6">
            Your restaurant.
            <br />
            Reimagined.
          </h1>

          <p className="text-[#5C5752] text-base sm:text-[17px] leading-[1.65] font-normal max-w-lg mb-8">
            Create your menu, design your tables, manage reservations, and deliver a better dining
            experience — all from one beautifully connected platform.
          </p>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link
              href="#create"
              className="group inline-flex items-center gap-3 rounded-full bg-[#B55234] hover:bg-[#9E4328] text-white px-7 py-3.5 text-[15px] font-semibold transition-all duration-200 shadow-sm hover:shadow-lg active:scale-95"
            >
              <span>Create your restaurant</span>
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={() => alert("Exploring Restivo platform interactive preview")}
              className="inline-flex items-center gap-2.5 text-[#B55234] hover:text-[#9E4328] font-semibold text-[15px] transition-colors py-2 px-1 group cursor-pointer"
            >
              <span>Explore Restivo</span>
              <span className="w-7 h-7 rounded-full border border-[#B55234] group-hover:border-[#9E4328] flex items-center justify-center transition-colors">
                <svg
                  className="w-3 h-3 translate-x-0.5 fill-current text-[#B55234] group-hover:text-[#9E4328]"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Right: 3D Isometric Floorplan + Interactive Overlays */}
        <div className="lg:col-span-7 relative flex justify-center">
          <div className="relative w-full max-w-[680px]">
            {/* Floorplan Image */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(26,26,26,0.08)]">
              <Image
                src="/images/hero-floorplan-3d.jpg"
                alt="Restivo 3D Restaurant Floorplan Management System"
                width={1360}
                height={1020}
                priority
                className="w-full h-auto object-cover transform hover:scale-[1.01] transition-transform duration-500"
              />
              <div className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-black/5" />
            </div>

            <FloorSelectorWidget selectedFloor={selectedFloor} onSelect={setSelectedFloor} />
            <TablePopoverWidget isReserved={table12Reserved} onToggle={() => setTable12Reserved((v) => !v)} />
            <ViewModeToggleWidget viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>
    </section>
  );
}
