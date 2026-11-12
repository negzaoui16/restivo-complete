/**
 * ============================================================================
 * MODULE : PERSISTANCE ET CACHE HORS-LIGNE DU TABLEAU DE BORD ANALYTIQUE
 * ============================================================================
 * Fichier : app/mainpage/restaurants/analytics/_lib/offline-storage.ts
 *
 * RÔLE CLÉ :
 * Permet au restaurateur de consulter ses statistiques, son inventaire, ses
 * dépenses et son bilan de caisse même en cas de panne de connexion Internet.
 * Sauvegarde l'état complet dans le localStorage du navigateur et synchronise
 * les actions hors-ligne dès le retour du réseau.
 * ============================================================================
 */

import {
  DailyCashClosure,
  ExpenseRecord,
  RealAnalyticsApiResponse,
  StockItem,
  StockMovement,
} from "./types";

// Structure complète du snapshot stocké dans le cache local du navigateur
export interface CachedAnalyticsState {
  timestamp: number; // Horodatage de la dernière sauvegarde en millisecondes
  realData: RealAnalyticsApiResponse | null; // Métriques réelles issues de MongoDB
  stockItems: StockItem[]; // Liste des ingrédients et niveaux de stock
  movements: StockMovement[]; // Historique des entrées / sorties de stock
  expenses: ExpenseRecord[]; // Dépenses opérationnelles enregistrées
  cashClosures: DailyCashClosure[]; // Clôtures journalières de caisse
}

// Action en attente de synchronisation lorsque le restaurateur est hors-ligne
export interface OfflineAction {
  id: string; // Identifiant unique de l'action
  type: "add_stock" | "restock" | "loss" | "add_expense" | "cash_close" | "apply_ml";
  payload: any; // Données associées à l'action
  timestamp: number; // Moment où l'action a été effectuée hors-ligne
}

// Préfixes des clés dans localStorage pour isoler les données par restaurant
const STORAGE_PREFIX = "restivo_analytics_cache_";
const QUEUE_PREFIX = "restivo_offline_queue_";

/**
 * Sauvegarde l'état actuel des analytics dans le localStorage pour l'accès hors-ligne.
 */
export function saveAnalyticsCache(
  restaurantId: string,
  state: {
    realData: RealAnalyticsApiResponse | null;
    stockItems: StockItem[];
    movements: StockMovement[];
    expenses: ExpenseRecord[];
    cashClosures: DailyCashClosure[];
  }
): void {
  // Sécurité côté serveur : localStorage n'existe que dans le navigateur client
  if (typeof window === "undefined") return;
  try {
    const payload: CachedAnalyticsState = {
      timestamp: Date.now(),
      realData: state.realData,
      stockItems: state.stockItems,
      movements: state.movements,
      expenses: state.expenses,
      cashClosures: state.cashClosures,
    };
    // Écriture sérialisée en JSON dans le stockage local
    localStorage.setItem(`${STORAGE_PREFIX}${restaurantId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("Could not save analytics cache to localStorage:", err);
  }
}

/**
 * Récupère l'état sauvegardé dans le localStorage si le réseau est indisponible.
 */
export function loadAnalyticsCache(restaurantId: string): CachedAnalyticsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${restaurantId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAnalyticsState;
  } catch (err) {
    console.warn("Could not parse analytics cache from localStorage:", err);
    return null;
  }
}

/**
 * Enregistre une action effectuée hors-ligne dans la file d'attente pour synchronisation ultérieure.
 */
export function queueOfflineAction(restaurantId: string, action: Omit<OfflineAction, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${QUEUE_PREFIX}${restaurantId}`;
    const raw = localStorage.getItem(key);
    const queue: OfflineAction[] = raw ? JSON.parse(raw) : [];
    
    // Ajout de l'action avec UUID et horodatage
    queue.push({
      ...action,
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    });
    
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (err) {
    console.warn("Could not queue offline action:", err);
  }
}

/**
 * Récupère la file d'attente des actions effectuées hors-ligne pour les synchroniser.
 */
export function getOfflineQueue(restaurantId: string): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${QUEUE_PREFIX}${restaurantId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Vide la file d'attente une fois que les données ont été synchronisées avec le serveur.
 */
export function clearOfflineQueue(restaurantId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${QUEUE_PREFIX}${restaurantId}`);
  } catch {}
}
