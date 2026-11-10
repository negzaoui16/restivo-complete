"use client";

import React, { useState } from "react";
import { X, Receipt } from "lucide-react";
import { ExpenseRecord } from "../_lib/types";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: Omit<ExpenseRecord, "id">) => void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  onAdd,
}: AddExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseRecord["category"]>("fournisseurs");
  const [amount, setAmount] = useState<number>(150);
  const [paymentMethod, setPaymentMethod] = useState<ExpenseRecord["paymentMethod"]>("especes");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    onAdd({
      title: title.trim(),
      category,
      amount: Number(amount),
      paymentMethod,
      date: new Date().toISOString().split("T")[0],
      status: "paye",
      notes: notes.trim() || undefined,
    });

    setTitle("");
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5DEC9] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D7] bg-[#FAF7F2]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">
                Enregistrer une Dépense / Charge
              </h2>
              <p className="text-xs text-[#736D65]">
                Sortie de caisse ou virement pour le P&L
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
              Libellé de la dépense *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Acompte salaire serveur, Achat glaces, STEG..."
              className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-sm focus:border-[#B55234] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Catégorie de charge
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
              >
                <option value="fournisseurs">Fournisseurs & Matières</option>
                <option value="salaires">Salaires & Acomptes</option>
                <option value="loyer">Loyer Commercial</option>
                <option value="energie_eau">Énergie & Eau (STEG/SONEDE)</option>
                <option value="marketing">Marketing & Publicité</option>
                <option value="autre">Autre Charge</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Montant dépensé (DT) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">
              Mode de paiement utilisé
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs focus:border-[#B55234] focus:outline-none"
            >
              <option value="especes">Espèces (Tiré de la caisse)</option>
              <option value="virement">Virement Bancaire</option>
              <option value="carte">Carte Bancaire / TPE</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">
              Notes complémentaires (Optionnel)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Numéro de reçu ou bénéficiaire..."
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
              Enregistrer la dépense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
