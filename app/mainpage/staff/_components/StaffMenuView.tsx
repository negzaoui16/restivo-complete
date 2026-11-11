"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, Box, Check, Loader2, Search, Sparkles, Tag, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiStaffMenu } from "@/lib/staff/board-client";
import { getCachedMenu } from "@/lib/offline/offline-manager";

export function StaffMenuView({
  restaurantId,
  search = "",
}: {
  restaurantId: string;
  search?: string;
}) {
  const { getAccessToken } = useAuth();
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Try local cache first for instant rendering
      const cached = getCachedMenu(restaurantId);
      if (cached && !cancelled) {
        setMenuData(cached);
        setLoading(false);
      }

      // 2. Fetch fresh menu
      try {
        const token = getAccessToken();
        if (!token) return;
        const res = await apiStaffMenu(token, restaurantId);
        if (!cancelled && res.ok && res.menu) {
          setMenuData(res.menu);
        }
      } catch (err) {
        // Fallback to cached
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, getAccessToken]);

  const categories = menuData?.categories || [];

  // Extract all dishes
  const allDishes = useMemo(() => {
    const list: any[] = [];
    for (const cat of categories) {
      const items = cat.items || [];
      for (const item of items) {
        list.push({
          ...item,
          categoryName: cat.name,
        });
      }
    }
    return list;
  }, [categories]);

  // Filtered dishes
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allDishes.filter((dish) => {
      if (selectedCat !== "all" && dish.categoryId !== selectedCat) return false;
      if (needle) {
        const matchName = dish.name.toLowerCase().includes(needle);
        const matchDesc = dish.description?.toLowerCase().includes(needle);
        const matchCat = dish.categoryName?.toLowerCase().includes(needle);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [allDishes, selectedCat, search]);

  if (loading && !menuData) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]">
        <Loader2 className="w-4 h-4 animate-spin text-[#B55234]" />
        <span>Chargement de la carte et du menu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 select-none">
      {/* ─── Header & Stats ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#EDE7DC] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A]">Carte du Restaurant</h3>
            <p className="text-xs text-[#7A746B]">
              Consultez les plats disponibles, ingrédients, allergènes et prix pour le service
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-[#FAF0EA] text-[#B55234] text-xs font-bold border border-[#F0D5C9]">
            {allDishes.length} Plats au menu
          </span>
          <span className="px-3 py-1 rounded-xl bg-[#DCFCE7] text-[#15803d] text-xs font-bold border border-[#BBF7D0]">
            {categories.length} Catégories
          </span>
        </div>
      </div>

      {/* ─── Category Filter Pills ─── */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-2xl bg-white border border-[#EDE7DC]">
        <button
          type="button"
          onClick={() => setSelectedCat("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            selectedCat === "all"
              ? "bg-[#B55234] text-white shadow-2xs"
              : "text-[#6B6661] hover:bg-[#FAF7F2] hover:text-[#1A1A1A]"
          }`}
        >
          Tous ({allDishes.length})
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCat(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              selectedCat === cat.id
                ? "bg-[#B55234] text-white shadow-2xs"
                : "text-[#6B6661] hover:bg-[#FAF7F2] hover:text-[#1A1A1A]"
            }`}
          >
            {cat.name} ({cat.items?.length || 0})
          </button>
        ))}
      </div>

      {/* ─── Dishes Grid ─── */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-[#EDE7DC] text-center text-sm text-[#736D65]">
          Aucun plat ne correspond à cette recherche.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((dish) => {
            const has3D = Boolean(dish.model3dUrl);
            const isAvailable = dish.isAvailable !== false;

            return (
              <div
                key={dish.id}
                className="rounded-2xl border border-[#EDE7DC] bg-white overflow-hidden shadow-xs hover:border-[#D5CEC0] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Photo or Placeholder */}
                  <div className="relative h-36 w-full bg-[#FAF7F2] overflow-hidden">
                    {dish.imageUrl ? (
                      <Image
                        src={dish.imageUrl}
                        alt={dish.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#B55234]/60 gap-1">
                        <UtensilsCrossed className="w-8 h-8" />
                        <span className="text-[10px] font-semibold text-[#8C857B]">Photo du plat</span>
                      </div>
                    )}

                    {/* Badges on image */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                        {dish.categoryName}
                      </span>
                    </div>

                    {has3D && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-lg bg-[#B55234] text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                          <Box className="w-3 h-3" />
                          3D · AR
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#1A1A1A] line-clamp-1">{dish.name}</h4>
                      <span className="text-sm font-extrabold text-[#B55234] shrink-0">
                        {typeof dish.price === "number" ? dish.price.toFixed(3) : dish.price} DT
                      </span>
                    </div>

                    {dish.description && (
                      <p className="text-xs text-[#736D65] line-clamp-2 leading-relaxed">
                        {dish.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer: Availability */}
                <div className="px-3.5 py-2.5 bg-[#FAF7F2]/60 border-t border-[#EDE7DC] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#7A746B]">Disponibilité :</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                      isAvailable ? "text-[#15803d]" : "text-[#B55234]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAvailable ? "bg-[#15803d]" : "bg-[#B55234]"
                      }`}
                    />
                    {isAvailable ? "En stock" : "Épuisé"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
