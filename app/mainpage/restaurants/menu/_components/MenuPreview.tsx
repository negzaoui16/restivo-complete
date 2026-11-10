"use client";

import React, { useEffect, useState } from "react";
import { X, Smartphone, Monitor, LayoutGrid, List, ArrowLeft, WifiOff } from "lucide-react";
import { RestivoGlyph } from "@/app/mainpage/_components/RestivoGlyph";
import type { ManagedRestaurant } from "../../_context/RestaurantManagerContext";
import type { PublicMenu, PublicMenuItem } from "@/lib/menu/types";
import { parseMenuCustomization } from "@/lib/menu/theme";
import { previewCategories } from "../_lib/preview";
import { MenuPreviewIdentity } from "./MenuPreviewIdentity";
import { MenuPreviewSection } from "./MenuPreviewSection";
import { ARModal } from "./ARModal";
import { useNetworkStatus } from "@/lib/offline/offline-manager";
import { PullToRefresh } from "@/app/_components/PullToRefresh";

const PATTERN = "/VisualIdentity/macroPattern.png";

export function MenuPreview({
  restaurant,
  menu,
  currency,
  onClose,
  isClientView = false,
}: {
  restaurant: ManagedRestaurant;
  menu: PublicMenu;
  currency: string;
  onClose: () => void;
  isClientView?: boolean;
}) {
  const custom = parseMenuCustomization(menu.description);
  const categories = previewCategories(menu);
  const livePromotions = menu.promotions.filter((promotion) => promotion.isLive);

  const [preview3DItem, setPreview3DItem] = useState<PublicMenuItem | null>(null);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [activeViewMode, setActiveViewMode] = useState<"grid" | "list">(custom.viewMode);
  const { isOnline } = useNetworkStatus();

  const accentColor = custom.theme.primaryColor;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function scrollToCategory(id: string) {
    document.getElementById(`preview-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="fixed inset-0 z-[80] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-preview-title"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#FAF7F2",
          backgroundImage: `url('${PATTERN}')`,
          backgroundRepeat: "repeat",
          backgroundSize: "720px auto",
        }}
      />
      <div className="absolute inset-0 bg-[#FAF7F2]/35 pointer-events-none" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
        {isClientView ? (
          <>
            {/* Back Button for Customer & Offline Pill */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/95 hover:bg-white text-xs font-bold text-[#1A1A1A] border border-[#E8E2D7] shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-[#B55234]" />
                <span>Retour</span>
              </button>

              {!isOnline && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-md animate-in fade-in">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Hors-Ligne (3D & AR actives) 📴</span>
                </div>
              )}
            </div>

            {/* View Mode Toggle + Close Button */}
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="flex items-center bg-white/95 backdrop-blur-md rounded-full p-1 border border-[#E8E2D7] shadow-md">
                <button
                  type="button"
                  onClick={() => setActiveViewMode("grid")}
                  aria-label="Vue Grille & 3D"
                  aria-pressed={activeViewMode === "grid"}
                  className={`p-1.5 rounded-full transition-all ${
                    activeViewMode === "grid"
                      ? "bg-[#FAF7F2] text-[#1A1A1A] shadow-xs"
                      : "text-[#736D65] hover:text-[#1A1A1A]"
                  }`}
                  title="Vue Grille & 3D"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode("list")}
                  aria-label="Vue Liste"
                  aria-pressed={activeViewMode === "list"}
                  className={`p-1.5 rounded-full transition-all ${
                    activeViewMode === "list"
                      ? "bg-[#FAF7F2] text-[#1A1A1A] shadow-xs"
                      : "text-[#736D65] hover:text-[#1A1A1A]"
                  }`}
                  title="Vue Liste"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le menu"
                className="w-8 h-8 rounded-full bg-white/95 border border-[#E8E2D7] text-[#1A1A1A] flex items-center justify-center shadow-md hover:bg-white transition-all hover:scale-105 active:scale-95"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Device & Layout View Controls (Owner Preview Mode) */}
            <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#E8E2D7] p-1.5 rounded-full shadow-lg">
              {/* Mobile / Desktop Toggle */}
              <div className="flex items-center bg-[#FAF7F2] rounded-full p-0.5 border border-[#E8E2D7]">
                <button
                  type="button"
                  onClick={() => setDeviceMode("desktop")}
                  aria-label="Aperçu Grand Écran"
                  aria-pressed={deviceMode === "desktop"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    deviceMode === "desktop"
                      ? "bg-white text-[#1A1A1A] shadow-xs"
                      : "text-[#736D65] hover:text-[#1A1A1A]"
                  }`}
                  title="Aperçu Grand Écran"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grand Écran</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("mobile")}
                  aria-label="Aperçu Smartphone"
                  aria-pressed={deviceMode === "mobile"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    deviceMode === "mobile"
                      ? "bg-white text-[#1A1A1A] shadow-xs"
                      : "text-[#736D65] hover:text-[#1A1A1A]"
                  }`}
                  title="Aperçu Smartphone"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              <div className="h-4 w-px bg-[#E8E2D7]" />

              {/* Grid / List View Toggle */}
              <div className="flex items-center bg-[#FAF7F2] rounded-full p-0.5 border border-[#E8E2D7]">
                <button
                  type="button"
                  onClick={() => setActiveViewMode("grid")}
                  aria-label="Vue Grille & 3D"
                  aria-pressed={activeViewMode === "grid"}
                  className={`p-1.5 rounded-full transition-all ${
                    activeViewMode === "grid"
                      ? "bg-white text-[#1A1A1A] shadow-xs"
                      : "text-[#736D65] hover:text-[#1A1A1A]"
                  }`}
                  title="Vue Grille & 3D"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode("list")}
                  aria-label="Vue Liste"
                  aria-pressed={activeViewMode === "list"}
                  className={`p-1.5 rounded-full transition-all ${
                    activeViewMode === "list"
                      ? "bg-white text-[#1A1A1A] shadow-xs"
                      : "text-[#736D65] hover:text-[#1A1A1A]"
                  }`}
                  title="Vue Liste"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Close Button & Offline status */}
            <div className="pointer-events-auto flex items-center gap-2">
              {!isOnline && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Mode Hors-Ligne 📴</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer l'aperçu du menu"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 border border-[#E8E2D7] text-xs font-semibold text-[#1A1A1A] shadow-md hover:bg-white transition-all hover:scale-105 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Fermer</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Preview Viewport */}
      <div className="relative h-full overflow-y-auto overscroll-contain pt-16 pb-12">
        <PullToRefresh onRefresh={async () => { await new Promise((r) => setTimeout(r, 600)); }}>
          <div
            className={
              isClientView
                ? "mx-auto w-full max-w-4xl px-3 sm:px-6 my-2 sm:my-6 transition-all duration-300"
                : `mx-auto w-full transition-all duration-300 px-4 ${
                    deviceMode === "mobile"
                      ? "max-w-[430px] my-6"
                      : "max-w-[800px]"
                  }`
            }
          >
          <article
            className={
              isClientView
                ? "bg-[#FAF7F2] border border-[#E8E2D7] rounded-2xl sm:rounded-[28px] px-4 sm:px-8 lg:px-10 py-6 sm:py-10 shadow-[0_20px_60px_-20px_rgba(50,36,24,0.25)] transition-all"
                : `bg-[#FAF7F2] border shadow-[0_24px_80px_-32px_rgba(50,36,24,0.35)] transition-all ${
                    deviceMode === "mobile"
                      ? "rounded-[44px] border-[#333] ring-12 ring-[#1F1F1F] px-4 sm:px-6 py-8 shadow-2xl"
                      : "rounded-[28px] border-[#E8E2D7]/80 px-5 sm:px-10 py-10 sm:py-12"
                  }`
            }
          >
            <div id="menu-preview-title" className="sr-only">
              {restaurant.name} menu preview
            </div>

            <MenuPreviewIdentity
              restaurant={restaurant}
              menuName={menu.name}
              menuDescription={custom.description}
              isPublished={menu.isPublished}
              accentColor={accentColor}
              bannerUrl={custom.bannerUrl}
              isClientView={isClientView}
            />

            {livePromotions.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {livePromotions.map((promotion) => (
                  <span
                    key={promotion.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-white text-[11px] font-bold tracking-wide shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    {promotion.name}
                    {promotion.type === "PERCENTAGE"
                      ? ` · ${promotion.value}% off`
                      : ` · ${promotion.value} ${currency} off`}
                  </span>
                ))}
              </div>
            )}

            {categories.length > 1 && (
              <nav
                className="sticky top-0 z-[1] -mx-2 mt-8 mb-6 px-2 py-2 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#E8E2D7]/70"
                aria-label="Menu categories"
              >
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => scrollToCategory(category.id)}
                      className="shrink-0 px-3.5 py-1.5 rounded-full border border-[#E0D8CC] bg-white text-xs font-semibold text-[#4A443D] hover:scale-105 active:scale-95 transition-all shadow-2xs"
                      style={{
                        borderColor: "#E0D8CC",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = accentColor;
                        e.currentTarget.style.color = accentColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#E0D8CC";
                        e.currentTarget.style.color = "#4A443D";
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </nav>
            )}

            {categories.length === 0 ? (
              <p className="mt-10 text-center text-sm text-[#736D65]">
                Ce menu n&apos;a pas encore de plats. Ajoutez des catégories et des plats pour les voir ici.
              </p>
            ) : (
              <div className="mt-8 flex flex-col gap-8">
                {categories.map((category) => (
                  <MenuPreviewSection
                    key={category.id}
                    category={category}
                    currency={currency}
                    accentColor={accentColor}
                    viewMode={activeViewMode}
                    onPreview3D={setPreview3DItem}
                  />
                ))}
              </div>
            )}

            <footer className="mt-12 pt-6 border-t border-[#E8E2D7] text-center">
              <div className="flex items-center justify-center gap-2" style={{ color: accentColor }}>
                <RestivoGlyph className="w-4 h-4" color={accentColor} />
                <span className="text-[11px] font-bold uppercase tracking-[0.22em]">Restivo</span>
              </div>
              <p className="mt-2 text-[11px] text-[#8A847C]">Une expérience culinaire immersive</p>
            </footer>
          </article>
        </div>
        </PullToRefresh>
      </div>

      {preview3DItem && preview3DItem.model3dUrl && (
        <ARModal
          isOpen={true}
          onClose={() => setPreview3DItem(null)}
          itemName={preview3DItem.name}
          modelUrl={preview3DItem.model3dUrl}
          imageUrl={preview3DItem.imageUrl}
          description={preview3DItem.description}
          categoryName={categories.find((c) => c.id === preview3DItem.categoryId)?.name}
        />
      )}
    </div>
  );
}
