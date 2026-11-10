import {
  DailyCashClosure,
  ExpenseRecord,
  RealAnalyticsApiResponse,
  StockItem,
  StockMovement,
} from "./types";

export interface CachedAnalyticsState {
  timestamp: number;
  realData: RealAnalyticsApiResponse | null;
  stockItems: StockItem[];
  movements: StockMovement[];
  expenses: ExpenseRecord[];
  cashClosures: DailyCashClosure[];
}

export interface OfflineAction {
  id: string;
  type: "add_stock" | "restock" | "loss" | "add_expense" | "cash_close" | "apply_ml";
  payload: any;
  timestamp: number;
}

const STORAGE_PREFIX = "restivo_analytics_cache_";
const QUEUE_PREFIX = "restivo_offline_queue_";

/**
 * Saves current analytics state to browser localStorage for offline access.
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
    localStorage.setItem(`${STORAGE_PREFIX}${restaurantId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("Could not save analytics cache to localStorage:", err);
  }
}

/**
 * Loads cached analytics state from localStorage if offline or network fails.
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
 * Queues an action performed while offline to be synced when internet returns.
 */
export function queueOfflineAction(restaurantId: string, action: Omit<OfflineAction, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const queue = getOfflineQueue(restaurantId);
    const newEntry: OfflineAction = {
      ...action,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    queue.push(newEntry);
    localStorage.setItem(`${QUEUE_PREFIX}${restaurantId}`, JSON.stringify(queue));
  } catch (err) {
    console.warn("Could not queue offline action:", err);
  }
}

/**
 * Retrieves the pending offline queue for a restaurant.
 */
export function getOfflineQueue(restaurantId: string): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${QUEUE_PREFIX}${restaurantId}`);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineAction[];
  } catch {
    return [];
  }
}

/**
 * Clears the offline action queue after synchronization.
 */
export function clearOfflineQueue(restaurantId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${QUEUE_PREFIX}${restaurantId}`);
  } catch {}
}
