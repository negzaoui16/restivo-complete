"use client";

import React from "react";
import { Download, RefreshCw, Calendar, TrendingUp } from "lucide-react";
import { AnalyticsPeriod } from "../_lib/types";

interface AnalyticsHeaderProps {
  restaurantName: string;
  selectedPeriod: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onExport: () => void;
}

export function AnalyticsHeader({
  restaurantName,
  selectedPeriod,
  onPeriodChange,
  onExport,
}: AnalyticsHeaderProps) {
  const periods: { key: AnalyticsPeriod; label: string }[] = [
    { key: "today", label: "Aujourd'hui" },
    { key: "7d", label: "7 derniers jours" },
    { key: "month", label: "Ce mois (Octobre)" },
    { key: "year", label: "Année 2026" },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E8E2D7]">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B55234]">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Gestion Restaurant & Pilotage</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight mt-0.5">
          Analytics & Comptabilité
        </h1>
        <p className="text-xs sm:text-sm text-[#736D65] mt-0.5">
          Pilotage du chiffre d&apos;affaires, marges, inventaire et dépenses pour{" "}
          <span className="font-semibold text-[#1A1A1A]">{restaurantName}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Period Selector Tabs */}
        <div className="inline-flex p-1 bg-white/80 rounded-xl border border-[#E5DEC9] shadow-2xs">
          {periods.map((p) => {
            const active = selectedPeriod === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPeriodChange(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#B55234] text-white shadow-xs"
                    : "text-[#666059] hover:text-[#1A1A1A] hover:bg-black/5"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Export Button */}
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E5DEC9] text-[#1A1A1A] text-xs font-bold shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#B55234]" />
          <span>Export Bilan</span>
        </button>
      </div>
    </div>
  );
}
