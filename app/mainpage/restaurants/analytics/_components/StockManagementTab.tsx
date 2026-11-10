"use client";

import React, { useMemo, useState } from "react";
import {
  Boxes,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  ChefHat,
  Info,
} from "lucide-react";
import { StockCategory, StockItem, StockMovement } from "../_lib/types";
import { DISH_RECIPES } from "../_lib/mock-data";

interface StockManagementTabProps {
  stockItems: StockItem[];
  movements: StockMovement[];
  onOpenAddModal: () => void;
  onDeclareLoss: (itemId: string, quantity: number, reason: string) => void;
  onRestockItem: (itemId: string, addQty: number) => void;
}

export function StockManagementTab({
  stockItems,
  movements,
  onOpenAddModal,
  onDeclareLoss,
  onRestockItem,
}: StockManagementTabProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRecipeDish, setSelectedRecipeDish] = useState<string>("dish-1");

  // Filtering
  const filteredItems = useMemo(() => {
    return stockItems.filter((item) => {
      const matchCat =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.supplier.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [stockItems, search, selectedCategory]);

  const totalValue = stockItems.reduce(
    (acc, item) => acc + item.quantity * item.costPerUnit,
    0
  );
  const criticalCount = stockItems.filter(
    (i) => i.status === "critical" || i.status === "low"
  ).length;

  const currentRecipe = DISH_RECIPES.find((r) => r.dishId === selectedRecipeDish) || DISH_RECIPES[0];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ─── 1. Mini KPIs Stock ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs">
          <span className="text-xs font-semibold text-[#736D65]">Valeur Totale en Réserve</span>
          <div className="text-xl font-extrabold text-[#1A1A1A] mt-1">
            {totalValue.toFixed(2)} <span className="text-xs font-semibold text-[#8C857B]">DT</span>
          </div>
          <span className="text-[11px] text-[#15803d] font-bold">Actif circulant valorisé</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs">
          <span className="text-xs font-semibold text-[#736D65]">Articles sous Seuil Min</span>
          <div className="text-xl font-extrabold text-[#B91C1C] mt-1">
            {criticalCount} <span className="text-xs font-medium text-[#736D65]">ingrédients</span>
          </div>
          <span className="text-[11px] text-[#B91C1C] font-semibold">Réassort conseillé avant 18h</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs">
          <span className="text-xs font-semibold text-[#736D65]">Gaspillage & Pertes (Mois)</span>
          <div className="text-xl font-extrabold text-[#1A1A1A] mt-1">
            184,50 <span className="text-xs font-semibold text-[#8C857B]">DT</span>
          </div>
          <span className="text-[11px] text-[#736D65]">0.7% du CA (Excellente maîtrise)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs">
          <span className="text-xs font-semibold text-[#736D65]">Taux de Rotation Moyen</span>
          <div className="text-xl font-extrabold text-[#1A1A1A] mt-1">
            4,8 <span className="text-xs font-semibold text-[#8C857B]">jours</span>
          </div>
          <span className="text-[11px] text-[#15803d] font-bold">Produits toujours frais</span>
        </div>
      </div>

      {/* ─── 2. Filtres & Actions ─── */}
      <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Recherche */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C857B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher ingrédient ou fournisseur..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs focus:outline-none focus:border-[#B55234]"
            />
          </div>

          {/* Catégories Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#B55234]"
          >
            <option value="all">Toutes les catégories</option>
            <option value="viandes">Viandes & Volailles</option>
            <option value="produits_laitiers">Produits Laitiers & Fromages</option>
            <option value="boulangerie">Boulangerie & Pains</option>
            <option value="legumes_fruits">Légumes & Fruits</option>
            <option value="epicerie_sauces">Épicerie & Sauces</option>
            <option value="boissons">Boissons</option>
            <option value="emballages">Emballages</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Entrée de Stock (Fournisseur)</span>
        </button>
      </div>

      {/* ─── 3. Tableau des Ingrédients & Stock Réel ─── */}
      <div className="rounded-2xl bg-white/90 border border-[#E8E2D7] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E8E2D7] bg-[#FAF7F2] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">
              État des Matières Premières & Ingrédients
            </h3>
            <p className="text-xs text-[#736D65]">
              {filteredItems.length} article(s) trouvé(s)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#736D65]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#15803d]" /> Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#b45309]" /> Seuil bas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#b91c1c]" /> Rupture
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D7] text-[#8C857B] font-bold uppercase text-[10px] tracking-wider bg-black/[0.01]">
                <th className="py-3 px-4">Ingrédient</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Stock Actuel</th>
                <th className="py-3 px-4">Seuil Alerte</th>
                <th className="py-3 px-4">Coût Unit. (DT)</th>
                <th className="py-3 px-4">Valeur Totale</th>
                <th className="py-3 px-4">Fournisseur</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions Rapides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D7]">
              {filteredItems.map((item) => {
                const totalItemCost = (item.quantity * item.costPerUnit).toFixed(2);
                const percentOfThreshold = Math.min(
                  Math.round((item.quantity / item.minThreshold) * 100),
                  150
                );

                return (
                  <tr key={item.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1A1A1A]">{item.name}</div>
                      <div className="text-[10px] text-[#736D65]">
                        Utilisé dans {item.usedInDishesCount} plat(s) du menu
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E5DEC9] text-[10px] font-semibold text-[#666059]">
                        {item.category.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-extrabold text-[#1A1A1A]">
                        {item.quantity} {item.unit}
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-[#E8E2D7] overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            item.status === "critical"
                              ? "bg-[#B91C1C]"
                              : item.status === "low"
                              ? "bg-[#B45309]"
                              : "bg-[#15803d]"
                          }`}
                          style={{ width: `${Math.min(percentOfThreshold, 100)}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#736D65]">
                      {item.minThreshold} {item.unit}
                    </td>

                    <td className="py-3 px-4 font-semibold text-[#1A1A1A]">
                      {item.costPerUnit.toFixed(2)} DT
                    </td>

                    <td className="py-3 px-4 font-bold text-[#1A1A1A]">
                      {totalItemCost} DT
                    </td>

                    <td className="py-3 px-4 text-[#736D65]">{item.supplier}</td>

                    <td className="py-3 px-4">
                      {item.status === "critical" ? (
                        <span className="px-2 py-1 rounded-full bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-extrabold text-[10px]">
                          Rupture imminente
                        </span>
                      ) : item.status === "low" ? (
                        <span className="px-2 py-1 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-bold text-[10px]">
                          Faible
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-[#F0FDF4] text-[#15803d] border border-[#BBF7D0] font-bold text-[10px]">
                          Normal
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRestockItem(item.id, 5)}
                          title="Ajouter réapprovisionnement rapide (+5)"
                          className="px-2 py-1 rounded-lg bg-[#FAF0EA] hover:bg-[#F5E5DC] text-[#B55234] font-bold text-[11px] border border-[#F0D5C9] transition-colors"
                        >
                          + Réassort
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const qty = prompt(`Quantité de perte pour ${item.name} (${item.unit}) :`, "1");
                            if (qty && Number(qty) > 0) {
                              const reason = prompt("Motif de la perte (ex: périmé, tombé, brûlé) :", "Périmé") || "Perte";
                              onDeclareLoss(item.id, Number(qty), reason);
                            }
                          }}
                          title="Déclarer une perte / casse"
                          className="p-1 rounded-lg text-[#8C857B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. Fiches Techniques & Déstockage Automatique (BOM) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/90 border border-[#E8E2D7] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A]">
                  Fiches Techniques & Déduction Automatique du Stock
                </h3>
                <p className="text-xs text-[#736D65]">
                  Chaque plat commandé déduit instantanément ses matières premières
                </p>
              </div>
            </div>

            {/* Selector of dish */}
            <select
              value={selectedRecipeDish}
              onChange={(e) => setSelectedRecipeDish(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-bold text-[#B55234] focus:outline-none"
            >
              {DISH_RECIPES.map((d) => (
                <option key={d.dishId} value={d.dishId}>
                  {d.dishName}
                </option>
              ))}
            </select>
          </div>

          {/* Current dish recipe breakdown */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#FAF7F2] p-3 rounded-xl border border-[#E5DEC9]">
              <div>
                <span className="text-xs text-[#736D65]">Prix de Vente Menu</span>
                <div className="text-base font-extrabold text-[#1A1A1A]">
                  {currentRecipe.sellingPrice.toFixed(2)} DT
                </div>
              </div>
              <div>
                <span className="text-xs text-[#736D65]">Coût Ingrédients (Food Cost)</span>
                <div className="text-base font-extrabold text-[#B55234]">
                  {currentRecipe.foodCost.toFixed(2)} DT
                </div>
              </div>
              <div>
                <span className="text-xs text-[#736D65]">Marge Brute par Plat</span>
                <div className="text-base font-extrabold text-[#15803d]">
                  +{currentRecipe.marginDT.toFixed(2)} DT ({currentRecipe.marginPercent}%)
                </div>
              </div>
            </div>

            <div className="text-xs font-bold text-[#1A1A1A] mt-2">
              Composition déduite à chaque vente :
            </div>
            <div className="divide-y divide-[#E8E2D7] border border-[#E8E2D7] rounded-xl overflow-hidden">
              {currentRecipe.ingredients.map((ing) => (
                <div
                  key={ing.ingredientId}
                  className="px-3.5 py-2.5 bg-white flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-[#1A1A1A]">
                    {ing.ingredientName}
                  </span>
                  <div className="flex items-center gap-4 text-[#736D65]">
                    <span>
                      {ing.quantity} {ing.unit}
                    </span>
                    <span className="font-bold text-[#1A1A1A] w-16 text-right">
                      {ing.cost.toFixed(2)} DT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mouvements récents */}
        <div className="p-5 rounded-2xl bg-white/90 border border-[#E8E2D7] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
              Historique des Mouvements
            </h3>
            <p className="text-xs text-[#736D65] mb-4">
              Entrées réceptions, sorties commandes & pertes
            </p>

            <div className="flex flex-col gap-2.5">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    {m.type === "in" ? (
                      <div className="w-6 h-6 rounded-lg bg-[#F0FDF4] text-[#15803d] flex items-center justify-center shrink-0">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      </div>
                    ) : m.type === "loss" ? (
                      <div className="w-6 h-6 rounded-lg bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-[#FAF0EA] text-[#B55234] flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-[#1A1A1A] truncate max-w-[140px]">
                        {m.itemName}
                      </div>
                      <div className="text-[10px] text-[#736D65]">
                        {m.reason || m.type}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-bold ${
                        m.type === "in"
                          ? "text-[#15803d]"
                          : m.type === "loss"
                          ? "text-[#B91C1C]"
                          : "text-[#1A1A1A]"
                      }`}
                    >
                      {m.type === "in" ? "+" : "-"}
                      {m.quantity} {m.unit}
                    </div>
                    <div className="text-[10px] text-[#8C857B]">{m.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E2D7] flex items-center gap-1.5 text-[11px] text-[#736D65]">
            <Info className="w-3.5 h-3.5 text-[#B55234] shrink-0" />
            <span>Mouvements synchronisés avec le POS et les commandes en direct.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
