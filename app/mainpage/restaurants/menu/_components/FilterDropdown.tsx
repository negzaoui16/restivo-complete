"use client";

import React from "react";
import { Check, ChevronDown } from "lucide-react";

export function FilterDropdownButton({
  label,
  isActive,
  isOpen,
  onClick,
}: {
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
        isActive
          ? "border-[#B55234] bg-[#FAF0EA] text-[#B55234]"
          : "border-[#E8E2D7] bg-white text-[#736D65] hover:bg-[#F5F0E8]"
      } ${isOpen ? "ring-2 ring-[#B55234]/20" : ""}`}
    >
      {label}
      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
  );
}

export function FilterDropdownMenu({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-white border border-[#E8E2D7] rounded-xl shadow-lg py-1 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
      {children}
    </div>
  );
}

export function FilterDropdownOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
        active ? "bg-[#FAF0EA] text-[#B55234] font-semibold" : "text-[#1A1A1A] hover:bg-[#FAF7F2]"
      }`}
    >
      {label}
      {active && <Check className="w-3.5 h-3.5" />}
    </button>
  );
}
