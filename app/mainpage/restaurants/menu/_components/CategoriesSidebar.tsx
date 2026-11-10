"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { PublicMenuCategory } from "@/lib/menu/types";

export function CategoriesSidebar({
  categories,
  selected,
  onSelect,
  onAdd,
  disabled,
}: {
  categories: PublicMenuCategory[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const rows = [{ id: "all", name: "All items", itemCount: categories.reduce((sum, c) => sum + c.itemCount, 0) }, ...categories];

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-bold text-[#1A1A1A] mb-2">Categories</h3>
      {rows.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive ? "bg-[#B55234] text-white shadow-sm" : "text-[#1A1A1A] hover:bg-[#F5F0E8]"
            }`}
          >
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                isActive ? "bg-white/20" : "bg-[#F5F0E8] group-hover:bg-[#E8E2D7] text-[#B55234]"
              }`}
            >
              {cat.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 text-left truncate">{cat.name}</span>
            <span
              className={`text-xs font-bold min-w-[24px] text-center transition-colors ${
                isActive ? "text-white/80" : "text-[#A39C91]"
              }`}
            >
              {cat.itemCount}
            </span>
          </button>
        );
      })}

      {adding ? (
        <form
          className="mt-2 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            onAdd(trimmed);
            setName("");
            setAdding(false);
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="w-full bg-white rounded-xl border border-[#DFD8CC] px-3 py-2 text-sm focus:outline-none focus:border-[#B55234]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled || !name.trim()}
              className="flex-1 py-1.5 rounded-lg bg-[#B55234] text-white text-xs font-bold disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setName("");
              }}
              className="flex-1 py-1.5 rounded-lg border border-[#E8E2D7] text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-[#E8E2D7] text-[#A39C91] text-sm font-medium hover:border-[#B55234] hover:text-[#B55234] hover:bg-[#FAF0EA] transition-all duration-200 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Add category
        </button>
      )}
    </div>
  );
}
