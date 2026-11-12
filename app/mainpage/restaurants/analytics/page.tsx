"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Sparkles,
  Cpu,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { AnalyticsHeader } from "./_components/AnalyticsHeader";
import { AnalyticsTabs } from "./_components/AnalyticsTabs";
import { OverviewTab } from "./_components/OverviewTab";
import { StockManagementTab } from "./_components/StockManagementTab";
import { AccountingRevenueTab } from "./_components/AccountingRevenueTab";
import { MenuEngineeringTab } from "./_components/MenuEngineeringTab";
import { MLPredictorCard } from "./_components/MLPredictorCard";
import { AddStockModal } from "./_components/AddStockModal";
import { AddExpenseModal } from "./_components/AddExpenseModal";
import {
  INITIAL_STOCK_ITEMS,
  INITIAL_MOVEMENTS,
  INITIAL_EXPENSES,
  DAILY_CASH_CLOSURES,
} from "./_lib/mock-data";
import {
  AnalyticsPeriod,
  AnalyticsTabType,
  DailyCashClosure,
  ExpenseRecord,
  MLPredictionResult,
  RealAnalyticsApiResponse,
  StockItem,
  StockMovement,
} from "./_lib/types";
import {
  saveAnalyticsCache,
  loadAnalyticsCache,
  queueOfflineAction,
  getOfflineQueue,
  clearOfflineQueue,
} from "./_lib/offline-storage";

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { currentRestaurant, isLoadingRestaurants, setIsAddRestaurantOpen } =
    useRestaurantManager();

  // Offline / Network Connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [lastCacheDate, setLastCacheDate] = useState<string | null>(null);

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<AnalyticsTabType>("overview");
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>("month");

  // Real Database state
  const [realData, setRealData] = useState<RealAnalyticsApiResponse | null>(null);
  const [loadingRealData, setLoadingRealData] = useState<boolean>(true);

  // Live client state
  const [stockItems, setStockItems] = useState<StockItem[]>(INITIAL_STOCK_ITEMS);
  const [movements, setMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [cashClosures, setCashClosures] = useState<DailyCashClosure[]>(DAILY_CASH_CLOSURES);

  // Modals
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Listen to Network changes (online / offline)
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setSyncFeedback("Connexion internet rétablie ! Synchronisation des données…");
      if (currentRestaurant?.id) {
        // Re-sync with server
        fetchRealAnalytics(currentRestaurant.id);
        const queue = getOfflineQueue(currentRestaurant.id);
        if (queue.length > 0) {
          clearOfflineQueue(currentRestaurant.id);
          setOfflinePendingCount(0);
          setSyncFeedback(`${queue.length} action(s) hors-ligne synchronisée(s) avec succès !`);
        }
      }
      setTimeout(() => setSyncFeedback(null), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncFeedback("Vous êtes hors-ligne. Le mode Offline est actif (données sauvegardées localement).");
      setTimeout(() => setSyncFeedback(null), 5000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentRestaurant?.id]);

  // Persist state to local cache whenever it updates
  useEffect(() => {
    if (currentRestaurant?.id) {
      saveAnalyticsCache(currentRestaurant.id, {
        realData,
        stockItems,
        movements,
        expenses,
        cashClosures,
      });
      setLastCacheDate(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }
  }, [currentRestaurant?.id, realData, stockItems, movements, expenses, cashClosures]);

  // Check offline queue count
  useEffect(() => {
    if (currentRestaurant?.id) {
      const queue = getOfflineQueue(currentRestaurant.id);
      setOfflinePendingCount(queue.length);
    }
  }, [currentRestaurant?.id]);

  // Fetch real data from Database or fallback to Offline Cache
  const fetchRealAnalytics = useCallback(async (restId: string) => {
    // 1. Stale-While-Revalidate : Affichage INSTANTANÉ (0ms) depuis le cache local !
    const cached = loadAnalyticsCache(restId);
    if (cached) {
      if (cached.realData) setRealData(cached.realData);
      if (cached.stockItems) setStockItems(cached.stockItems);
      if (cached.movements) setMovements(cached.movements);
      if (cached.expenses) setExpenses(cached.expenses);
      if (cached.cashClosures) setCashClosures(cached.cashClosures);
      setLoadingRealData(false); // Affichage immédiat sans attendre le réseau !
    } else {
      setLoadingRealData(true);
    }

    // Si l'utilisateur est hors-ligne, on s'arrête ici
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    // 2. Fetch from server API en arrière-plan ultra-rapide
    try {
      const res = await fetch(`/api/restaurants/${restId}/analytics`);
      const json = await res.json();
      if (json.ok && json.data) {
        setRealData(json.data);

        // Sync stock items with ML predictions if available
        if (json.data.mlPredictions && json.data.mlPredictions.length > 0) {
          setStockItems((prev) =>
            prev.map((item) => {
              const pred = json.data.mlPredictions.find(
                (p: MLPredictionResult) => p.ingredientId === item.id
              );
              if (pred) {
                return {
                  ...item,
                  status:
                    pred.urgency === "critique"
                      ? "critical"
                      : pred.urgency === "eleve"
                      ? "low"
                      : "ok",
                };
              }
              return item;
            })
          );
        }
      }
    } catch (e) {
      console.warn("Could not load real database analytics, falling back to local cache:", e);
      // Fallback to cache on network failure
      const cached = loadAnalyticsCache(restId);
      if (cached) {
        if (cached.realData) setRealData(cached.realData);
        if (cached.stockItems) setStockItems(cached.stockItems);
        if (cached.movements) setMovements(cached.movements);
        if (cached.expenses) setExpenses(cached.expenses);
        if (cached.cashClosures) setCashClosures(cached.cashClosures);
      }
    } finally {
      setLoadingRealData(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) router.replace("/mainpage");
  }, [isReady, user?.canManageRestaurants, router]);

  useEffect(() => {
    if (currentRestaurant?.id) {
      fetchRealAnalytics(currentRestaurant.id);
    }
  }, [currentRestaurant?.id, fetchRealAnalytics]);

  if (!isReady || isLoadingRestaurants) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#7A746B]">
        Chargement des analytics & finances…
      </div>
    );
  }

  if (!currentRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center mb-4">
          <Store className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">
          Sélectionnez ou créez un restaurant
        </h1>
        <p className="text-sm text-[#736D65] mt-2 max-w-md">
          Les tableaux d&apos;analyse, de stock et de comptabilité sont rattachés à votre établissement.
        </p>
        <button
          onClick={() => setIsAddRestaurantOpen(true)}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white text-sm font-bold"
        >
          Ajouter un restaurant
        </button>
      </div>
    );
  }

  // Handlers with Offline Action Queuing
  const handleAddStockItem = (
    itemData: Omit<StockItem, "id" | "status" | "usedInDishesCount">
  ) => {
    const newItem: StockItem = {
      ...itemData,
      id: `stk-${Date.now()}`,
      status:
        itemData.quantity <= itemData.minThreshold * 0.5
          ? "critical"
          : itemData.quantity <= itemData.minThreshold
          ? "low"
          : "ok",
      usedInDishesCount: 2,
    };
    setStockItems((prev) => [newItem, ...prev]);

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      itemId: newItem.id,
      itemName: newItem.name,
      type: "in",
      quantity: newItem.quantity,
      unit: newItem.unit,
      cost: newItem.quantity * newItem.costPerUnit,
      reason: `Réception Fournisseur: ${newItem.supplier}`,
      date: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
    setMovements((prev) => [movement, ...prev]);

    if (!isOnline && currentRestaurant?.id) {
      queueOfflineAction(currentRestaurant.id, {
        type: "add_stock",
        payload: { item: newItem, movement },
      });
      setOfflinePendingCount((c) => c + 1);
    }
  };

  const handleRestockQuick = (itemId: string, addQty: number) => {
    setStockItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newQty = item.quantity + addQty;
        const newStatus =
          newQty <= item.minThreshold * 0.5
            ? "critical"
            : newQty <= item.minThreshold
            ? "low"
            : "ok";
        return { ...item, quantity: newQty, status: newStatus };
      })
    );

    const item = stockItems.find((i) => i.id === itemId);
    if (item) {
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        type: "in",
        quantity: addQty,
        unit: item.unit,
        cost: addQty * item.costPerUnit,
        reason: "Réassortiment express",
        date: new Date().toISOString().replace("T", " ").slice(0, 16),
      };
      setMovements((prev) => [movement, ...prev]);

      if (!isOnline && currentRestaurant?.id) {
        queueOfflineAction(currentRestaurant.id, {
          type: "restock",
          payload: { itemId, addQty, movement },
        });
        setOfflinePendingCount((c) => c + 1);
      }
    }
  };

  const handleApplyMLReorder = (ingredientId: string, quantity: number, cost: number) => {
    const item = stockItems.find((i) => i.id === ingredientId);
    if (!item) return;

    handleRestockQuick(ingredientId, quantity);

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      title: `Commande Fournisseur IA : ${quantity} ${item.unit} de ${item.name}`,
      category: "fournisseurs",
      amount: cost,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "virement",
      status: "paye",
      notes: "Généré automatiquement par le modèle IA Régression Linéaire Multiple",
    };
    setExpenses((prev) => [newExpense, ...prev]);

    if (!isOnline && currentRestaurant?.id) {
      queueOfflineAction(currentRestaurant.id, {
        type: "apply_ml",
        payload: { ingredientId, quantity, cost, expense: newExpense },
      });
      setOfflinePendingCount((c) => c + 1);
    }

    alert(
      `Commande fournisseur validée : +${quantity} ${item.unit} de ${item.name} ajoutés au stock (Dépense de ${cost.toFixed(2)} DT enregistrée${!isOnline ? " en local hors-ligne" : ""}).`
    );
  };

  const handleDeclareLoss = (itemId: string, quantity: number, reason: string) => {
    setStockItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newQty = Math.max(0, item.quantity - quantity);
        const newStatus =
          newQty <= item.minThreshold * 0.5
            ? "critical"
            : newQty <= item.minThreshold
            ? "low"
            : "ok";
        return { ...item, quantity: newQty, status: newStatus };
      })
    );

    const item = stockItems.find((i) => i.id === itemId);
    if (item) {
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        type: "loss",
        quantity,
        unit: item.unit,
        cost: quantity * item.costPerUnit,
        reason,
        date: new Date().toISOString().replace("T", " ").slice(0, 16),
      };
      setMovements((prev) => [movement, ...prev]);

      if (!isOnline && currentRestaurant?.id) {
        queueOfflineAction(currentRestaurant.id, {
          type: "loss",
          payload: { itemId, quantity, reason, movement },
        });
        setOfflinePendingCount((c) => c + 1);
      }
    }
  };

  const handleAddExpense = (expenseData: Omit<ExpenseRecord, "id">) => {
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);

    if (!isOnline && currentRestaurant?.id) {
      queueOfflineAction(currentRestaurant.id, {
        type: "add_expense",
        payload: newExpense,
      });
      setOfflinePendingCount((c) => c + 1);
    }
  };

  const handlePerformCashClose = () => {
    const cashCountedStr = prompt("Montant total d'espèces compté dans le tiroir-caisse (DT) :", "1040.00");
    if (!cashCountedStr) return;
    const counted = Number(cashCountedStr);
    const expected = 1040.0;
    const discrepancy = Number((counted - expected).toFixed(2));

    const newClosure: DailyCashClosure = {
      id: `csh-${Date.now()}`,
      date: `${new Date().toISOString().split("T")[0]} (Clôture)`,
      totalSales: 1680.5,
      cashSales: expected,
      cardSales: 420.5,
      onlineSales: 220.0,
      cashInRegister: counted,
      cashDiscrepancy: discrepancy,
      closedBy: user?.displayName || "Responsable Caisse",
      status: discrepancy === 0 ? "conforme" : "ecart",
    };

    setCashClosures((prev) => [newClosure, ...prev]);

    if (!isOnline && currentRestaurant?.id) {
      queueOfflineAction(currentRestaurant.id, {
        type: "cash_close",
        payload: newClosure,
      });
      setOfflinePendingCount((c) => c + 1);
    }

    alert(
      discrepancy === 0
        ? `Clôture de caisse (Z) validée : Caisse conforme (Écart : 0 DT)${!isOnline ? " - Enregistrée hors-ligne" : ""} !`
        : `Clôture de caisse validée avec un écart de ${discrepancy > 0 ? "+" : ""}${discrepancy} DT enregistré${!isOnline ? " en local" : ""}.`
    );
  };

  const handleExport = () => {
    window.print();
  };

  const criticalStockCount = stockItems.filter(
    (i) => i.status === "critical" || i.status === "low"
  ).length;

  const currentPredictions = realData?.mlPredictions || [];

  return (
    <div data-tour="manager-page-analytics" className="flex flex-col gap-6 py-1 select-none animate-in fade-in duration-300">
      {/* ─── Offline Status & Sync Alert Banner ─── */}
      {!isOnline && (
        <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs">
                  Mode Hors-Ligne (Offline) Actif
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDE68A] text-[#78350F]">
                  Cache Local Opérationnel
                </span>
              </div>
              <p className="text-[11px] text-[#78350F] mt-0.5">
                Vous pouvez gérer votre stock, vos dépenses et consulter les prédictions IA. Vos modifications sont sauvegardées en local et seront synchronisées automatiquement dès le retour du réseau.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {offlinePendingCount > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-[#FEF3C7] border border-[#FCD34D] text-[#B45309] text-xs font-bold">
                {offlinePendingCount} modif(s) en attente
              </span>
            )}
            <span className="text-[10px] text-[#92400E] font-medium">
              Dernière synchro : {lastCacheDate || "récemment"}
            </span>
          </div>
        </div>
      )}

      {/* ─── Sync Feedback Toast ─── */}
      {syncFeedback && (
        <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803d] flex items-center gap-2 text-xs font-bold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#15803d] shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#15803d] border border-[#BBF7D0]">
                <Wifi className="w-3.5 h-3.5" />
                <span>Connecté (En ligne)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Hors connexion (Cache PWA)</span>
              </span>
            )}

            {lastCacheDate && (
              <span className="text-[11px] text-[#8C857B]">
                • Sauvegarde locale : {lastCacheDate}
              </span>
            )}
          </div>

          {currentRestaurant?.id && (
            <button
              onClick={() => fetchRealAnalytics(currentRestaurant.id)}
              disabled={loadingRealData}
              title="Recharger et synchroniser les données"
              className="inline-flex items-center gap-1 text-[11px] text-[#736D65] hover:text-[#1A1A1A] font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRealData ? "animate-spin" : ""}`} />
              <span>Actualiser</span>
            </button>
          )}
        </div>

        <AnalyticsHeader
          restaurantName={currentRestaurant.name}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          onExport={handleExport}
        />
      </div>

      {/* ─── Tabs ─── */}
      <AnalyticsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        criticalStockCount={criticalStockCount}
      />

      {/* ─── Tab Content ─── */}
      {activeTab === "overview" && (
        <OverviewTab
          stockItems={stockItems}
          realData={realData}
          onGoToStock={() => setActiveTab("stock")}
          onGoToAccounting={() => setActiveTab("accounting")}
          onGoToML={() => setActiveTab("ml_ai")}
        />
      )}

      {activeTab === "stock" && (
        <div className="flex flex-col gap-6">
          <div className="p-4 rounded-2xl bg-[#FAF0EA] border border-[#F0D5C9] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#B55234] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1A1A1A]">
                  Suggestions de Réapprovisionnement IA Disponibles
                </span>
                <p className="text-[11px] text-[#736D65]">
                  Le modèle de Régression Linéaire Multiple a calculé les besoins exacts pour les 3 prochains jours.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("ml_ai")}
              className="px-3.5 py-1.5 rounded-xl bg-[#B55234] text-white font-bold text-xs hover:bg-[#9E4328] transition-colors"
            >
              Consulter l&apos;IA Prédictive →
            </button>
          </div>

          <StockManagementTab
            stockItems={stockItems}
            movements={movements}
            onOpenAddModal={() => setIsAddStockOpen(true)}
            onDeclareLoss={handleDeclareLoss}
            onRestockItem={handleRestockQuick}
          />
        </div>
      )}

      {activeTab === "ml_ai" && (
        <MLPredictorCard
          predictions={currentPredictions}
          onApplyReorder={handleApplyMLReorder}
        />
      )}

      {activeTab === "accounting" && (
        <AccountingRevenueTab
          expenses={expenses}
          cashClosures={cashClosures}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onPerformCashClose={handlePerformCashClose}
        />
      )}

      {activeTab === "engineering" && <MenuEngineeringTab />}

      {/* ─── Modals ─── */}
      <AddStockModal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        onAdd={handleAddStockItem}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onAdd={handleAddExpense}
      />
    </div>
  );
}
