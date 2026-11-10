"use client";

import { Search } from "lucide-react";
import type { PublicMenuCategory } from "@/lib/menu/types";
import type { FilterKey, SortKey } from "../_lib/menu-ui";
import {
  FilterDropdownButton,
  FilterDropdownMenu,
  FilterDropdownOption,
} from "./FilterDropdown";

export function MenuFilterBar({
  searchQuery,
  onSearchChange,
  openDropdown,
  setOpenDropdown,
  filterAvailability,
  setFilterAvailability,
  filterPromotion,
  setFilterPromotion,
  filterPrice,
  setFilterPrice,
  sortBy,
  setSortBy,
  selectedCategory,
  setSelectedCategory,
  categories,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  openDropdown: FilterKey | null;
  setOpenDropdown: (key: FilterKey | null) => void;
  filterAvailability: string;
  setFilterAvailability: (value: string) => void;
  filterPromotion: string;
  setFilterPromotion: (value: string) => void;
  filterPrice: string;
  setFilterPrice: (value: string) => void;
  sortBy: SortKey;
  setSortBy: (value: SortKey) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categories: PublicMenuCategory[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl px-3 py-2.5">
      <div className="relative flex-1 min-w-[140px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39C91]" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8E2D7] bg-white text-sm text-[#1A1A1A] placeholder:text-[#A39C91] focus:outline-none focus:ring-2 focus:ring-[#B55234]/20 focus:border-[#B55234] transition"
        />
      </div>

      <div className="lg:hidden relative">
        <FilterDropdownButton
          label="Category"
          isActive={selectedCategory !== "all"}
          isOpen={openDropdown === "category"}
          onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
        />
        {openDropdown === "category" && (
          <FilterDropdownMenu>
            <FilterDropdownOption
              label="All"
              active={selectedCategory === "all"}
              onClick={() => {
                setSelectedCategory("all");
                setOpenDropdown(null);
              }}
            />
            {categories.map((cat) => (
              <FilterDropdownOption
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setOpenDropdown(null);
                }}
              />
            ))}
          </FilterDropdownMenu>
        )}
      </div>

      <div className="relative">
        <FilterDropdownButton
          label="Availability"
          isActive={filterAvailability !== "all"}
          isOpen={openDropdown === "availability"}
          onClick={() =>
            setOpenDropdown(openDropdown === "availability" ? null : "availability")
          }
        />
        {openDropdown === "availability" && (
          <FilterDropdownMenu>
            {[
              { v: "all", l: "All" },
              { v: "available", l: "Available" },
              { v: "unavailable", l: "Unavailable" },
            ].map(({ v, l }) => (
              <FilterDropdownOption
                key={v}
                label={l}
                active={filterAvailability === v}
                onClick={() => {
                  setFilterAvailability(v);
                  setOpenDropdown(null);
                }}
              />
            ))}
          </FilterDropdownMenu>
        )}
      </div>

      <div className="relative">
        <FilterDropdownButton
          label="Promotion"
          isActive={filterPromotion !== "all"}
          isOpen={openDropdown === "promotion"}
          onClick={() => setOpenDropdown(openDropdown === "promotion" ? null : "promotion")}
        />
        {openDropdown === "promotion" && (
          <FilterDropdownMenu>
            {[
              { v: "all", l: "All" },
              { v: "with", l: "With promotion" },
              { v: "without", l: "Without promotion" },
            ].map(({ v, l }) => (
              <FilterDropdownOption
                key={v}
                label={l}
                active={filterPromotion === v}
                onClick={() => {
                  setFilterPromotion(v);
                  setOpenDropdown(null);
                }}
              />
            ))}
          </FilterDropdownMenu>
        )}
      </div>

      <div className="relative">
        <FilterDropdownButton
          label="Price"
          isActive={filterPrice !== "all"}
          isOpen={openDropdown === "price"}
          onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
        />
        {openDropdown === "price" && (
          <FilterDropdownMenu>
            {[
              { v: "all", l: "All prices" },
              { v: "under-15", l: "Under 15 TND" },
              { v: "15-30", l: "15 – 30 TND" },
              { v: "30-50", l: "30 – 50 TND" },
              { v: "over-50", l: "Over 50 TND" },
            ].map(({ v, l }) => (
              <FilterDropdownOption
                key={v}
                label={l}
                active={filterPrice === v}
                onClick={() => {
                  setFilterPrice(v);
                  setOpenDropdown(null);
                }}
              />
            ))}
          </FilterDropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-[#736D65] ml-auto">
        <span className="font-medium">Sort:</span>
        {(["featured", "price", "name", "order"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortBy(key)}
            className={`px-2 py-1 rounded-md capitalize transition-colors text-xs font-medium ${
              sortBy === key ? "bg-[#B55234] text-white" : "hover:bg-[#E8E2D7] text-[#736D65]"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
