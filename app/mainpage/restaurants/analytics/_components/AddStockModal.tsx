"use client";

import React, { useState } from "react";
import { X, Plus, PackageCheck } from "lucide-react";
import { StockCategory, StockItem } from "../_lib/types";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<StockItem, "id" | "status" | "usedInDishesCount">) => void;
}

export function AddStockModal({ isOpen, onClose, onAdd }: AddStockModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StockCategory>("viandes");
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState<"kg" | "g" | "L" | "ml" | "pcs">("kg");
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [costPerUnit, setCostPerUnit] = useState<number>(15.0);
  const [supplier, setSupplier] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      category,
      quantity: Number(quantity),
      unit,
      minThreshold: Number(minThreshold),
      costPerUnit: Number(costPerUnit),
      supplier: supplier.trim() || "Fournisseur Général",
      lastRestocked: new Date().toISOString().split("T")[0],
    });

    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E5DEC9] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D7] bg-[#FAF7F2]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">
                Nouvelle Entrée en Stock / Ingrédient
              </h2>
              <p className="text-xs text-[#736D65]">
                Ajouter une matière première ou un réassortiment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C857B] hover:text-[#1A1A1A] hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">
              Nom de l&apos;ingrédient / Produit *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fromage Gouda Râpé, Escalope Poulet..."
              className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-sm focus:border-[#B55234] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StockCategory)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
              >
                <option value="viandes">Viandes & Volailles</option>
                <option value="produits_laitiers">Produits Laitiers & Fromages</option>
                <option value="boulangerie">Boulangerie & Pains</option>
                <option value="legumes_fruits">Légumes & Fruits</option>
                <option value="epicerie_sauces">Épicerie & Sauces</option>
                <option value="boissons">Boissons</option>
                <option value="emballages">Emballages & Kraft</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Unité de mesure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
              >
                <option value="kg">Kilogramme (kg)</option>
                <option value="g">Gramme (g)</option>
                <option value="L">Litre (L)</option>
                <option value="pcs">Pièce / Unité (pcs)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Quantité reçue
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Seuil Alerte Min
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Prix unitaire (DT)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                required
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">
              Fournisseur habituel
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ex: Boucherie Centrale, Grossiste Tunis..."
              className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#E8E2D7] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D8D2C5] text-[#736D65] hover:bg-black/5 font-bold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white font-bold transition-colors"
            >
              Enregistrer l&apos;entrée
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
