/**
 * ============================================================================
 * MODULE : TAGS DIÉTÉTIQUES, TAILLE OFFICIELLE (CM) & MÉTADONNÉES
 * ============================================================================
 * Fichier : lib/menu/tags.ts
 *
 * RÔLE CLÉ DANS LE PROJET :
 * 1. Gère les tags alimentaires (Halal, Végétarien, Sans gluten, Épicé, etc.)
 * 2. Gère la Taille Officielle réelle de chaque plat en centimètres (sizeCm)
 *    pour garantir un rendu 3D et Réalité Augmentée à l'échelle 1:1 sur table :
 *    - Pizza : 30 cm
 *    - Assiette / Plat / Salade : 24 cm
 *    - Mqloub / Sandwich / Tacos / Baguette : 22 cm
 *    - Burger : 12 cm
 *    - Dessert / Pâtisserie : 10 cm
 *    - Boisson / Verre / Canette : 8 cm
 * ============================================================================
 */

export interface MenuTag {
  id: string;
  label: string;
  icon: string;
  colorClass: string;
}

// Liste officielle des badges diététiques et allergènes supportés par Restivo
export const AVAILABLE_MENU_TAGS: MenuTag[] = [
  { id: "vegan", label: "Végétarien", icon: "🌱", colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "spicy", label: "Épicé", icon: "🌶️", colorClass: "bg-red-50 text-red-700 border-red-200" },
  { id: "gluten_free", label: "Sans gluten", icon: "🌾", colorClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "halal", label: "Halal", icon: "🥩", colorClass: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "seafood", label: "Poisson & Mer", icon: "🐟", colorClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "nuts", label: "Fruits à coque", icon: "🥜", colorClass: "bg-orange-50 text-orange-700 border-orange-200" },
];

// Préréglages des tailles officielles en centimètres (Échelle 1:1 en AR)
export const OFFICIAL_SIZE_PRESETS = [
  { id: "drink", label: "Boisson (8 cm)", sizeCm: 8, icon: "🥤" },
  { id: "dessert", label: "Dessert (10 cm)", sizeCm: 10, icon: "🍰" },
  { id: "burger", label: "Burger (12 cm)", sizeCm: 12, icon: "🍔" },
  { id: "sandwich", label: "M9loub / Sandwich (22 cm)", sizeCm: 22, icon: "🥙" },
  { id: "plate", label: "Assiette / Plat (24 cm)", sizeCm: 24, icon: "🍽️" },
  { id: "pizza", label: "Pizza Standard (30 cm)", sizeCm: 30, icon: "🍕" },
];

// Expressions régulières pour détecter et extraire les métadonnées sérialisées
const TAGS_REGEX = /<!--\s*TAGS:\s*(\[[^\]]*\])\s*-->/i;
const META_REGEX = /<!--\s*META:\s*(\{[^}]*\})\s*-->/i;
const ALL_HTML_COMMENTS_REGEX = /<!--[\s\S]*?-->/g;

/**
 * Déduit automatiquement la taille réelle officielle (en cm) d'un plat
 * selon son nom ou sa catégorie culinaire.
 */
export function inferOfficialSizeCm(
  itemName?: string | null,
  categoryName?: string | null
): number {
  const combined = `${itemName ?? ""} ${categoryName ?? ""}`.toLowerCase();

  // 1. Burgers (12 cm de diamètre réel)
  if (
    combined.includes("burger") ||
    combined.includes("burgeur") ||
    combined.includes("smash") ||
    combined.includes("cheeseburger") ||
    combined.includes("hamburger")
  ) {
    return 12;
  }

  // 2. Pizzas (30 cm de diamètre standard)
  if (
    combined.includes("pizza") ||
    combined.includes("calzone") ||
    combined.includes("margherita") ||
    combined.includes("4 saison") ||
    combined.includes("pepperoni")
  ) {
    return 30;
  }

  // 3. Mqloub, Sandwichs, Tacos, Mlawi, Baguettes (22 cm)
  if (
    combined.includes("m9loub") ||
    combined.includes("mqloub") ||
    combined.includes("makloub") ||
    combined.includes("ma9loub") ||
    combined.includes("mlawi") ||
    combined.includes("tacos") ||
    combined.includes("sandwich") ||
    combined.includes("panini") ||
    combined.includes("baguette") ||
    combined.includes("shawarma") ||
    combined.includes("kebab") ||
    combined.includes("wrap") ||
    combined.includes("cornet")
  ) {
    return 22;
  }

  // 4. Boissons, Canettes, Jus, Cafés (8 cm)
  if (
    combined.includes("boisson") ||
    combined.includes("drink") ||
    combined.includes("soda") ||
    combined.includes("coca") ||
    combined.includes("fanta") ||
    combined.includes("sprite") ||
    combined.includes("jus") ||
    combined.includes("juice") ||
    combined.includes("citronnade") ||
    combined.includes("mojito") ||
    combined.includes("café") ||
    combined.includes("coffee") ||
    combined.includes("thé") ||
    combined.includes("eau")
  ) {
    return 8;
  }

  // 5. Desserts, Pâtisseries, Glaces (10 cm)
  if (
    combined.includes("dessert") ||
    combined.includes("gâteau") ||
    combined.includes("gateau") ||
    combined.includes("tiramisu") ||
    combined.includes("fondant") ||
    combined.includes("cheesecake") ||
    combined.includes("glace") ||
    combined.includes("crêpe") ||
    combined.includes("crepe") ||
    combined.includes("gaufre")
  ) {
    return 10;
  }

  // 6. Assiettes, Salades, Couscous, Pâtes, Grillades (24 cm)
  return 24;
}

/**
 * Calcule le facteur d'échelle AR (scale) 1:1 sur la table à partir de la taille en cm.
 * Calibré pour une distance naturelle smartphone-table (~40 cm) :
 * - Burger 12 cm -> scale ≈ 0.50
 * - M9loub / Sandwich 22 cm -> scale ≈ 0.73
 * - Assiette 24 cm -> scale ≈ 0.78
 * - Pizza 30 cm -> scale ≈ 0.92
 */
export function sizeCmToARScale(sizeCm: number): number {
  const clampedCm = Math.min(42, Math.max(6, sizeCm));
  const rawScale = 0.22 + clampedCm * 0.0235;
  return Number(Math.min(1.15, Math.max(0.35, rawScale)).toFixed(2));
}

/**
 * ENCODEUR : Fusionne le texte saisi par le restaurateur avec les tags et la taille officielle (en cm).
 */
export function formatDescriptionWithTags(
  description: string,
  tags: string[],
  sizeCm?: number
): string {
  const clean = description.replace(ALL_HTML_COMMENTS_REGEX, "").trim();
  const hasTags = tags && tags.length > 0;
  const hasValidSize = typeof sizeCm === "number" && sizeCm > 0;

  if (!hasTags && !hasValidSize) return clean;

  const metaPayload: { tags: string[]; sizeCm?: number } = {
    tags: hasTags ? tags : [],
  };
  if (hasValidSize) {
    metaPayload.sizeCm = Math.round(sizeCm);
  }

  const metaComment = `<!-- META:${JSON.stringify(metaPayload)} -->`;
  return clean ? `${clean}\n${metaComment}` : metaComment;
}

/**
 * DÉCODEUR : Sépare la description textuelle, la liste des tags et la taille officielle (sizeCm).
 * Garantit que les commentaires HTML ne fuitent JAMAIS dans l'interface utilisateur.
 */
export function parseDescriptionTags(
  rawDescription: string | null | undefined,
  itemName?: string | null,
  categoryName?: string | null
): {
  text: string;
  tags: string[];
  sizeCm: number;
} {
  const defaultSizeCm = inferOfficialSizeCm(itemName, categoryName);

  if (!rawDescription) {
    return { text: "", tags: [], sizeCm: defaultSizeCm };
  }

  let tags: string[] = [];
  let explicitSizeCm: number | null = null;

  // Étape 1 : Recherche du format complet <!-- META:{ "tags": [...], "sizeCm": 12 } -->
  const metaMatch = rawDescription.match(META_REGEX);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed && Array.isArray(parsed.tags)) {
        tags = parsed.tags;
      }
      if (parsed && typeof parsed.sizeCm === "number" && parsed.sizeCm > 0) {
        explicitSizeCm = parsed.sizeCm;
      }
    } catch {}
  }

  // Étape 2 : Recherche du format <!-- TAGS:[...] --> si META n'avait pas de tags
  const tagsMatch = rawDescription.match(TAGS_REGEX);
  if (tagsMatch && tags.length === 0) {
    try {
      const parsed = JSON.parse(tagsMatch[1]);
      if (Array.isArray(parsed)) {
        tags = parsed;
      }
    } catch {}
  }

  // IMPORTANT : Si la taille enregistrée était l'ancienne valeur générique 28cm sur un Burger ou Mqloub,
  // on privilégie la taille officielle réelle du plat (ex: 12cm pour un Burger, 22cm pour un M9loub).
  let finalSizeCm = explicitSizeCm ?? defaultSizeCm;
  if (explicitSizeCm === 28 && defaultSizeCm !== 24) {
    finalSizeCm = defaultSizeCm;
  }

  // Étape 3 : Nettoyage total du texte pour retirer les balises techniques
  const text = rawDescription.replace(ALL_HTML_COMMENTS_REGEX, "").trim();

  return { text, tags, sizeCm: finalSizeCm };
}

/**
 * Trouve la définition complète d'un tag (icône, couleur, libellé) par son identifiant
 */
export function getTagById(id: string): MenuTag | undefined {
  return AVAILABLE_MENU_TAGS.find((tag) => tag.id === id);
}
