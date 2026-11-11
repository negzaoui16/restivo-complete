/**
 * ============================================================================
 * MODULE : SYSTÈME DE SECOURS INTELLIGENT (Contextual 3D Fallback Engine)
 * ============================================================================
 * Fichier : app/api/generate-3d/fallback.ts
 *
 * RÔLE CLÉ DANS LE PROJET :
 * En environnement de production, les modèles d'IA générative (comme Trellis
 * sur Hugging Face) peuvent subir des files d'attente importantes (Queueing),
 * des dépassements de quota (Rate Limits) ou des pannes temporaires de GPU.
 *
 * Pour garantir une DISPONIBILITÉ DE 100% (High Availability) pour l'utilisateur :
 * 1. Si Trellis échoue ou met trop de temps, ce module s'active immédiatement.
 * 2. Il analyse le nom et la catégorie du plat (ex: "Pizza", "Burger", etc.).
 * 3. Il copie un modèle 3D .GLB haute fidélité déjà optimisé vers la destination.
 * 4. L'utilisateur reçoit toujours un résultat 3D valide sans blocage !
 * ============================================================================
 */

import { promises as fs } from "fs";
import path from "path";

export interface FallbackOptions {
  name: string;
  category: string;
  modelsDir?: string;
  destinationPath?: string;
}

export interface FallbackResult {
  modelFile: string;
  publicUrl: string;
}

/**
 * Sélectionne et applique un modèle 3D de secours contextuel
 * Sans écriture obligatoire sur disque pour supporter les environnements
 * Serverless / Vercel (read-only filesystem).
 */
export async function applyFallbackModel({
  name,
  category,
  modelsDir,
  destinationPath,
}: FallbackOptions): Promise<FallbackResult> {
  const text = `${name || ""} ${category || ""}`.toLowerCase();

  let chosenModel = "sample-dish.glb";

  // 1. Boissons / Drinks
  const isDrink = [
    "boisson", "drink", "jus", "juice", "soda", "cola", "coca", "pepsi", "fanta", "sprite",
    "eau", "water", "cafe", "café", "coffee", "espresso", "latte", "cappuccino",
    "the", "thé", "tea", "cocktail", "mojito", "smoothie", "canette", "bouteille",
    "beer", "biere", "bière", "vin", "wine", "milkshake", "citronnade", "ice"
  ].some((kw) => text.includes(kw));

  // 2. Burgers, Sandwiches & Fast-food
  const isBurger = [
    "burger", "sandwich", "cheeseburger", "tacos", "taco", "panini", "wrap",
    "bagel", "hotdog", "croque", "kebab", "shawarma", "chawarma", "mlawi", "makloub",
    "chapati", "baguette"
  ].some((kw) => text.includes(kw));

  // 3. Salades & Healthy Bowls
  const isSalad = [
    "salade", "salad", "bowl", "poke", "caesar", "cesar", "legume", "légume",
    "crudite", "crudité", "veggie", "vegan", "verte", "salata", "mechouia"
  ].some((kw) => text.includes(kw));

  // 4. Pizzas
  const isPepperoni = [
    "pepperoni", "peperoni", "chorizo", "salami", "spicy"
  ].some((kw) => text.includes(kw));

  const isPizza = [
    "pizza", "calzone", "margherita", "margarita", "reine", "saison",
    "fromage", "cheese", "4 fromage", "quatre fromage", "napolitaine", "sicilienne"
  ].some((kw) => text.includes(kw));

  if (isDrink) {
    chosenModel = "drink.glb";
  } else if (isBurger) {
    chosenModel = "burger.glb";
  } else if (isSalad) {
    chosenModel = "salad.glb";
  } else if (isPepperoni) {
    chosenModel = "pizza-pepperoni.glb";
  } else if (isPizza) {
    chosenModel = "pizza.glb";
  } else {
    chosenModel = "sample-dish.glb";
  }

  const publicUrl = `/models/${chosenModel}`;
  console.log(`[Fallback] Selected contextual model: ${chosenModel} -> Public URL: ${publicUrl}`);

  // Tentative optionnelle de copie sur disque si l'environnement le permet (ex: dev local)
  if (destinationPath && modelsDir) {
    try {
      const fallbackSource = path.join(modelsDir, chosenModel);
      await fs.copyFile(fallbackSource, destinationPath);
      console.log(`[Fallback] Successfully copied ${chosenModel} to ${destinationPath}`);
    } catch {
      console.log(`[Fallback] Serverless/Read-only environment detected. Direct static serving used: ${publicUrl}`);
    }
  }

  return {
    modelFile: chosenModel,
    publicUrl,
  };
}
