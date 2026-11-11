/**
 * ============================================================================
 * MODULE : GESTIONNAIRE DU MODE HORS-LIGNE & CACHE 3D (PWA / Offline Manager)
 * ============================================================================
 * Fichier : lib/offline/offline-manager.ts
 *
 * RÔLE CLÉ :
 * Assure la résilience complète du projet Restivo lorsque la connexion Internet
 * est coupée (Mode Hors-Ligne, coupure réseau, Mode Avion) :
 * 1. Détection temps réel de l'état réseau (en ligne / hors-ligne).
 * 2. Mise en cache persistante du Menu complet (catégories, plats, prix, tags)
 *    dans localStorage et IndexedDB.
 * 3. Pré-chargement et mise en cache des fichiers 3D (.glb) via CacheStorage
 *    dès l'ouverture du menu pour qu'ils soient disponibles instantanément
 *    sans connexion dans la modal 3D et dans la caméra AR.
 * 4. Bibliothèque de modèles 3D locaux (fallback offline) pour le gérant.
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import type { PublicMenu } from "@/lib/menu/types";

// Nom du cache dédié aux modèles 3D (.glb) et assets hors-ligne
export const CACHE_NAME_3D = "restivo-3d-cache-v1";
export const CACHE_NAME_ASSETS = "restivo-offline-assets-v1";
const MENU_CACHE_PREFIX = "restivo_menu_cache_";
const MENU_CACHE_TIME_PREFIX = "restivo_menu_cache_time_";

/**
 * Modèles 3D locaux pré-embarqués dans l'application (/public/models)
 * Disponibles 100% hors-ligne pour le restaurateur.
 */
export const LOCAL_3D_PRESETS = [
  { id: "pizza", name: "Pizza Classique", icon: "🍕", url: "/models/pizza.glb" },
  { id: "burger", name: "Burger Gourmet", icon: "🍔", url: "/models/burger.glb" },
  { id: "salad", name: "Salade Fraîche", icon: "🥗", url: "/models/salad.glb" },
  { id: "drink", name: "Boisson Fraîche", icon: "🥤", url: "/models/drink.glb" },
  { id: "fries", name: "Frites Dorées", icon: "🍟", url: "/models/fries.glb" },
  { id: "dish", name: "Plat du Chef", icon: "🍽️", url: "/models/sample-dish.glb" },
];

/**
 * Hook React pour surveiller l'état de connexion en temps réel
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Réinitialise le flag "wasOffline" après 5 secondes
      setTimeout(() => setWasOffline(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initialisation
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

/**
 * Sauvegarde le menu complet dans le cache local et pré-cache tous les modèles 3D
 */
export function saveMenuToLocalCache(restaurantId: string, menu: PublicMenu | null): void {
  if (typeof window === "undefined" || !restaurantId || !menu) return;

  try {
    const key = `${MENU_CACHE_PREFIX}${restaurantId}`;
    const timeKey = `${MENU_CACHE_TIME_PREFIX}${restaurantId}`;

    try {
      localStorage.setItem(key, JSON.stringify(menu));
      localStorage.setItem(timeKey, new Date().toISOString());
    } catch {
      // En cas de QuotaExceededError (souvent causé par de gros Data URIs 3D) :
      // On sauvegarde une version légère sans les gros Data URIs pour ne jamais bloquer le cache
      const lightMenu: PublicMenu = {
        ...menu,
        categories: (menu.categories || []).map((cat) => ({
          ...cat,
          items: (cat.items || []).map((item) => ({
            ...item,
            model3dUrl: item.model3dUrl?.startsWith("data:") ? null : item.model3dUrl,
          })),
        })),
      };
      localStorage.setItem(key, JSON.stringify(lightMenu));
      localStorage.setItem(timeKey, new Date().toISOString());
    }

    // Pré-cacher tous les fichiers 3D (.glb) du menu en arrière-plan
    precacheAllMenu3DModels(menu);
  } catch (err) {
    console.warn("[OfflineManager] Impossible d'écrire dans localStorage:", err);
  }
}

/**
 * Récupère le menu stocké localement
 */
export function getCachedMenu(restaurantId: string): PublicMenu | null {
  if (typeof window === "undefined" || !restaurantId) return null;

  try {
    const key = `${MENU_CACHE_PREFIX}${restaurantId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PublicMenu;
  } catch (err) {
    console.warn("[OfflineManager] Impossible de lire le cache local du menu:", err);
    return null;
  }
}

/**
 * Récupère la date de la dernière sauvegarde locale
 */
export function getCachedMenuTime(restaurantId: string): string | null {
  if (typeof window === "undefined" || !restaurantId) return null;
  return localStorage.getItem(`${MENU_CACHE_TIME_PREFIX}${restaurantId}`);
}

/**
 * Pré-charge tous les fichiers 3D (.glb) d'un menu dans CacheStorage
 */
export async function precacheAllMenu3DModels(menu: PublicMenu): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const cache = await caches.open(CACHE_NAME_3D);
    const urlsToCache: string[] = [];

    // Modèles des plats du menu et images
    const imageUrls: string[] = [];
    for (const cat of menu.categories || []) {
      for (const item of cat.items || []) {
        if (item.model3dUrl && item.model3dUrl.trim() && !item.model3dUrl.startsWith("data:")) {
          urlsToCache.push(item.model3dUrl.trim());
        }
        if (item.imageUrl && item.imageUrl.trim()) {
          imageUrls.push(item.imageUrl.trim());
        }
      }
    }

    // Ajouter aussi les modèles 3D par défaut (presets locaux)
    for (const preset of LOCAL_3D_PRESETS) {
      urlsToCache.push(preset.url);
    }
    // Ajouter le runtime model-viewer
    urlsToCache.push("/vendor/model-viewer.min.js");

    // Supprimer les doublons
    const uniqueUrls = Array.from(new Set(urlsToCache));

    for (const rawUrl of uniqueUrls) {
      try {
        let fullUrl = rawUrl;
        if (fullUrl.startsWith("/")) {
          fullUrl = `${window.location.origin}${fullUrl}`;
        }
        if (fullUrl.includes("@")) {
          fullUrl = fullUrl.replace(/@[^/]+/, "");
        }

        // Vérifier si déjà présent en cache
        const match = await cache.match(fullUrl);
        if (!match && navigator.onLine) {
          const resp = await fetch(fullUrl, { mode: "cors" });
          if (resp.ok) {
            await cache.put(fullUrl, resp);
          }
        }
      } catch (e) {
        // Ignorer les erreurs individuelles de pré-chargement
      }
    }

    // Pré-cacher les images du menu pour affichage instantané hors-ligne
    if (imageUrls.length > 0) {
      try {
        const imgCache = await caches.open(CACHE_NAME_ASSETS);
        for (const rawImg of Array.from(new Set(imageUrls))) {
          let fullImg = rawImg;
          if (fullImg.startsWith("/")) {
            fullImg = `${window.location.origin}${fullImg}`;
          }
          const match = await imgCache.match(fullImg);
          if (!match && navigator.onLine) {
            const resp = await fetch(fullImg, { mode: "cors" });
            if (resp.ok) {
              await imgCache.put(fullImg, resp);
            }
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn("[OfflineManager] Erreur lors du pré-caching 3D:", err);
  }
}

/**
 * Récupère un modèle 3D depuis le cache ou le réseau et génère un blob URL local
 */
export async function getOrCache3DModelBlob(
  modelUrl: string
): Promise<{ blobUrl: string; isFromCache: boolean } | null> {
  if (typeof window === "undefined" || !modelUrl) return null;

  // Si c'est déjà un Data URI Base64 (ex: généré par l'IA en environnement Serverless)
  if (modelUrl.startsWith("data:")) {
    try {
      const parts = modelUrl.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "model/gltf-binary";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return {
        blobUrl: URL.createObjectURL(blob),
        isFromCache: false,
      };
    } catch (e) {
      console.warn("[OfflineManager] Failed to create blob from data URI:", e);
      return {
        blobUrl: modelUrl,
        isFromCache: false,
      };
    }
  }

  let fullUrl = modelUrl;
  if (fullUrl.startsWith("/")) {
    fullUrl = `${window.location.origin}${fullUrl}`;
  }
  if (fullUrl.includes("@")) {
    fullUrl = fullUrl.replace(/@[^/]+/, "");
  }

  // 1. Essayer d'abord dans CacheStorage
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME_3D);
      let match = await cache.match(fullUrl);

      if (match) {
        const blob = await match.blob();
        return {
          blobUrl: URL.createObjectURL(blob),
          isFromCache: true,
        };
      }

      // Si pas encore en cache et qu'on a du réseau, on le télécharge et on le met en cache
      if (navigator.onLine) {
        const resp = await fetch(fullUrl, { mode: "cors" });
        if (resp.ok) {
          await cache.put(fullUrl, resp.clone());
          const blob = await resp.blob();
          return {
            blobUrl: URL.createObjectURL(blob),
            isFromCache: false,
          };
        }
      }
    } catch (err) {
      console.warn("[OfflineManager] Erreur accès CacheStorage pour 3D:", err);
    }
  }

  // 2. Si CacheStorage n'est pas dispo mais qu'on a du réseau, fallback fetch normal
  if (navigator.onLine) {
    try {
      const resp = await fetch(fullUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        return {
          blobUrl: URL.createObjectURL(blob),
          isFromCache: false,
        };
      }
    } catch (err) {
      console.warn("[OfflineManager] Erreur fetch direct 3D:", err);
    }
  }

  return null;
}
