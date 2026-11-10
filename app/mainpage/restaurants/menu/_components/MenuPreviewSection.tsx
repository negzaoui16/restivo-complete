"use client";

/**
 * ============================================================================
 * COMPOSANT : MenuPreviewSection (Espace Client - Affichage du Menu)
 * ============================================================================
 * Rôle :
 * 1. Affiche les sections du menu organisées par catégories (Pizza, Burgers...).
 * 2. Rend chaque plat sous forme de carte (Grid) ou ligne (List).
 * 3. Affiche les badges diététiques extraits automatiquement (Halal, Vegan...).
 * 4. Détecte si le plat possède un modèle 3D (item.model3dUrl) et affiche
 *    le bouton interactif "📱 Voir en 3D & Réalité Augmentée".
 * ============================================================================
 */

import React from "react";
import { Box, Sparkles, Star, Ruler } from "lucide-react";
import type { PublicMenuCategory, PublicMenuItem } from "@/lib/menu/types";
import { formatMenuPrice } from "../_lib/preview";
import { parseDescriptionTags, getTagById } from "@/lib/menu/tags";

function MenuPreviewCardItem({
  item,
  categoryName,
  currency,
  accentColor,
  onPreview3D,
}: {
  item: PublicMenuItem;
  categoryName?: string;
  currency: string;
  accentColor: string;
  onPreview3D?: (item: PublicMenuItem) => void;
}) {
  const unavailable = !item.isAvailable;
  const { text: cleanDescription, tags, sizeCm } = parseDescriptionTags(
    item.description,
    item.name,
    categoryName
  );

  return (
    <article
      className={`flex flex-col bg-white rounded-2xl border border-[#EDE7DC] overflow-hidden shadow-2xs hover:shadow-md transition-all ${
        unavailable ? "opacity-60" : ""
      }`}
    >
      {/* Image with badges */}
      <div className="relative h-44 w-full bg-[#F3EEE6] overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-[#D5CDBC]">
            {item.name.slice(0, 1)}
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs font-bold text-xs text-[#1A1A1A] shadow-xs">
          {formatMenuPrice(item.price, currency)}
        </div>

        {item.isFeatured && (
          <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-xs">
            <Star className="w-3 h-3 fill-white" />
            <span>Chef&apos;s pick</span>
          </div>
        )}

        {item.promotionLabel && (
          <div
            className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-md text-white font-bold text-[10px] shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            {item.promotionLabel}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#1A1A1A] tracking-tight">{item.name}</h3>

          {cleanDescription && (
            <p className="mt-1 text-xs text-[#736D65] line-clamp-2 leading-relaxed">
              {cleanDescription}
            </p>
          )}

          {/* AFFICHAGE DE LA TAILLE OFFICIELLE 1:1 ET DES BADGES DIÉTÉTIQUES */}
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF3EB] text-[#B55234] border border-[#E8D5C4]">
              <Ruler className="w-2.5 h-2.5" />
              <span>{sizeCm} cm</span>
            </span>
            {tags.map((tagId) => {
              const tag = getTagById(tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${tag.colorClass}`}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* DÉCLENCHEUR DU MODAL 3D & RÉALITÉ AUGMENTÉE (Si item.model3dUrl existe) */}
        <div>
          {item.model3dUrl && onPreview3D ? (
            <button
              type="button"
              onClick={() => onPreview3D(item)}
              className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs hover:scale-102 active:scale-98"
            >
              <Box className="w-4 h-4 text-purple-600" />
              <span>📱 Voir en 3D & AR (1:1 · {sizeCm}cm)</span>
            </button>
          ) : (
            unavailable && (
              <p className="text-[11px] font-semibold text-[#9E4328] text-center">
                Actuellement épuisé
              </p>
            )
          )}
        </div>
      </div>
    </article>
  );
}

function MenuPreviewListItem({
  item,
  categoryName,
  currency,
  accentColor,
  onPreview3D,
}: {
  item: PublicMenuItem;
  categoryName?: string;
  currency: string;
  accentColor: string;
  onPreview3D?: (item: PublicMenuItem) => void;
}) {
  const unavailable = !item.isAvailable;
  const { text: cleanDescription, tags, sizeCm } = parseDescriptionTags(
    item.description,
    item.name,
    categoryName
  );

  return (
    <article
      className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3.5 border-b border-[#EDE7DC] last:border-0 ${
        unavailable ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0 flex gap-3">
        {item.imageUrl && (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#E8E2D7] bg-[#F3EEE6]">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-[#1A1A1A] tracking-tight">
              {item.name}
            </h3>
            {item.isFeatured && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-500" /> Chef&apos;s pick
              </span>
            )}
            {item.promotionLabel && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: accentColor }}
              >
                {item.promotionLabel}
              </span>
            )}
          </div>
          {cleanDescription && (
            <p className="mt-0.5 text-[13px] leading-snug text-[#736D65]">{cleanDescription}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FAF3EB] text-[#B55234] border border-[#E8D5C4]">
              <Ruler className="w-2.5 h-2.5" />
              <span>{sizeCm} cm</span>
            </span>
            {tags.map((tagId) => {
              const tag = getTagById(tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${tag.colorClass}`}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </span>
              );
            })}
          </div>
          {item.model3dUrl && onPreview3D && (
            <button
              type="button"
              onClick={() => onPreview3D(item)}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition-colors shadow-2xs"
            >
              <Box className="w-3.5 h-3.5" />
              <span>📱 Voir en 3D / AR ({sizeCm}cm)</span>
            </button>
          )}
          {unavailable && (
            <p className="mt-1 text-[11px] font-semibold text-[#9E4328]">Actuellement indisponible</p>
          )}
        </div>
      </div>
      <p className="text-sm font-bold text-[#1A1A1A] whitespace-nowrap pt-0.5">
        {formatMenuPrice(item.price, currency)}
      </p>
    </article>
  );
}

export function MenuPreviewSection({
  category,
  currency,
  accentColor = "#B55234",
  viewMode = "grid",
  onPreview3D,
}: {
  category: PublicMenuCategory;
  currency: string;
  accentColor?: string;
  viewMode?: "grid" | "list";
  onPreview3D?: (item: PublicMenuItem) => void;
}) {
  return (
    <section id={`preview-${category.id}`} className="scroll-mt-24 mb-8">
      <div className="flex items-end justify-between gap-3 mb-3">
        <h2 className="text-lg font-extrabold text-[#1A1A1A] tracking-tight flex items-center gap-2">
          <span>{category.name}</span>
          <span className="text-xs font-normal text-[#A39C91]">({category.items.length})</span>
        </h2>
        <div className="flex-1 h-px bg-[#E8E2D7] mb-1.5" />
      </div>
      {category.description && (
        <p className="text-xs text-[#7A746B] mb-3">{category.description}</p>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {category.items.map((item) => (
            <MenuPreviewCardItem
              key={item.id}
              item={item}
              categoryName={category.name}
              currency={currency}
              accentColor={accentColor}
              onPreview3D={onPreview3D}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[#EDE7DC]">
          {category.items.map((item) => (
            <MenuPreviewListItem
              key={item.id}
              item={item}
              categoryName={category.name}
              currency={currency}
              accentColor={accentColor}
              onPreview3D={onPreview3D}
            />
          ))}
        </div>
      )}
    </section>
  );
}
