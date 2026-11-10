"use client";

import React, { useState } from "react";
import { Sparkles, Star, Dumbbell, HelpCircle, AlertOctagon, TrendingUp } from "lucide-react";
import { MENU_ENGINEERING_ITEMS } from "../_lib/mock-data";
import { MenuEngineeringItem } from "../_lib/types";

export function MenuEngineeringTab() {
  const [items, setItems] = useState<MenuEngineeringItem[]>(MENU_ENGINEERING_ITEMS);
  const [filter, setFilter] = useState<string>("all");

  const filteredItems = items.filter((i) =>
    filter === "all" ? true : i.classification === filter
  );

  const stars = items.filter((i) => i.classification === "star");
  const plowhorses = items.filter((i) => i.classification === "plowhorse");
  const puzzles = items.filter((i) => i.classification === "puzzle");
  const dogs = items.filter((i) => i.classification === "dog");

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ─── 1. Header & Concept Explainer ─── */}
      <div className="p-4 rounded-2xl bg-[#FAF0EA] border border-[#F0D5C9] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-[#B55234] flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">
              Matrice de Menu Engineering (Rentabilité vs Popularité)
            </h3>
            <p className="text-xs text-[#736D65]">
              Classement automatique de chaque plat de votre carte pour maximiser les profits
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. Les 4 Quadrants de la Restauration ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stars */}
        <div
          onClick={() => setFilter(filter === "star" ? "all" : "star")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === "star"
              ? "bg-[#F0FDF4] border-[#15803d] ring-2 ring-[#15803d]/20"
              : "bg-white/80 border-[#E8E2D7] hover:border-[#15803d]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#15803d] uppercase tracking-wider">
              ⭐ Stars (Étoiles)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803d] text-xs font-extrabold">
              {stars.length} plats
            </span>
          </div>
          <div className="text-xs font-semibold text-[#1A1A1A] mt-2">
            Forte Marge · Forte Popularité
          </div>
          <p className="text-[11px] text-[#736D65] mt-1">
            Vos champions de rentabilité. Maintenir la recette exacte et la mise en avant.
          </p>
        </div>

        {/* Plowhorses */}
        <div
          onClick={() => setFilter(filter === "plowhorse" ? "all" : "plowhorse")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === "plowhorse"
              ? "bg-[#EFF6FF] border-[#2563eb] ring-2 ring-[#2563eb]/20"
              : "bg-white/80 border-[#E8E2D7] hover:border-[#2563eb]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">
              🐎 Vaches à lait
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563eb] text-xs font-extrabold">
              {plowhorses.length} plats
            </span>
          </div>
          <div className="text-xs font-semibold text-[#1A1A1A] mt-2">
            Marge Modérée · Forte Vente
          </div>
          <p className="text-[11px] text-[#736D65] mt-1">
            Très demandés mais marge plus faible. Possibilité d&apos;ajuster légèrement le prix.
          </p>
        </div>

        {/* Puzzles */}
        <div
          onClick={() => setFilter(filter === "puzzle" ? "all" : "puzzle")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === "puzzle"
              ? "bg-[#FFFBEB] border-[#b45309] ring-2 ring-[#b45309]/20"
              : "bg-white/80 border-[#E8E2D7] hover:border-[#b45309]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#b45309] uppercase tracking-wider">
              🧩 Dilemmes
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#b45309] text-xs font-extrabold">
              {puzzles.length} plats
            </span>
          </div>
          <div className="text-xs font-semibold text-[#1A1A1A] mt-2">
            Très Forte Marge · Faible Vente
          </div>
          <p className="text-[11px] text-[#736D65] mt-1">
            Très rentables mais peu connus. À recommander par les serveurs et en AR 3D.
          </p>
        </div>

        {/* Dogs */}
        <div
          onClick={() => setFilter(filter === "dog" ? "all" : "dog")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === "dog"
              ? "bg-[#FEF2F2] border-[#b91c1c] ring-2 ring-[#b91c1c]/20"
              : "bg-white/80 border-[#E8E2D7] hover:border-[#b91c1c]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#b91c1c] uppercase tracking-wider">
              ⚠️ Poids Morts
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#b91c1c] text-xs font-extrabold">
              {dogs.length} plats
            </span>
          </div>
          <div className="text-xs font-semibold text-[#1A1A1A] mt-2">
            Faible Marge · Faible Vente
          </div>
          <p className="text-[11px] text-[#736D65] mt-1">
            Plats encombrants pour la cuisine. Envisager de retirer du menu ou refaire la recette.
          </p>
        </div>
      </div>

      {/* ─── 3. Tableau Détaillé par Plat ─── */}
      <div className="rounded-2xl bg-white/90 border border-[#E8E2D7] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E8E2D7] bg-[#FAF7F2] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">
              Analyse Financière Détaillée par Plat
            </h3>
            <p className="text-xs text-[#736D65]">
              Prix de vente, coût matière, marge unitaire et bénéfice net généré
            </p>
          </div>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="text-xs text-[#B55234] font-bold hover:underline"
            >
              Afficher tous les plats
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D7] text-[#8C857B] font-bold uppercase text-[10px] tracking-wider bg-black/[0.01]">
                <th className="py-3 px-4">Plat / Article</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Prix Vente</th>
                <th className="py-3 px-4">Food Cost</th>
                <th className="py-3 px-4">Marge Unitaire</th>
                <th className="py-3 px-4">Volume Vendu</th>
                <th className="py-3 px-4">Revenu Total</th>
                <th className="py-3 px-4">Profit Net Total</th>
                <th className="py-3 px-4">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D7]">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#1A1A1A]">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-[#736D65]">{item.category}</td>
                  <td className="py-3 px-4 font-semibold text-[#1A1A1A]">
                    {item.sellingPrice.toFixed(2)} DT
                  </td>
                  <td className="py-3 px-4 text-[#B55234] font-medium">
                    {item.foodCost.toFixed(2)} DT ({((item.foodCost / item.sellingPrice) * 100).toFixed(0)}%)
                  </td>
                  <td className="py-3 px-4 font-bold text-[#15803d]">
                    +{item.unitMargin.toFixed(2)} DT
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#1A1A1A]">
                    {item.volumeSold} commandes
                  </td>
                  <td className="py-3 px-4 font-bold text-[#1A1A1A]">
                    {item.totalRevenue.toFixed(2)} DT
                  </td>
                  <td className="py-3 px-4 font-extrabold text-[#15803d]">
                    +{item.totalProfit.toFixed(2)} DT
                  </td>
                  <td className="py-3 px-4">
                    {item.classification === "star" ? (
                      <span className="px-2 py-1 rounded-full bg-[#F0FDF4] text-[#15803d] border border-[#BBF7D0] font-extrabold text-[10px]">
                        ⭐ Star
                      </span>
                    ) : item.classification === "plowhorse" ? (
                      <span className="px-2 py-1 rounded-full bg-[#EFF6FF] text-[#2563eb] border border-[#BFDBFE] font-bold text-[10px]">
                        🐎 Vache à lait
                      </span>
                    ) : item.classification === "puzzle" ? (
                      <span className="px-2 py-1 rounded-full bg-[#FFFBEB] text-[#b45309] border border-[#FDE68A] font-bold text-[10px]">
                        🧩 Dilemme
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-[#FEF2F2] text-[#b91c1c] border border-[#FECACA] font-bold text-[10px]">
                        ⚠️ Poids Mort
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
