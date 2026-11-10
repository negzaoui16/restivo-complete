"use client";

import React, { useState } from "react";
import {
  Coins,
  TrendingUp,
  Receipt,
  Plus,
  AlertCircle,
  CheckCircle2,
  Banknote,
  CreditCard,
  Building2,
  Calendar,
  Lock,
} from "lucide-react";
import { DailyCashClosure, ExpenseRecord } from "../_lib/types";

interface AccountingRevenueTabProps {
  expenses: ExpenseRecord[];
  cashClosures: DailyCashClosure[];
  onOpenAddExpense: () => void;
  onPerformCashClose: () => void;
}

export function AccountingRevenueTab({
  expenses,
  cashClosures,
  onOpenAddExpense,
  onPerformCashClose,
}: AccountingRevenueTabProps) {
  // Financial computations
  const totalRevenue = 24850.0;
  const foodCost = 7753.2; // 31.2%
  const grossMargin = totalRevenue - foodCost; // 17096.80

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = grossMargin - totalExpenses;
  const netMarginPercent = ((netProfit / totalRevenue) * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ─── 1. Financial Overview Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs">
          <span className="text-xs font-semibold text-[#736D65]">
            Chiffre d&apos;Affaires Total (Mois)
          </span>
          <div className="text-2xl font-extrabold text-[#1A1A1A] mt-1">
            {totalRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-[#8C857B]">DT</span>
          </div>
          <span className="text-[11px] text-[#15803d] font-bold">+14.8% vs mois précédent</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs">
          <span className="text-xs font-semibold text-[#736D65]">
            Coût Matières (Food Cost)
          </span>
          <div className="text-2xl font-extrabold text-[#B55234] mt-1">
            {foodCost.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-[#8C857B]">DT</span>
          </div>
          <span className="text-[11px] text-[#736D65]">31.2% du Chiffre d&apos;Affaires</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E2D7] shadow-xs">
          <span className="text-xs font-semibold text-[#736D65]">
            Total Dépenses & Charges
          </span>
          <div className="text-2xl font-extrabold text-[#736D65] mt-1">
            {totalExpenses.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-[#8C857B]">DT</span>
          </div>
          <span className="text-[11px] text-[#736D65]">Loyer, Salaires, STEG, etc.</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] shadow-xs">
          <span className="text-xs font-bold text-[#15803d]">
            Bénéfice Net Réalisé (P&L)
          </span>
          <div className="text-2xl font-extrabold text-[#15803d] mt-1">
            +{netProfit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-[#15803d]">DT</span>
          </div>
          <span className="text-[11px] text-[#15803d] font-extrabold">
            Marge Nette : {netMarginPercent}%
          </span>
        </div>
      </div>

      {/* ─── 2. Compte de Résultat Simplifié (P&L) ─── */}
      <div className="p-5 rounded-2xl bg-white/90 border border-[#E8E2D7] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">
              Compte de Résultat d&apos;Exploitation (P&L)
            </h3>
            <p className="text-xs text-[#736D65]">
              Structure analytique des revenus et des coûts du mois en cours
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[#FAF0EA] text-[#B55234] text-xs font-bold">
            Période : Octobre 2026
          </span>
        </div>

        <div className="mt-4 flex flex-col divide-y divide-[#E8E2D7] text-xs">
          {/* Ligne 1: Chiffre d'affaires */}
          <div className="py-2.5 flex items-center justify-between font-bold text-[#1A1A1A]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#15803d]" />
              (+) Chiffre d&apos;Affaires Brut Réalisé
            </span>
            <span className="text-sm">{totalRevenue.toFixed(2)} DT</span>
          </div>

          {/* Ligne 2: Coût matières */}
          <div className="py-2.5 flex items-center justify-between text-[#B55234] font-semibold pl-4">
            <span>(-) Coût d&apos;Achat des Denrées & Ingrédients (Food Cost 31.2%)</span>
            <span>-{foodCost.toFixed(2)} DT</span>
          </div>

          {/* Ligne 3: Marge brute */}
          <div className="py-2.5 flex items-center justify-between bg-[#FAF7F2] px-3 font-extrabold text-[#1A1A1A] rounded-lg">
            <span>(=) Marge Commerciale Brute</span>
            <span className="text-sm text-[#15803d]">+{grossMargin.toFixed(2)} DT (68.8%)</span>
          </div>

          {/* Ligne 4: Charges d'exploitation */}
          <div className="py-2.5 flex flex-col gap-1 pl-4 text-[#736D65]">
            <div className="flex justify-between font-semibold">
              <span>(-) Salaires & Rémunérations Équipe</span>
              <span>-2 450,00 DT</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>(-) Loyer du Local Commercial</span>
              <span>-1 800,00 DT</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>(-) Électricité, Eau & Gaz (STEG / SONEDE)</span>
              <span>-620,00 DT</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>(-) Fournisseurs Réceptions & Autres charges</span>
              <span>-1 040,00 DT</span>
            </div>
          </div>

          {/* Ligne finale: Bénéfice net */}
          <div className="py-3 flex items-center justify-between bg-[#F0FDF4] px-4 font-extrabold text-[#15803d] rounded-xl text-sm border border-[#BBF7D0] mt-2">
            <span>(=) RÉSULTAT NET D&apos;EXPLOITATION (BÉNÉFICE)</span>
            <span className="text-base">+{netProfit.toFixed(2)} DT</span>
          </div>
        </div>
      </div>

      {/* ─── 3. Clôture de Caisse (Z de Caisse) & Dépenses ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clôture de caisse */}
        <div className="p-5 rounded-2xl bg-white/90 border border-[#E8E2D7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A]">
                  Clôtures Journalières (Z de Caisse)
                </h3>
                <p className="text-xs text-[#736D65]">
                  Contrôle des encaissements espèces et écarts de caisse
                </p>
              </div>
              <button
                type="button"
                onClick={onPerformCashClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF0EA] hover:bg-[#F5E5DC] text-[#B55234] text-xs font-bold transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Effectuer Z Caisse</span>
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {cashClosures.map((closure) => (
                <div
                  key={closure.id}
                  className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#1A1A1A]">{closure.date}</div>
                    <div className="text-[10px] text-[#736D65]">
                      Espèces: {closure.cashSales.toFixed(2)} DT · Carte: {closure.cardSales.toFixed(2)} DT · En ligne: {closure.onlineSales.toFixed(2)} DT
                    </div>
                    <div className="text-[10px] text-[#8C857B] mt-0.5">
                      Clôturé par: {closure.closedBy}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-[#1A1A1A]">
                      {closure.totalSales.toFixed(2)} DT
                    </div>
                    {closure.cashDiscrepancy === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#15803d] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Conforme (0 DT)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#B91C1C] font-bold">
                        <AlertCircle className="w-3 h-3" /> Écart {closure.cashDiscrepancy > 0 ? "+" : ""}{closure.cashDiscrepancy.toFixed(2)} DT
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Journal des Dépenses & Charges */}
        <div className="p-5 rounded-2xl bg-white/90 border border-[#E8E2D7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A]">
                  Journal des Dépenses & Charges
                </h3>
                <p className="text-xs text-[#736D65]">
                  Sorties d&apos;argent, loyers et factures enregistrées
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddExpense}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Dépense</span>
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 max-h-72 overflow-y-auto">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E5DEC9] flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4 text-[#B55234]" />
                    </div>
                    <div>
                      <div className="font-bold text-[#1A1A1A]">{exp.title}</div>
                      <div className="text-[10px] text-[#736D65]">
                        {exp.category} · Règlement: {exp.paymentMethod} · {exp.date}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[#B91C1C]">
                      -{exp.amount.toFixed(2)} DT
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md bg-[#F0FDF4] text-[#15803d] text-[9px] font-bold">
                      Payé
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
