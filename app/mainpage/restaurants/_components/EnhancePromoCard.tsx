"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";

interface EnhancePromoCardProps {
  onExplore?: () => void;
}

export function EnhancePromoCard({ onExplore }: EnhancePromoCardProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm group min-h-[140px] flex items-center">
      {/* Background Image with Dark Tint */}
      <Image
        src="/images/restaurant-ambient.jpg"
        alt="Enhance your restaurant"
        fill
        className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/50" />

      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col justify-between h-full w-full">
        <div>
          <div className="flex items-center gap-1.5 text-[#E6A15C] text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Restivo Pro</span>
          </div>
          <h4 className="text-base sm:text-[17px] font-bold text-white tracking-tight">
            Enhance your restaurant
          </h4>
          <p className="text-xs text-white/80 mt-1 max-w-sm line-clamp-2 leading-relaxed">
            Discover advanced features like 3D floor plans, staff management and detailed analytics.
          </p>
        </div>

        <div className="mt-3.5">
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-xs font-semibold transition-all group-hover:border-white/40"
          >
            <span>Explore features</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
