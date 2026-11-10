/**
 * ============================================================================
 * MODULE : MOTEUR D'INTELLIGENCE CULINAIRE RESTIVO (Embedded AI Culinary Engine)
 * ============================================================================
 * Fichier : lib/ai/culinary-engine.ts
 *
 * RÔLE CLÉ :
 * Fournit une assistance intelligente 100% Hors-Ligne (Offline-First) au gérant
 * lorsqu'il ajoute ou modifie un article au menu :
 * 1. Tolérance aux fautes d'orthographe (Fuzzy Matching Levenshtein + Translittération Darja/Français).
 * 2. Détection automatique et infaillible Boisson vs Plat vs Pâtisserie vs Spécialité.
 * 3. Génération de descriptions gastronomiques alléchantes et précises.
 * 4. Détection intelligente des allergènes & labels (Halal, Végétarien, Poisson, Épicé, Gluten, etc.).
 * 5. Estimation réaliste du prix en Dinars Tunisiens (TND).
 * 6. Assignation automatique du modèle 3D (.glb) et de la taille 1:1 en cm pour la Réalité Augmentée.
 * ============================================================================
 */

export interface CulinarySuggestion {
  name: string;
  categoryGuess: string;
  matchedCategoryId?: string;
  description: string;
  tags: string[];
  priceTnd: string;
  sizeCm: number;
  model3dUrl: string;
  explanation: string;
  isLearned?: boolean;
}

// ============================================================================
// SYSTÈME DE MÉMOIRE D'APPRENTISSAGE CONTINU (ADAPTIVE LEARNING)
// ============================================================================
const LEARNED_RECIPES_STORAGE_KEY = "restivo_ai_learned_recipes_";

export interface LearnedDishRecord {
  id?: string;
  name: string;
  normalizedName: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  price: string;
  tags: string[];
  sizeCm: number;
  model3dUrl?: string;
  savedAt: string;
  useCount: number;
}

/**
 * Mémorise un plat enregistré par le restaurateur (Apprentissage continu)
 */
export function learnDishPattern(
  restaurantId: string,
  dish: {
    name: string;
    categoryId: string;
    categoryName?: string;
    description: string;
    price: string | number;
    tags: string[];
    sizeCm: number;
    model3dUrl?: string;
  }
): void {
  if (typeof window === "undefined" || !restaurantId || !dish.name.trim()) return;

  try {
    const key = `${LEARNED_RECIPES_STORAGE_KEY}${restaurantId}`;
    const raw = localStorage.getItem(key);
    const list: LearnedDishRecord[] = raw ? JSON.parse(raw) : [];

    const norm = normalizeCulinaryText(dish.name);
    const existingIndex = list.findIndex(
      (item) => item.normalizedName === norm || levenshteinDistance(item.normalizedName, norm) <= 1
    );

    const priceFormatted = typeof dish.price === "number" ? dish.price.toFixed(3) : dish.price.toString();

    if (existingIndex >= 0) {
      // Met à jour la recette apprise et incrémente le compteur d'utilisation
      list[existingIndex] = {
        ...list[existingIndex],
        name: dish.name.trim(),
        categoryId: dish.categoryId,
        categoryName: dish.categoryName,
        description: dish.description,
        price: priceFormatted,
        tags: dish.tags,
        sizeCm: dish.sizeCm,
        model3dUrl: dish.model3dUrl,
        savedAt: new Date().toISOString(),
        useCount: (list[existingIndex].useCount || 1) + 1,
      };
    } else {
      // Ajoute une nouvelle recette apprise à la mémoire
      list.unshift({
        name: dish.name.trim(),
        normalizedName: norm,
        categoryId: dish.categoryId,
        categoryName: dish.categoryName,
        description: dish.description,
        price: priceFormatted,
        tags: dish.tags,
        sizeCm: dish.sizeCm,
        model3dUrl: dish.model3dUrl,
        savedAt: new Date().toISOString(),
        useCount: 1,
      });
    }

    // Garde jusqu'à 100 recettes mémorisées par restaurant
    const trimmed = list.slice(0, 100);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("[CulinaryEngine] Erreur lors de l'apprentissage:", err);
  }
}

/**
 * Récupère les plats mémorisés pour un restaurant
 */
export function getLearnedDishes(restaurantId: string): LearnedDishRecord[] {
  if (typeof window === "undefined" || !restaurantId) return [];
  try {
    const key = `${LEARNED_RECIPES_STORAGE_KEY}${restaurantId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Recherche si une requête correspond à un plat précédemment appris
 */
export function findLearnedDishMatch(
  rawQuery: string,
  restaurantId: string
): LearnedDishRecord | null {
  if (!restaurantId) return null;
  const learnedList = getLearnedDishes(restaurantId);
  if (learnedList.length === 0) return null;

  const queryNorm = normalizeCulinaryText(rawQuery);
  const queryTokens = queryNorm.split(/\s+/).filter(Boolean);

  // 1. Match exact ou très proche
  for (const item of learnedList) {
    if (item.normalizedName === queryNorm || levenshteinDistance(item.normalizedName, queryNorm) <= 2) {
      return item;
    }
  }

  // 2. Match partiel (ex: recherche "ma9aroun" et le resto a déjà appris "Ma9arouna Allouch")
  for (const item of learnedList) {
    const itemTokens = item.normalizedName.split(/\s+/).filter(Boolean);
    const hasIntersection = queryTokens.some((qt) =>
      itemTokens.some((it) => it === qt || levenshteinDistance(it, qt) <= 1)
    );
    if (hasIntersection) {
      return item;
    }
  }

  return null;
}

// --- 1. Dictionnaires & Vocabulaires Culinaire Sémantique ---

/** Normalise un texte (minuscules, sans accents, caractères spéciaux nettoyés) */
export function normalizeCulinaryText(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distance de Levenshtein pour le Fuzzy Matching (tolérance aux fautes de frappe) */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) row[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      let val: number;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }
  return row[n];
}

/** Vérifie si un token ressemble à un mot cible (tolère 1 à 2 fautes de frappe) */
function isFuzzyMatch(word: string, target: string, maxDist: number = 1): boolean {
  if (word === target) return true;
  if (Math.abs(word.length - target.length) > maxDist) return false;
  return levenshteinDistance(word, target) <= maxDist;
}

// Table de translittération / correction automatique des fautes courantes en Darja et Français
const TYPO_CANONICAL_MAP: Record<string, string> = {
  // Pizzas
  piza: "pizza",
  pizaa: "pizza",
  pizzza: "pizza",
  pitza: "pizza",
  pitsa: "pizza",
  // Burgers
  borgar: "burger",
  borger: "burger",
  burgr: "burger",
  bourger: "burger",
  bergur: "burger",
  // Makloub / Mqloub (Translittération Darja)
  m9loub: "mqloub",
  m9lob: "mqloub",
  makloub: "mqloub",
  maklob: "mqloub",
  mekloub: "mqloub",
  maqloub: "mqloub",
  // Boissons & Sodas
  coka: "coca",
  cokaa: "coca",
  koka: "coca",
  kokacola: "coca",
  cocacola: "coca",
  bogga: "boga",
  fantaa: "fanta",
  sprit: "sprite",
  citronad: "citronnade",
  citronade: "citronnade",
  setronad: "citronnade",
  mojitoo: "mojito",
  mohito: "mojito",
  // Plats Tunisiens
  kaftaji: "kafteji",
  keftaji: "kafteji",
  qafteji: "kafteji",
  chawerma: "chawarma",
  shawarma: "chawarma",
  shwarma: "chawarma",
  takos: "tacos",
  ouja: "ojja",
  "3ojja": "ojja",
  eja: "ojja",
  kouskous: "couscous",
  // Pâtisseries
  krep: "crepe",
  krepe: "crepe",
  gaufre: "gaufre",
  chizkek: "cheesecake",
  teramisu: "tiramisu",
  // Ma9aroun / Pâtes Tunisiennes (Translittération Darja)
  ma9aroun: "maqarouna",
  ma9arouna: "maqarouna",
  ma9rouna: "maqarouna",
  ma9roun: "maqarouna",
  makarouna: "maqarouna",
  makrouna: "maqarouna",
  makroun: "maqarouna",
  makaroun: "maqarouna",
  maqrouna: "maqarouna",
  maqroun: "maqarouna",
  allouch: "allouch",
  "3allouch": "allouch",
  alouch: "allouch",
  mloukhiya: "mloukhia",
  mloukhya: "mloukhia",
  lablebi: "lablebi",
  lablabi: "lablebi",
  tajin: "tajine",
  slata: "salade",
  // Ingrédients
  formage: "fromage",
  chiken: "poulet",
  chicken: "poulet",
  skalop: "escalope",
  escalop: "escalope",
  crevet: "crevettes",
  crevett: "crevettes",
  somon: "saumon",
  ton: "thon",
};

/** Normalise et corrige les fautes de frappe dans un texte */
function correctTypoTokens(raw: string): string[] {
  const tokens = normalizeCulinaryText(raw).split(/\s+/).filter(Boolean);
  return tokens.map((t) => TYPO_CANONICAL_MAP[t] || t);
}

// --- 2. Détection de Famille (Boissons vs Pizzas vs Burgers vs etc.) ---

export type DishFamily =
  | "drink"
  | "pizza"
  | "burger"
  | "mqloub"
  | "tacos_sandwich"
  | "pasta"
  | "tunisian_dish"
  | "salad"
  | "dessert"
  | "generic_dish";

const DRINK_KEYWORDS = [
  "coca", "pepsi", "boga", "fanta", "sprite", "soda", "eau", "safia", "cristaline",
  "jus", "citronnade", "smoothie", "mojito", "cocktail", "mocktail", "cafe", "express",
  "capucin", "the", "menthe", "canette", "bouteille", "redbull", "milkshake", "frappe",
  "boisson", "drink", "ice", "the_glace", "sirop", "pina_colada"
];

const PIZZA_KEYWORDS = [
  "pizza", "calzone", "margherita", "marguerita", "neptune", "fromages", "reine",
  "campione", "pepperoni", "buffala", "napoletana", "vegetarienne", "fruits_de_mer"
];

const BURGER_KEYWORDS = [
  "burger", "cheeseburger", "smash", "angus", "charolais", "crispy", "chicken_burger"
];

const MQLOUB_KEYWORDS = ["mqloub", "makloub"];

const TACOS_SANDWICH_KEYWORDS = [
  "tacos", "sandwich", "baguette", "farcie", "panini", "chawarma", "libanais", "fricasse", "brik"
];

const PASTA_KEYWORDS = [
  "pasta", "pates", "pâtes", "spaghetti", "penne", "tagliatelle", "lasagne", "ravioli",
  "maqarouna", "ma9arouna", "ma9rouna", "makarouna", "makrouna", "ma9aroun", "makroun", "macaroni"
];

const TUNISIAN_KEYWORDS = [
  "kafteji", "ojja", "couscous", "tajine", "chakchouka", "kamounia", "mosli", "riz"
];

const SALAD_KEYWORDS = ["salade", "cesar", "césar", "nicoise", "niçoise", "burrata", "quinoa"];

const DESSERT_KEYWORDS = [
  "dessert", "tiramisu", "fondant", "chocolat", "crepe", "crêpe", "gaufre", "cheesecake",
  "glace", "moelleux", "tarte", "mousse", "panna_cotta"
];

/** Détecte la famille culinaire principale d'après le nom ou les mots-clés */
export function detectDishFamily(rawName: string, categoryName?: string): DishFamily {
  const tokens = correctTypoTokens(`${rawName} ${categoryName || ""}`);

  // 1. Desserts explicites (Tiramisu, Cheesecake, Crêpe, Fondant...)
  for (const token of tokens) {
    if (DESSERT_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "dessert";
    }
  }

  // 2. Pizzas explicites
  for (const token of tokens) {
    if (PIZZA_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "pizza";
    }
  }

  // 3. Burgers explicites
  for (const token of tokens) {
    if (BURGER_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "burger";
    }
  }

  // 4. Mqloub
  for (const token of tokens) {
    if (MQLOUB_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "mqloub";
    }
  }

  // 5. Tacos & Sandwichs
  for (const token of tokens) {
    if (TACOS_SANDWICH_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "tacos_sandwich";
    }
  }

  // 6. Plats Tunisiens (Kafteji, Ojja, Couscous...)
  for (const token of tokens) {
    if (TUNISIAN_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "tunisian_dish";
    }
  }

  // 7. Pâtes
  for (const token of tokens) {
    if (PASTA_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "pasta";
    }
  }

  // 8. Salades
  for (const token of tokens) {
    if (SALAD_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "salad";
    }
  }

  // 9. Boissons & Drinks (Coca, Boga, Eau, Jus, Citronnade, Mojito, Café, Thé...)
  for (const token of tokens) {
    if (DRINK_KEYWORDS.some((k) => token === k || isFuzzyMatch(token, k, 1))) {
      return "drink";
    }
  }

  return "generic_dish";
}

// --- 3. Générateur de Recettes Gastronomiques Alléchantes ---

export function generateCulinaryDescription(rawName: string, family: DishFamily): string {
  const norm = normalizeCulinaryText(rawName);

  switch (family) {
    case "drink": {
      if (norm.includes("coca") || norm.includes("pepsi")) {
        return "Boisson gazeuse rafraîchissante aux extraits végétaux naturels. Servie très fraîche avec rondelle de citron et glaçons.";
      }
      if (norm.includes("boga")) {
        return "La célèbre boisson tunisienne pétillante et désaltérante. Servie très fraîche.";
      }
      if (norm.includes("fanta")) {
        return "Soda pétillant au goût fruité et acidulé d'orange gorgée de soleil. Servi glacé.";
      }
      if (norm.includes("sprite")) {
        return "Boisson gazeuse citron-lime transparente, vive et ultra rafraîchissante.";
      }
      if (norm.includes("citronnad") || norm.includes("citron")) {
        return "Authentique citronnade tunisienne artisanale pressée du jour, menthe fraîche et touche légère d'eau de fleur d'oranger.";
      }
      if (norm.includes("mojito")) {
        return "Cocktail signature préparé à la minute avec feuilles de menthe fraîche pilées, quartiers de lime, sirop pur canne et eau pétillante.";
      }
      if (norm.includes("eau") || norm.includes("safia")) {
        return "Eau minérale naturelle pure et équilibrée, servie tempérée ou bien fraîche au choix.";
      }
      if (norm.includes("cafe") || norm.includes("express")) {
        return "Café expresso aux grains pur arabica torréfiés à l'italienne, crème onctueuse et arômes intenses.";
      }
      if (norm.includes("the") || norm.includes("menthe")) {
        return "Thé rouge traditionnel mijoté à la menthe fraîche parfumée, surmonté de pignons de pin torréfiés.";
      }
      return "Boisson fraîche sélectionnée, servie bien glacée pour accompagner parfaitement votre repas.";
    }

    case "pizza": {
      if (norm.includes("fruit") || norm.includes("mer") || norm.includes("crevet") || norm.includes("calamar")) {
        return "Pâte artisanale croustillante cuite au feu de bois, sauce tomate mijotée maison, mozzarella fondante, crevettes et calamars sautés à l'ail, filet d'huile d'olive extra vierge et origan.";
      }
      if (norm.includes("4 fromage") || norm.includes("fromage")) {
        return "Pâte à pizza fine et aérée, base crème légère, généreuse sélection de 4 fromages affinés : mozzarella fior di latte, gorgonzola fondant, chèvre crémeux et parmesan râpé.";
      }
      if (norm.includes("thon") || norm.includes("neptune")) {
        return "Pâte dorée à l'huile d'olive, coulis de tomates fraîches, mozzarella fondante, émietté de thon de première qualité, oignons doux, câpres et olives noires.";
      }
      if (norm.includes("margherita") || norm.includes("marguerita")) {
        return "La classique italienne par excellence : pâte artisanale levée 48h, sauce tomate cuisinée au basilic frais, mozzarella di bufala fondante et filet d'huile d'olive.";
      }
      if (norm.includes("pepperoni") || norm.includes("viande") || norm.includes("boeuf")) {
        return "Pâte croustillante, sauce tomate corsée, mozzarella filante, fines tranches de pepperoni épicé saisies au four et piments doux.";
      }
      return "Pâte artisanale étalée à la main, sauce tomate mijotée aux herbes de Provence, mozzarella fondante et garniture savoureuse cuite à la perfection.";
    }

    case "burger": {
      if (norm.includes("smash")) {
        return "Pain brioché artisanal toasté au beurre, double steak pur bœuf smashé croustillant sur les bords, double cheddar fondu, pickles maison et sauce secrète Restivo.";
      }
      if (norm.includes("chicken") || norm.includes("poulet") || norm.includes("crispy")) {
        return "Pain bun doré aux graines de sésame, filet de poulet fermier mariné et pané ultra croustillant, cheddar affiné, salade croquante et sauce crémeuse.";
      }
      if (norm.includes("truffe") || norm.includes("champignon")) {
        return "Pain brioché moelleux, steak haché façon bouchère 150g, poêlée de champignons de Paris, sauce mayonnaise truffée artisanale et roquette fraîche.";
      }
      return "Steak haché pur bœuf 150g grillé à la flamme, pain brioché doré minute, cheddar affiné, rondelles de tomate fraîche, oignons caramélisés et sauce burger signature.";
    }

    case "mqloub": {
      if (norm.includes("chawarma") || norm.includes("shawarma")) {
        return "Pâte mqloub artisanale cuite minute sur sole, émincé de viande chawarma marinée aux épices d'Orient, double mozzarella filante, frites maison et salade méchouia.";
      }
      if (norm.includes("escalope") || norm.includes("poulet")) {
        return "Pâte mqloub croustillante faite maison, escalope de poulet marinée et grillée, fromage fondu, frites fraîches, salade croquante et sauce au choix.";
      }
      return "Pâte mqloub artisanale cuite à la commande, garniture généreuse de viande grillée, fromage mozzarella coulant, frites dorées et sauce gourmande.";
    }

    case "tacos_sandwich": {
      if (norm.includes("tacos")) {
        return "Galette de blé toastée, garnie de viandes au choix marinées minute, frites croustillantes et nappée de notre fameuse sauce fromagère maison onctueuse.";
      }
      if (norm.includes("baguette") && norm.includes("farcie")) {
        return "Pâte à pain fraîche cuite au four garnie d'escalope panée, mozzarella fondante, œuf, salade méchouia et frites dorées.";
      }
      return "Pain artisanal toasté à la minute, garniture riche et savoureuse, fromage fondant et légumes frais du jour.";
    }

    case "pasta": {
      if (
        norm.includes("maqaroun") ||
        norm.includes("ma9aroun") ||
        norm.includes("ma9roun") ||
        norm.includes("makroun") ||
        norm.includes("makaroun")
      ) {
        if (norm.includes("allouch") || norm.includes("agneau") || norm.includes("viande")) {
          return "Authentique ma9arouna tunisienne mijotée longuement dans une sauce salsa tomate rouge bien piquante avec morceaux d'agneau fondant, ail doux, harissa arbi et piments verts frits.";
        }
        if (norm.includes("poulet") || norm.includes("escalope") || norm.includes("dinde")) {
          return "Ma9arouna tunisienne cuisinée à la sauce tomate salsa parfumée au laurier, morceaux de poulet mijotés, pois chiches tendres, piments verts et filet d'huile d'olive noble.";
        }
        if (norm.includes("thon") || norm.includes("fruit") || norm.includes("mer")) {
          return "Ma9arouna traditionnelle à la sauce salsa tomate relevée, généreux émietté de thon de première qualité (ou fruits de mer frais), câpres, olives noires et piment doux.";
        }
        return "Savoureuse ma9arouna tunisienne mijotée à petit feu dans une sauce salsa tomate rouge onctueuse, aillée et épicée, servie bien chaude avec son piment frit croustillant.";
      }
      if (norm.includes("fruit") || norm.includes("mer") || norm.includes("crevet")) {
        return "Pâtes italiennes al dente sautées à la poêle avec crevettes royales, calamars tendres, tomates cerises confites, ail doré et persil frais.";
      }
      if (norm.includes("arrabbiata") || norm.includes("epice")) {
        return "Penne al dente enrobées d'une sauce tomate mijotée piquante au piment oiseau, ail doux, basilic frais et copeaux de parmesan.";
      }
      return "Pâtes artisanales préparées al dente, accompagnées d'une sauce maison onctueuse et parsemées de parmesan affiné.";
    }

    case "tunisian_dish": {
      if (norm.includes("kafteji")) {
        return "Authentique kafteji tunisien préparé au couteau : poivrons doux, tomates mûres et pommes de terre dorées, œufs mollets, le tout relevé d'huile d'olive de qualité.";
      }
      if (norm.includes("ojja")) {
        return "Ojja tunisienne traditionnelle mijotée à petit feu dans un coulis de tomates aillées, œufs pochés baveux, piments verts et épices du terroir.";
      }
      if (norm.includes("couscous")) {
        return "Semoule de blé fine et aérienne cuite à la vapeur, mijotée avec ses légumes du soleil tendres et son bouillon safrané aux épices parfumées.";
      }
      return "Spécialité traditionnelle préparée dans le respect des recettes authentiques avec des ingrédients frais du terroir.";
    }

    case "salad": {
      if (norm.includes("cesar") || norm.includes("césar")) {
        return "Mélange de jeunes pousses croquantes, filet de poulet grillé émincé, croûtons dorés au beurre aillé, copeaux de parmesan et sauce César crémeuse.";
      }
      if (norm.includes("burrata")) {
        return "Véritable burrata crémeuse au cœur coulant, assortiment de tomates anciennes colorées, pistou de basilic maison et réduction balsamique.";
      }
      return "Sélection de crudités fraîches et croquantes du marché, assaisonnées d'une vinaigrette légère aux herbes fraîches.";
    }

    case "dessert": {
      if (norm.includes("tiramisu")) {
        return "Le véritable tiramisu italien : biscuits cuillère imbibés d'expresso intense, crème onctueuse au mascarpone vanillé et saupoudrage de cacao amer pur.";
      }
      if (norm.includes("fondant") || norm.includes("chocolat")) {
        return "Gâteau fondant au chocolat noir grand cru, cœur coulant intense, servi tiède pour une explosion de saveurs.";
      }
      if (norm.includes("crepe") || norm.includes("crêpe")) {
        return "Crêpe artisanale dorée minute sur bilig, garnie généreusement de pâte à tartiner chocolat-noisette et éclats de noisettes torréfiées.";
      }
      return "Douceur sucrée préparée par notre chef pâtissier avec des ingrédients fins pour clôturer parfaitement votre dégustation.";
    }

    default:
      return "Préparation signature cuisinée avec passion à partir d'ingrédients frais et soigneusement sélectionnés par notre chef.";
  }
}

// --- 4. Détection des Allergènes & Badges (Tags) ---

export function detectCulinaryTags(rawName: string, family: DishFamily): string[] {
  const norm = normalizeCulinaryText(rawName);
  const tags = new Set<string>();

  // Boissons : Généralement Végétarien, Sans gluten, et Halal
  if (family === "drink") {
    tags.add("vegetarian");
    if (!norm.includes("orge") && !norm.includes("biere")) {
      tags.add("gluten_free");
    }
    tags.add("halal");
    return Array.from(tags);
  }

  // Poisson & Fruits de mer
  if (
    norm.includes("thon") ||
    norm.includes("saumon") ||
    norm.includes("crevet") ||
    norm.includes("calamar") ||
    norm.includes("poisson") ||
    norm.includes("fruit de mer") ||
    norm.includes("fruits de mer") ||
    norm.includes("neptune")
  ) {
    tags.add("fish");
    tags.add("halal");
  }

  // Épicé / Piquant
  if (
    norm.includes("piment") ||
    norm.includes("harissa") ||
    norm.includes("merguez") ||
    norm.includes("arrabbiata") ||
    norm.includes("epice") ||
    norm.includes("piquant") ||
    norm.includes("spicy") ||
    norm.includes("chili") ||
    norm.includes("jalapeno")
  ) {
    tags.add("spicy");
  }

  // Fruits à coque / Noix
  if (
    norm.includes("noix") ||
    norm.includes("amande") ||
    norm.includes("noisette") ||
    norm.includes("pistache") ||
    norm.includes("pignon") ||
    norm.includes("nutella")
  ) {
    tags.add("nuts");
  }

  // Viandes (Halal en Tunisie)
  if (
    norm.includes("boeuf") ||
    norm.includes("poulet") ||
    norm.includes("escalope") ||
    norm.includes("viande") ||
    norm.includes("steak") ||
    norm.includes("chawarma") ||
    norm.includes("merguez") ||
    family === "burger" ||
    family === "mqloub"
  ) {
    tags.add("halal");
  }

  // Végétarien
  if (
    norm.includes("vegetarien") ||
    norm.includes("vegan") ||
    norm.includes("4 fromage") ||
    norm.includes("margherita") ||
    norm.includes("salade") ||
    family === "dessert"
  ) {
    if (!tags.has("fish") && !norm.includes("viande") && !norm.includes("poulet") && !norm.includes("steak")) {
      tags.add("vegetarian");
    }
  }

  // Sans gluten
  if (norm.includes("sans gluten") || norm.includes("gluten free")) {
    tags.add("gluten_free");
  }

  // En l'absence de viande suspecte, halal par défaut en restauration tunisienne
  if (!norm.includes("porc") && !norm.includes("bacon de porc") && !norm.includes("alcool")) {
    tags.add("halal");
  }

  return Array.from(tags);
}

// --- 5. Estimation du Prix en Dinars Tunisiens (TND) ---

export function estimateCulinaryPrice(rawName: string, family: DishFamily): string {
  const norm = normalizeCulinaryText(rawName);

  switch (family) {
    case "drink": {
      if (norm.includes("eau") || norm.includes("safia")) return "2.000";
      if (norm.includes("coca") || norm.includes("boga") || norm.includes("fanta") || norm.includes("sprite")) return "3.000";
      if (norm.includes("redbull") || norm.includes("energy")) return "8.500";
      if (norm.includes("jus") || norm.includes("citronnad") || norm.includes("smoothie")) return "6.000";
      if (norm.includes("mojito") || norm.includes("cocktail")) return "7.500";
      if (norm.includes("cafe") || norm.includes("express")) return "2.500";
      return "3.500";
    }

    case "pizza": {
      if (norm.includes("fruit") || norm.includes("mer") || norm.includes("crevet") || norm.includes("saumon")) return "24.000";
      if (norm.includes("4 fromage") || norm.includes("buffala")) return "20.000";
      if (norm.includes("thon") || norm.includes("neptune") || norm.includes("pepperoni")) return "18.000";
      if (norm.includes("margherita") || norm.includes("marguerita")) return "14.000";
      return "19.000";
    }

    case "burger": {
      if (norm.includes("truffe") || norm.includes("angus") || norm.includes("double")) return "22.500";
      if (norm.includes("smash")) return "18.000";
      if (norm.includes("chicken") || norm.includes("poulet") || norm.includes("crispy")) return "15.000";
      return "16.500";
    }

    case "mqloub": {
      if (norm.includes("chawarma")) return "12.500";
      if (norm.includes("escalope") || norm.includes("poulet")) return "11.500";
      return "12.000";
    }

    case "tacos_sandwich": {
      if (norm.includes("tacos")) return "13.000";
      if (norm.includes("baguette")) return "10.500";
      return "9.500";
    }

    case "pasta": {
      if (norm.includes("allouch") || norm.includes("agneau")) return "19.500";
      if (norm.includes("fruit") || norm.includes("mer") || norm.includes("saumon")) return "24.000";
      if (norm.includes("poulet") || norm.includes("escalope")) return "14.500";
      if (norm.includes("maqaroun") || norm.includes("ma9aroun") || norm.includes("makroun")) return "13.500";
      return "18.000";
    }

    case "tunisian_dish": {
      if (norm.includes("couscous")) return "22.000";
      if (norm.includes("kafteji")) return "12.000";
      if (norm.includes("ojja")) return "16.000";
      return "17.500";
    }

    case "salad": {
      if (norm.includes("burrata") || norm.includes("saumon")) return "19.000";
      return "14.000";
    }

    case "dessert": {
      if (norm.includes("cheesecake") || norm.includes("fondant")) return "11.000";
      if (norm.includes("crepe") || norm.includes("gaufre")) return "9.500";
      return "8.500";
    }

    default:
      return "16.000";
  }
}

// --- 6. Taille Réelle AR 1:1 (cm) & Modèle 3D (.glb) ---

export function getARSettingsForFamily(family: DishFamily): { sizeCm: number; model3dUrl: string } {
  switch (family) {
    case "drink":
      return { sizeCm: 12, model3dUrl: "/models/drink.glb" };
    case "pizza":
      return { sizeCm: 28, model3dUrl: "/models/pizza.glb" };
    case "burger":
      return { sizeCm: 12, model3dUrl: "/models/burger.glb" };
    case "salad":
      return { sizeCm: 22, model3dUrl: "/models/salad.glb" };
    case "mqloub":
    case "tacos_sandwich":
      return { sizeCm: 22, model3dUrl: "/models/sample-dish.glb" };
    case "pasta":
    case "tunisian_dish":
    case "dessert":
    default:
      return { sizeCm: 20, model3dUrl: "/models/sample-dish.glb" };
  }
}

// --- 7. Matching de Catégorie dans le restaurant existant ---

export function findBestMatchingCategory(
  family: DishFamily,
  categories: Array<{ id: string; name: string }>
): { id?: string; name: string } {
  if (!categories || categories.length === 0) {
    return { name: "Plats" };
  }

  const familyCategoryTarget: Record<DishFamily, string[]> = {
    drink: ["boisson", "drink", "rafraichissement", "jus", "soda", "bar"],
    pizza: ["pizza", "pizzeria", "calzone"],
    burger: ["burger", "burgers", "smash", "fast food"],
    mqloub: ["mqloub", "makloub", "sandwich", "specialite", "fast food"],
    tacos_sandwich: ["tacos", "sandwich", "baguette", "snack", "fast food"],
    pasta: ["pate", "pasta", "spaghetti", "italien"],
    tunisian_dish: ["plat", "specialite", "tunisien", "cuisine", "traditionnel"],
    salad: ["salade", "entree", "fresh"],
    dessert: ["dessert", "sucre", "patisserie", "douceur", "crepe"],
    generic_dish: ["plat", "menu", "principal", "autre"],
  };

  const targets = familyCategoryTarget[family] || ["plat"];

  for (const cat of categories) {
    const catNorm = normalizeCulinaryText(cat.name);
    for (const target of targets) {
      if (catNorm.includes(target) || isFuzzyMatch(catNorm, target, 1)) {
        return { id: cat.id, name: cat.name };
      }
    }
  }

  // Fallback : première catégorie existante
  return { id: categories[0]?.id, name: categories[0]?.name || "Général" };
}

// --- 8. Fonctions Publiques pour l'Interface ---

/**
 * Génère toutes les suggestions IA complètes à partir d'un nom ou mot-clé
 * (Intègre l'Apprentissage Continu / Continual Adaptive Learning par restaurant)
 */
export function generateFullDishSuggestion(
  rawInput: string,
  categories: Array<{ id: string; name: string }> = [],
  restaurantId?: string
): CulinarySuggestion {
  // 0. Apprentissage Adaptatif : vérifier si le restaurant a déjà une recette apprise
  if (restaurantId) {
    const learnedMatch = findLearnedDishMatch(rawInput, restaurantId);
    if (learnedMatch) {
      return {
        name: learnedMatch.name,
        categoryGuess: learnedMatch.categoryName || "Recette apprise",
        matchedCategoryId: learnedMatch.categoryId,
        description: learnedMatch.description,
        tags: learnedMatch.tags,
        priceTnd: learnedMatch.price,
        sizeCm: learnedMatch.sizeCm || 20,
        model3dUrl: learnedMatch.model3dUrl || "/models/sample-dish.glb",
        explanation: `✨ Modèle adapté : Recette mémorisée depuis votre restaurant (${learnedMatch.name} à ${learnedMatch.price} TND) !`,
        isLearned: true,
      };
    }
  }

  const correctedTokens = correctTypoTokens(rawInput);
  const cleanName = correctedTokens
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const family = detectDishFamily(rawInput);
  const description = generateCulinaryDescription(rawInput, family);
  const tags = detectCulinaryTags(rawInput, family);
  const priceTnd = estimateCulinaryPrice(rawInput, family);
  const { sizeCm, model3dUrl } = getARSettingsForFamily(family);
  const bestCategory = findBestMatchingCategory(family, categories);

  const familyLabels: Record<DishFamily, string> = {
    drink: "Boisson fraîche / Rafraîchissement",
    pizza: "Pizza artisanale",
    burger: "Burger gourmet",
    mqloub: "Mqloub tunisien artisanal",
    tacos_sandwich: "Sandwich & Tacos",
    pasta: "Pâtes & Ma9arouna",
    tunisian_dish: "Plat traditionnel tunisien",
    salad: "Salade fraîche",
    dessert: "Dessert gourmand",
    generic_dish: "Plat du Chef",
  };

  return {
    name: cleanName || rawInput.trim(),
    categoryGuess: familyLabels[family],
    matchedCategoryId: bestCategory.id,
    description,
    tags,
    priceTnd,
    sizeCm,
    model3dUrl,
    explanation: `Analysé comme ${familyLabels[family]} avec calibrage AR 1:1 (${sizeCm} cm) et modèle 3D adapté.`,
    isLearned: false,
  };
}

/**
 * Améliore une description existante (Magic Polish)
 */
export function polishDescriptionWithAI(currentDesc: string, dishName?: string): string {
  const norm = normalizeCulinaryText(currentDesc);
  if (!norm || norm.length < 3) {
    return generateCulinaryDescription(dishName || "Plat du Chef", detectDishFamily(dishName || ""));
  }

  // Découper les mots ou ingrédients saisis par l'utilisateur
  const ingredients = currentDesc
    .split(/[,;\n+&]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (ingredients.length > 1) {
    return `Délicieuse création artisanale cuisinée minute à base de ${ingredients.slice(0, -1).join(", ")} et ${ingredients[ingredients.length - 1]}, assaisonnée aux herbes fraîches et filet d'huile d'olive noble.`;
  }

  return `${currentDesc.trim()} — Préparé avec soin à la commande avec des ingrédients frais du terroir pour une saveur authentique.`;
}
