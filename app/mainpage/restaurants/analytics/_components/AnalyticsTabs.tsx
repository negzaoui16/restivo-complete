"use client";

import React from "react";
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  Sparkles,
  AlertCircle,
  Cpu,
} from "lucide-react";
import { AnalyticsTabType } from "../_lib/types";

interface AnalyticsTabsProps {
  activeTab: AnalyticsTabType;
  onTabChange: (tab: AnalyticsTabType) => void;
  criticalStockCount: number;
}

export function AnalyticsTabs({
  activeTab,
  onTabChange,
  criticalStockCount,
}: AnalyticsTabsProps) {
  const tabs = [
    {
      id: "overview" as AnalyticsTabType,
      label: "Vue d'ensemble",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "stock" as AnalyticsTabType,
      label: "Gestion de Stock",
      icon: Boxes,
      badge:
        criticalStockCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
            <AlertCircle className="w-2.5 h-2.5" />
            {criticalStockCount} alertes
          </span>
        ) : null,
    },
    {
      id: "ml_ai" as AnalyticsTabType,
      label: "IA Prédictive & Achats (ML)",
      icon: Cpu,
      badge: (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF0EA] text-[#B55234] border border-[#F0D5C9]">
          <Sparkles className="w-2.5 h-2.5" />
          Régression
        </span>
      ),
    },
    {
      id: "accounting" as AnalyticsTabType,
      label: "Comptabilité & Revenus",
      icon: Receipt,
      badge: null,
    },
    {
      id: "engineering" as AnalyticsTabType,
      label: "Rentabilité du Menu (Matrix)",
      icon: Sparkles,
      badge: null,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-b border-[#E8E2D7] no-scrollbar">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              isActive
                ? "bg-[#FAF0EA] text-[#B55234] border border-[#E9D9D0] shadow-2xs"
                : "text-[#666059] hover:text-[#1A1A1A] hover:bg-white/60"
            }`}
          >
            <Icon
              className={`w-4 h-4 ${
                isActive ? "text-[#B55234]" : "text-[#8A847C]"
              }`}
            />
            <span>{t.label}</span>
            {t.badge}
          </button>
        );
      })}
    </div>
  );
}
