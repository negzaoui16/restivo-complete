"use client";

/**
 * ============================================================================
 * COMPOSANT : AddMenuItemPanel (Espace Restaurateur - Ajout & Modif Plat)
 * ============================================================================
 * Rôle :
 * Panneau latéral (Drawer) permettant au restaurateur :
 * 1. De renseigner les détails du plat (nom, prix, catégorie, description).
 * 2. De cocher les tags diététiques (Halal, Végétarien, Sans Gluten, etc.).
 * 3. D'uploader une photo 2D.
 * 4. De cliquer sur "Générer le modèle 3D" pour créer un plat 3D via l'IA Trellis.
 * 5. D'enregistrer le plat en base de données avec son URL 3D (model3dUrl).
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X, Sparkles, Box, Loader2, Upload, WifiOff, Ruler, Wand2, Lightbulb } from "lucide-react";
import type { PublicMenuCategory, PublicMenuItem } from "@/lib/menu/types";
import {
  AVAILABLE_MENU_TAGS,
  OFFICIAL_SIZE_PRESETS,
  formatDescriptionWithTags,
  inferOfficialSizeCm,
  parseDescriptionTags,
} from "@/lib/menu/tags";
import { FORM_INPUT_CLASS } from "../_lib/menu-ui";
import { LOCAL_3D_PRESETS, useNetworkStatus } from "@/lib/offline/offline-manager";
import {
  generateFullDishSuggestion,
  polishDescriptionWithAI,
  learnDishPattern,
} from "@/lib/ai/culinary-engine";

function FormField({
  label,
  required,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-[#A39C91] uppercase tracking-wider block">
          {label}
          {required && <span className="text-[#B55234] ml-0.5">*</span>}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
        checked ? "bg-[#B55234]" : "bg-[#D4CFC6]"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function AddMenuItemPanel({
  editingItem,
  categories,
  currency,
  restaurantId,
  saving,
  onSave,
  onClose,
}: {
  editingItem: PublicMenuItem | null;
  categories: PublicMenuCategory[];
  currency: string;
  restaurantId?: string;
  saving?: boolean;
  serverError?: { field: string | null; message: string } | null;
  onSave: (input: {
    categoryId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    model3dUrl?: string;
    price: any;
    isAvailable: boolean;
    isFeatured: boolean;
  }) => void;
  onClose: () => void;
}) {
  // --- ÉTATS DU FORMULAIRE DU PLAT ---
  const initialCategoryName = categories.find((c) => c.id === (editingItem?.categoryId ?? categories[0]?.id))?.name;
  const initialParsed = parseDescriptionTags(
    editingItem?.description,
    editingItem?.name,
    initialCategoryName
  );
  const [name, setName] = useState(editingItem?.name ?? "");
  const [categoryId, setCategoryId] = useState(editingItem?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(initialParsed.text);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialParsed.tags); // Tags alimentaires (Halal, Vegan...)
  const [sizeCm, setSizeCm] = useState<number>(initialParsed.sizeCm); // Taille officielle 1:1 en cm (ex: 12cm Burger, 30cm Pizza)
  const [hasCustomSize, setHasCustomSize] = useState<boolean>(Boolean(editingItem?.description?.includes('"sizeCm"')));
  const [price, setPrice] = useState(editingItem?.price?.toString() ?? "");
  const [isAvailable, setIsAvailable] = useState(editingItem?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(editingItem?.isFeatured ?? false);
  const [imageUrl, setImageUrl] = useState(editingItem?.imageUrl ?? "");
  const [model3dUrl, setModel3dUrl] = useState(editingItem?.model3dUrl ?? ""); // Chemin ou URL du modèle 3D .GLB

  // Auto-déduction de la taille officielle 1:1 selon le nom du plat et la catégorie (sauf si modifiée manuellement)
  useEffect(() => {
    if (hasCustomSize) return;
    const catName = categories.find((c) => c.id === categoryId)?.name;
    setSizeCm(inferOfficialSizeCm(name, catName));
  }, [name, categoryId, categories, hasCustomSize]);

  // --- ÉTATS D'UPLOAD D'IMAGE & GÉNÉRATION 3D IA ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generating3D, setGenerating3D] = useState(false); // Indicateur de chargement pour Trellis AI
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();

  // --- ÉTATS ASSISTANT CHEF IA RESTIVO ---
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  function handleAISuggest(targetName?: string) {
    const query = (targetName || name).trim();
    if (!query) {
      setAiFeedback("💡 Tapez d'abord le nom du plat ou cliquez sur une idée ci-dessous !");
      setTimeout(() => setAiFeedback(null), 4000);
      return;
    }

    setIsGeneratingAI(true);
    setAiFeedback(null);

    // Simulation fluide d'inférence sémantique locale
    setTimeout(() => {
      const suggestion = generateFullDishSuggestion(query, categories, restaurantId);

      setName(suggestion.name);
      if (suggestion.matchedCategoryId) {
        setCategoryId(suggestion.matchedCategoryId);
      }
      setDescription(suggestion.description);
      setSelectedTags(suggestion.tags);
      setPrice(suggestion.priceTnd);
      setSizeCm(suggestion.sizeCm);
      setHasCustomSize(true);
      setModel3dUrl(suggestion.model3dUrl);

      setIsGeneratingAI(false);
      setAiFeedback(
        suggestion.isLearned
          ? `🧠 Modèle adapté : Recette mémorisée (${suggestion.name} à ${suggestion.priceTnd} TND) !`
          : `✨ ${suggestion.categoryGuess} détecté : description, prix (${suggestion.priceTnd} TND), tags et 3D calibrés !`
      );

      setTimeout(() => setAiFeedback(null), 5000);
    }, 250);
  }

  function handleAIPolishDescription() {
    const polished = polishDescriptionWithAI(description, name);
    setDescription(polished);
    setAiFeedback("✨ Description sublimée avec un style gastronomique !");
    setTimeout(() => setAiFeedback(null), 4000);
  }

  async function handleFileChange(file: File) {
    setSelectedFile(file);
    setImageUrl(URL.createObjectURL(file));
    setUploadingImage(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.ok && data.url) {
        setImageUrl(data.url);
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
    } finally {
      setUploadingImage(false);
    }
  }

  /**
   * Enregistre le plat final avec ses métadonnées, photo et modèle 3D
   */
  async function handleSave() {
    let finalImageUrl = imageUrl.trim();

    if (selectedFile && (!finalImageUrl || finalImageUrl.startsWith("blob:"))) {
      try {
        const fd = new FormData();
        fd.append("file", selectedFile);
        const res = await fetch("/api/upload-image", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok && data.url) {
          finalImageUrl = data.url;
        }
      } catch (err) {
        console.error("Failed to upload image before save:", err);
      }
    }

    // Formate la description en y intégrant les tags sélectionnés (Halal, Vegan...) et la taille officielle 1:1 en cm
    const finalDescription = formatDescriptionWithTags(description, selectedTags, sizeCm);

    // Mémorisation pour l'Apprentissage Continu de l'IA (Adaptive Learning)
    if (restaurantId && name.trim()) {
      const catObj = categories.find((c) => c.id === categoryId);
      learnDishPattern(restaurantId, {
        name: name.trim(),
        categoryId,
        categoryName: catObj?.name,
        description: description.trim(),
        price: parseFloat(price) || 0,
        tags: selectedTags,
        sizeCm,
        model3dUrl: model3dUrl.trim() || undefined,
      });
    }

    onSave({
      categoryId,
      name: name.trim(),
      description: finalDescription || undefined,
      imageUrl: finalImageUrl || undefined,
      model3dUrl: model3dUrl.trim() || undefined,
      price: parseFloat(price) || 0,
      isAvailable,
      isFeatured,
    });
  }

  /**
   * ==========================================================================
   * FONCTION CLÉ : DÉCLENCHEMENT DE LA GÉNÉRATION 3D PAR IA (Trellis)
   * ==========================================================================
   * 1. Valide la présence d'une image source (soit fichier local, soit URL).
   * 2. Construit un FormData multipart contenant :
   *    - L'image binaire ou l'URL
   *    - Le nom du plat et sa catégorie (cruciaux pour le fallback contextuel)
   * 3. Appelle l'API interne POST /api/generate-3d.
   * 4. Récupère l'URL publique du modèle (.glb) et met à jour l'état local model3dUrl.
   * ==========================================================================
   */
  async function handleGenerate3D() {
    if (!isOnline) {
      setGenerationError("Mode Hors-Ligne actif : L'IA Cloud nécessite Internet. Choisissez un modèle 3D de la bibliothèque locale ci-dessous.");
      return;
    }

    if (!imageUrl.trim() && !selectedFile) {
      setGenerationError("Veuillez d'abord fournir une image (URL ou fichier).");
      return;
    }

    setGenerating3D(true);
    setGenerationError(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("image", selectedFile);
      } else if (imageUrl.trim()) {
        formData.append("imageUrl", imageUrl.trim());
      }
      if (name.trim()) formData.append("name", name.trim());
      const cat = categories.find((c) => c.id === categoryId);
      if (cat?.name) formData.append("category", cat.name);

      // Appel à notre pipeline backend Next.js
      const res = await fetch("/api/generate-3d", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Échec de génération 3D.");
      }

      // Stocke le lien du modèle généré (ex: /models/item-3d-...glb)
      setModel3dUrl(data.model3dUrl);
      if (data.savedImageUrl) {
        setImageUrl(data.savedImageUrl);
      }
    } catch (err: any) {
      setGenerationError(err?.message || "Erreur lors de la génération 3D.");
    } finally {
      setGenerating3D(false);
    }
  }

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-modal-title"
      className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-12 pointer-events-none">
        <div className="pointer-events-auto w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-[#E8E2D7] animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D7] bg-[#FAF7F2]">
            <div>
              <h3 id="add-item-modal-title" className="text-base font-bold text-[#1A1A1A]">
                {editingItem ? "Modifier l'article" : "Ajouter un article"}
              </h3>
              <p className="text-xs text-[#A39C91] mt-0.5">
                {editingItem ? "Mettez à jour les informations, tags et 3D" : "Remplissez les détails du plat pour le menu"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              title="Fermer"
              className="w-8 h-8 rounded-lg hover:bg-[#E8E2D7] flex items-center justify-center text-[#736D65] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-4">
              {/* --- Assistant Chef IA Restivo --- */}
              <div className="rounded-2xl border border-[#B55234]/30 bg-gradient-to-br from-[#FFF9F5] via-[#FFFDF9] to-[#FAF4EC] p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#B55234] text-white flex items-center justify-center shadow-xs shadow-[#B55234]/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        Assistant Chef IA Restivo
                      </h4>
                      <p className="text-[10px] text-[#8C8479]">
                        Suggestions automatiques : description, prix, tags et 3D
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-[#15803d] bg-[#DCFCE7] border border-[#BBF7D0] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    100% Hors-Ligne
                  </span>
                </div>

                {/* Idées rapides / Quick prompt pills */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-[#736D65]">
                    💡 Idées rapides en 1 clic (ou tapez votre plat ci-dessous) :
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "🍕 Pizza Fruits de mer",
                      "🍔 Smash Burger Truffe",
                      "🌯 Mqloub Chawarma",
                      "🥤 Canette Coca Fraîche",
                      "🍹 Mojito Fraise",
                      "🍲 Kafteji Tunisien Spécial",
                      "🍰 Tiramisu Maison",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAISuggest(preset.replace(/^[^\s]+\s/, ""))}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-[#E8E2D7] hover:border-[#B55234] hover:text-[#B55234] text-[#4A4643] transition-colors cursor-pointer shadow-2xs font-medium"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bouton d'action principal */}
                <div className="pt-0.5 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={() => handleAISuggest()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B55234] hover:bg-[#9E4328] active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyse culinaire IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Remplir automatiquement avec l&apos;IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Feedback toast / notification */}
                {aiFeedback && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803d] text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#15803d]" />
                    <span className="truncate">{aiFeedback}</span>
                  </div>
                )}
              </div>

              <FormField
                label="Nom du plat"
                required
                action={
                  <button
                    type="button"
                    onClick={() => handleAISuggest()}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B55234] hover:text-[#9E4328] bg-[#FAF0EA] hover:bg-[#F5E4DA] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    title="Générer les détails de ce plat"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-remplir</span>
                  </button>
                }
              >
                <input
                  type="text"
                  aria-label="Nom du plat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Pizza Margherita ou Coca..."
                  className={FORM_INPUT_CLASS}
                />
              </FormField>

        <FormField label="Catégorie" required>
          <div className="relative">
            <select
              aria-label="Catégorie"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`${FORM_INPUT_CLASS} appearance-none pr-8 cursor-pointer`}
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39C91] pointer-events-none" />
          </div>
        </FormField>

        <FormField
          label="Description"
          action={
            <button
              type="button"
              onClick={handleAIPolishDescription}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B55234] hover:text-[#9E4328] bg-[#FAF0EA] hover:bg-[#F5E4DA] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              title="Transformer la description en style gastronomique"
            >
              <Wand2 className="w-3 h-3" />
              <span>Améliorer avec l&apos;IA</span>
            </button>
          }
        >
          <textarea
            aria-label="Description du plat"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ingrédients, recette et détails..."
            rows={2}
            className={`${FORM_INPUT_CLASS} resize-none`}
          />
        </FormField>

        <FormField label="Allergènes & Spécificités (Tags)">
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {AVAILABLE_MENU_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      isSelected ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                    );
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? "bg-[#B55234] text-white border-[#B55234] shadow-2xs scale-102"
                      : "bg-[#FAF7F2] text-[#554F47] border-[#E8E2D7] hover:border-[#D4CFC6] hover:bg-white"
                  }`}
                >
                  <span className="text-xs">{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Photo du plat">
          <div className="flex flex-col gap-2">
            <input
              type="url"
              aria-label="URL de la photo du plat"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... ou téléversez un fichier ci-dessous"
              className={FORM_INPUT_CLASS}
            />
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[#D4CFC6] hover:border-[#B55234] rounded-xl text-xs font-medium text-[#7D7568] hover:text-[#B55234] bg-[#FAF7F2] transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadingImage
                    ? "Téléversement en cours..."
                    : selectedFile
                    ? selectedFile.name
                    : "Téléverser photo locale"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Téléverser photo locale"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-red-500 hover:underline px-1"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </FormField>

        {/* 3D & AR Model Generator Box */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#FAF7F2] to-[#F5ECE1] border border-[#E8DECF]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <Box className="w-4 h-4 text-[#B55234]" />
              Modèle 3D & Réalité Augmentée
            </span>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                <WifiOff className="w-2.5 h-2.5" /> Hors Ligne
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate3D}
            disabled={generating3D || !isOnline || (!imageUrl.trim() && !selectedFile)}
            className="w-full py-2 px-3 rounded-lg bg-[#1A1A1A] hover:bg-[#333333] disabled:bg-[#D4CFC6] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {generating3D ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Génération 3D par IA en cours...</span>
              </>
            ) : !isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span>IA Cloud Indisponible Hors-Ligne</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Générer en 3D / AR avec IA</span>
              </>
            )}
          </button>

          {generationError && (
            <p className="text-[11px] text-red-600 mt-2">{generationError}</p>
          )}

          {/* Bibliothèque 3D Locale (Disponible 100% Hors-Ligne) */}
          <div className="mt-3 pt-2.5 border-t border-[#E8DECF]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#736D65] flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-[#B55234]" />
                Modèles 3D Locaux (100% Hors-Ligne)
              </span>
              <span className="text-[10px] text-[#A39C91]">Sélection rapide</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {LOCAL_3D_PRESETS.map((preset) => {
                const isSelected = model3dUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setModel3dUrl(preset.url)}
                    className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm font-bold"
                        : "bg-white hover:bg-[#F5ECE1] text-[#1A1A1A] border-[#E8DECF]"
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span className="truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taille Officielle 1:1 en Réalité Augmentée (en cm) */}
          <div className="mt-3 pt-2.5 border-t border-[#E8DECF]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#736D65] flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-[#B55234]" />
                Taille Officielle sur Table (Échelle 1:1 AR)
              </span>
              <span className="text-[11px] font-extrabold text-[#B55234]">
                📏 {sizeCm} cm
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {OFFICIAL_SIZE_PRESETS.map((preset) => {
                const isSelected = sizeCm === preset.sizeCm;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSizeCm(preset.sizeCm);
                      setHasCustomSize(true);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-medium border flex items-center justify-between gap-1 transition-all ${
                      isSelected
                        ? "bg-[#B55234] text-white border-[#B55234] shadow-sm font-bold"
                        : "bg-white hover:bg-[#F5ECE1] text-[#1A1A1A] border-[#E8DECF]"
                    }`}
                  >
                    <span className="truncate">
                      {preset.icon} {preset.label}
                    </span>
                    <span className="text-[10px] opacity-85 shrink-0">{preset.sizeCm}cm</span>
                  </button>
                );
              })}
            </div>
          </div>

          {model3dUrl && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Modèle 3D Actif
                </span>
                <button
                  type="button"
                  onClick={() => setModel3dUrl("")}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Supprimer
                </button>
              </div>
              <input
                type="text"
                aria-label="URL du modèle 3D (.glb)"
                value={model3dUrl}
                onChange={(e) => setModel3dUrl(e.target.value)}
                placeholder="/models/... ou URL .glb"
                className="w-full text-[11px] bg-white border border-emerald-200 rounded px-2 py-1 text-emerald-950 font-mono"
              />
            </div>
          )}
        </div>

        <FormField label="Prix" required>
          <div className="relative">
            <input
              type="number"
              aria-label="Prix du plat"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`${FORM_INPUT_CLASS} pr-14`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A39C91]">
              {currency}
            </span>
          </div>
        </FormField>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#A39C91]" />
            <span className="text-sm font-medium text-[#1A1A1A]">Disponible</span>
          </div>
          <ToggleSwitch label="Disponible" checked={isAvailable} onChange={setIsAvailable} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#1A1A1A]">En vedette (Featured)</span>
          <ToggleSwitch label="En vedette (Featured)" checked={isFeatured} onChange={setIsFeatured} />
        </div>
        </div>
          </div>

          {/* Sticky footer actions */}
          <div className="p-4 sm:p-5 border-t border-[#E8E2D7] bg-[#FAF7F2] flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white border border-[#E8E2D7] hover:bg-[#F5F0E8] text-[#1A1A1A] text-sm font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploadingImage || !name.trim() || !categoryId || !price}
              className="flex-1 py-2.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] disabled:bg-[#D4CFC6] disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shadow-sm"
            >
              {saving || uploadingImage ? "Enregistrement…" : editingItem ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
